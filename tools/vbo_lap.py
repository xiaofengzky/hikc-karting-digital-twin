# -*- coding: utf-8 -*-
"""从 VBO 多圈轨迹中提取单圈 -> 赛道中心线 + 真实高程"""
import numpy as np, math, json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

D = np.load('vbo.npz')
x, z, tt, speed, hgt, dist = D['x'], D['z'], D['tt'], D['speed'], D['hgt'], D['dist']
n = len(x)

# ---- 找圈：以起点为参考，找每次回到起点附近的时刻 ----
p0 = np.array([x[0], z[0]])
d0 = np.hypot(x - p0[0], z - p0[1])
cands = []
for i in range(1, n):
    if d0[i] < 12 and dist[i] > 500:
        if not cands or dist[i] - cands[-1] > 400:
            cands.append(i)
print('经过起点次数', len(cands))
laps = []
for a, b in zip(cands[:-1], cands[1:]):
    laps.append((a, b, dist[b] - dist[a], tt[b] - tt[a]))
for k, l in enumerate(laps[:20]):
    print(f'  圈{k+1}: idx {l[0]}->{l[1]}  {l[2]:.0f} m  {l[3]:.1f} s')
lens = [l[2] for l in laps]
print('圈长中位数 %.1f m' % np.median(lens))

# 选圈长最接近中位数的圈
med = np.median(lens)
best = min(laps, key=lambda l: abs(l[2] - med) + abs(l[3] - np.median([q[3] for q in laps])) * 2)
a, b = best[0], best[1]
print('选用圈', best)

lx = x[a:b] - x[a]
lz = z[a:b] - z[a]
lh = hgt[a:b]
lt = tt[a:b] - tt[a]
ld = np.concatenate([[0], np.cumsum(np.hypot(np.diff(lx), np.diff(lz)))])

# 平滑（GPS 抖动）
def smooth(a_, k=9):
    ker = np.ones(k) / k
    pad = np.concatenate([a_[-k:], a_, a_[:k]])
    return np.convolve(pad, ker, 'same')[k:-k]

sx, sz = smooth(lx, 11), smooth(lz, 11)
sh = smooth(lh, 15)

# 闭合（终点应与起点接近）
print('闭合缺口 %.1f m' % math.hypot(sx[-1], sz[-1]))
# 去掉末端重复部分
cut = None
for i in range(len(sx) - 40, len(sx)):
    if math.hypot(sx[i] - sx[0], sz[i] - sz[0]) < 3.5:
        cut = i + 1
        break
if cut:
    sx, sz, sh, ld = sx[:cut], sz[:cut], sh[:cut], ld[:cut]
print('裁剪后 点数', len(sx), '长', ld[-1])

# 重采样到 2m
s = np.concatenate([[0], np.cumsum(np.hypot(np.diff(sx), np.diff(sz)))])
s -= s[0]
L = s[-1] + math.hypot(sx[0] - sx[-1], sz[0] - sz[-1])
u = np.arange(0, L, 2.0)
rx = np.interp(u, s, sx); rz = np.interp(u, s, sz)
rh = np.interp(u, s, sh)
# 闭合修正：把首尾差按比例分摊
gx = rx[-1] - rx[0]; gz = rz[-1] - rz[0]
t = u / L
rx -= gx * t; rz -= gz * t

# 曲率 + 弯道识别
P = np.stack([rx, rz], 1)
m = len(P)
seg = np.hypot(np.diff(np.vstack([P, P[:1]]), axis=0)[:, 0], np.diff(np.vstack([P, P[:1]]), axis=0)[:, 1])
s_ = np.cumsum(seg) - seg
d1 = np.roll(P, -1, 0) - np.roll(P, 1, 0)
d2 = np.roll(P, -1, 0) - 2 * P + np.roll(P, 1, 0)
num = d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]
den = np.power((d1 ** 2).sum(1), 1.5) + 1e-12
k = num / den
k = np.convolve(np.concatenate([k[-8:], k, k[:8]]), np.ones(9) / 9, 'same')[8:-8]
R = 1 / np.maximum(np.abs(k), 1e-7)

# 峰值（半径局部极小）
peaks = []
for i in range(m):
    aa, bb, cc = (i - 1) % m, i, (i + 1) % m
    if R[i] <= R[aa] and R[i] <= R[cc] and R[i] < 70:
        peaks.append(i)
merged = []
for i in peaks:
    if merged and min((i - merged[-1]) % m, (merged[-1] - i) % m) * 2 < 22:
        if R[i] < R[merged[-1]]:
            merged[-1] = i
    else:
        merged.append(i)
print('识别弯道', len(merged), ' 右', sum(1 for i in merged if k[i] > 0), '左', sum(1 for i in merged if k[i] < 0))
for j, i in enumerate(merged):
    print(f'  T{j+1} {"R" if k[i]>0 else "L"} s={s_[i]:.0f} R={R[i]:.1f}m')

fig, ax = plt.subplots(1, 2, figsize=(16, 7.5), dpi=110)
ax[0].plot(rx, rz, '-', lw=7, color='#232323', solid_capstyle='round')
ax[0].plot(rx[::3], rz[::3], ':', lw=.8, color='#ffc51f')
ax[0].plot(rx[0], rz[0], 'o', ms=9, color='#e10600')
for j, i in enumerate(merged):
    ax[0].annotate(f'T{j+1}{"R" if k[i]>0 else "L"}', (rx[i], rz[i]),
                   xytext=(5, 4), textcoords='offset points', fontsize=8, color='#0a84ff')
ax[0].set_aspect('equal'); ax[0].grid(alpha=.25)
ax[0].set_title(f'real single lap   L={L:.0f} m   corners={len(merged)}')
ax[1].plot(u, rh, lw=1.2, color='#2f8f4e')
ax[1].set_xlabel('s (m)'); ax[1].set_ylabel('height (m)'); ax[1].grid(alpha=.25)
ax[1].set_title(f'elevation  ({rh.min():.1f} ~ {rh.max():.1f} m)')
fig.tight_layout(); fig.savefig('vbo_lap.png')

json.dump(dict(L=L, x=rx.tolist(), z=rz.tolist(), h=rh.tolist(),
               corners=[dict(s=float(s_[i]), r=float(R[i]), side=int(np.sign(k[i]))) for i in merged]),
          open('vbo_lap.json', 'w'))
print('saved vbo_lap.png')

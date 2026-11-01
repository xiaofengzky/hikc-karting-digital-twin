# -*- coding: utf-8 -*-
"""多圈平均 -> 高精度赛道中心线 + 真实高程"""
import numpy as np, math, json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

D = np.load('vbo.npz')
x, z, tt, speed, hgt, dist = D['x'], D['z'], D['tt'], D['speed'], D['hgt'], D['dist']
n = len(x)

# 锚点：选一个稳定经过的位置
REF = 300
d0 = np.hypot(x - x[REF], z - z[REF])
marks = [REF]
for i in range(REF + 200, n):
    if d0[i] < 9.0:
        if not marks or i - marks[-1] > 400:
            marks.append(i)
print('圈分界', marks)
laps = list(zip(marks[:-1], marks[1:]))
print('完整圈数', len(laps))
for k, (a, b) in enumerate(laps):
    print(f'  圈{k+1}: {dist[b]-dist[a]:.0f} m  {tt[b]-tt[a]:.1f} s')

# 每圈重采样到统一点数后平均
N = 640
def lap_curve(a, b):
    lx, lz, lh = x[a:b + 1], z[a:b + 1], hgt[a:b + 1]
    s = np.concatenate([[0], np.cumsum(np.hypot(np.diff(lx), np.diff(lz)))])
    LL = s[-1]
    u = np.linspace(0, LL, N, endpoint=False)
    return np.interp(u, s, lx), np.interp(u, s, lz), np.interp(u, s, lh), LL

CX, CZ, CH, LLs = [], [], [], []
for a, b in laps:
    q = lap_curve(a, b)
    if q[3] < 900:
        continue
    CX.append(q[0]); CZ.append(q[1]); CH.append(q[2]); LLs.append(q[3])
CX = np.array(CX); CZ = np.array(CZ); CH = np.array(CH)
print('参与平均的圈', len(CX), ' 平均圈长 %.1f m' % np.mean(LLs))

mx = CX.mean(0); mz = CZ.mean(0); mh = CH.mean(0)
# 轻微平滑
def sm(v, k=5):
    pad = np.concatenate([v[-k:], v, v[:k]])
    return np.convolve(pad, np.ones(2 * k + 1) / (2 * k + 1), 'same')[k:-k]
mx = sm(mx, 3); mz = sm(mz, 3); mh = sm(mh, 2)

# 由平均点反算真实弧长
seg = np.hypot(np.diff(np.append(mx, mx[0])), np.diff(np.append(mz, mz[0])))
Lp = seg.sum()
print('平均中心线周长 %.1f m' % Lp)

# 等弧长重采样 2m（循环插值）
s = np.cumsum(seg) - seg
s = np.concatenate([s, [Lp]])
px = np.concatenate([mx, [mx[0]]]); pz = np.concatenate([mz, [mz[0]]]); ph = np.concatenate([mh, [mh[0]]])
u = np.arange(0, Lp, 2.0)
rx = np.interp(u, s, px); rz = np.interp(u, s, pz); rh = np.interp(u, s, ph)

# 曲率
P = np.stack([rx, rz], 1)
m = len(P)
d1 = np.roll(P, -1, 0) - np.roll(P, 1, 0)
d2 = np.roll(P, -1, 0) - 2 * P + np.roll(P, 1, 0)
num = d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]
den = np.power((d1 ** 2).sum(1), 1.5) + 1e-12
k = num / den
k = np.convolve(np.concatenate([k[-7:], k, k[:7]]), np.ones(7) / 7, 'same')[7:-7]
R = 1 / np.maximum(np.abs(k), 1e-7)
s_ = np.arange(m) * 2.0

peaks = [i for i in range(m)
         if R[i] <= R[(i - 1) % m] and R[i] <= R[(i + 1) % m] and R[i] < 80]
merged = []
for i in peaks:
    if merged and min((i - merged[-1]) % m, (merged[-1] - i) % m) * 2 < 26:
        if R[i] < R[merged[-1]]:
            merged[-1] = i
    else:
        merged.append(i)
print('弯道 %d  右 %d  左 %d' % (len(merged),
      sum(1 for i in merged if k[i] > 0), sum(1 for i in merged if k[i] < 0)))
for j, i in enumerate(merged):
    print(f'  T{j+1} {"R" if k[i]>0 else "L"}  s={s_[i]:.0f}  R={R[i]:.1f}')

print('包围盒 x[%.0f,%.0f] z[%.0f,%.0f]' % (rx.min(), rx.max(), rz.min(), rz.max()))
print('高程 %.1f ~ %.1f m' % (rh.min(), rh.max()))

fig, axs = plt.subplots(1, 2, figsize=(16, 7.5), dpi=115)
ax = axs[0]
for i in range(len(CX)):
    ax.plot(CX[i], CZ[i], '-', lw=.5, color='#ff9a8a', alpha=.55)
ax.plot(rx, rz, '-', lw=6.5, color='#202124', solid_capstyle='round')
ax.plot(rx[::3], rz[::3], ':', lw=.8, color='#ffc51f')
ax.plot(rx[0], rz[0], 'o', ms=9, color='#e10600', zorder=6)
for j, i in enumerate(merged):
    ax.annotate(f'T{j+1}{"R" if k[i]>0 else "L"}', (rx[i], rz[i]),
                xytext=(6, 4), textcoords='offset points', fontsize=8.5, color='#0a84ff', weight='bold')
ax.set_aspect('equal'); ax.grid(alpha=.25)
ax.set_title(f'HIKC Xiaogan — averaged racing line   L={Lp:.0f} m   {len(merged)} corners')
ax = axs[1]
ax.plot(u, rh, lw=1.4, color='#2f8f4e')
ax.set_xlabel('s (m)'); ax.set_ylabel('height (m)'); ax.grid(alpha=.25)
ax.set_title(f'elevation  {rh.min():.1f} ~ {rh.max():.1f} m')
fig.tight_layout(); fig.savefig('vbo_lap.png')

json.dump(dict(L=Lp, pts=[[float(a), float(b), float(c)] for a, b, c in zip(rx, rz, rh)],
               corners=[dict(s=float(s_[i]), r=float(R[i]), side=int(np.sign(k[i]))) for i in merged]),
          open('vbo_lap.json', 'w'))
print('saved')

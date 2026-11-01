# -*- coding: utf-8 -*-
"""VBO 真实中心线 -> 3D 数据（旋转起点到主直道、识别弯道、生成 JS）"""
import numpy as np, math, json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

d = json.load(open('vbo_lap.json'))
P = np.array(d['pts'])
h = P[:, 2]
x, z = P[:, 0], P[:, 1]
n = len(x)

# 曲率
def curv(x, z, win=3):
    Q = np.stack([x, z], 1)
    d1 = np.roll(Q, -1, 0) - np.roll(Q, 1, 0)
    d2 = np.roll(Q, -1, 0) - 2 * Q + np.roll(Q, 1, 0)
    num = d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]
    den = np.power((d1 ** 2).sum(1), 1.5) + 1e-12
    k = num / den
    return np.convolve(np.concatenate([k[-win:], k, k[:win]]), np.ones(win) / win, 'same')[win:-win]

k = curv(x, z)
ak = np.abs(k)

# ---- 找最长"直道"段，把起点旋到其中点 ----
half = 60     # 120m 窗口
score = np.array([ak[(np.arange(i, i + half) % n)].mean() for i in range(n)])
i0 = int(np.argmin(score))
start = (i0 + half // 2) % n
print('主直道起点索引', start, ' 该段平均曲率半径 %.0f m' % (1 / max(score[i0], 1e-9)))

x = np.roll(x, -start); z = np.roll(z, -start); h = np.roll(h, -start)
L = n * 2.0
k = np.roll(k, -start)

# ---- 弯道识别：曲率峰值 ----
peaks = [i for i in range(n)
         if np.abs(k)[i] >= np.abs(k)[(i - 1) % n] and np.abs(k)[i] >= np.abs(k)[(i + 1) % n]
         and 1 / max(np.abs(k[i]), 1e-9) < 560]
merged = []
for i in peaks:
    if merged and min((i - merged[-1]) % n, (merged[-1] - i) % n) * 2 < 95:
        if abs(k[i]) > abs(k[merged[-1]]):
            merged[-1] = i
    else:
        merged.append(i)
# 合并跨首尾的
if len(merged) > 1 and (merged[0] + n - merged[-1]) * 2 < 22:
    merged.pop(0)
print('弯道 %d  右 %d  左 %d' % (len(merged),
      sum(1 for i in merged if k[i] > 0), sum(1 for i in merged if k[i] < 0)))
for j, i in enumerate(merged):
    print(f'  T{j+1} {"R" if k[i]>0 else "L"} s={i*2:.0f} R={1/max(abs(k[i]),1e-9):.1f}')

print('包围盒 x[%.0f,%.0f] z[%.0f,%.0f]' % (x.min(), x.max(), z.min(), z.max()))

# ---- 宽度：直道 12m，弯心 10m ----
hw = np.full(n, 6.0)
for i in merged:
    for o in range(-16, 17):
        j = (i + o) % n
        f = abs(o) / 16.0
        hw[j] = min(hw[j], 5.0 + f * f * 1.0)
hw = np.clip(hw, 5.0, 6.0)

h = h - h.mean()          # 高程归零
pts = np.stack([x, h, z], 1)

def f1(a): return '[' + ','.join(f'{v:.1f}' for v in a) + ']'
def f2(a): return '[' + ','.join(f'{v:.2f}' for v in a) + ']'

js = ['const TRACK_DATA = {',
      f'  length: {L:.2f},', '  step: 2.0,', '  pts: [']
for i in range(0, len(pts), 6):
    js.append('    ' + ','.join(f'[{p[0]:.1f},{p[1]:.2f},{p[2]:.1f}]' for p in pts[i:i + 6]) + ',')
js.append('  ],')
js.append('  hw: ' + f2(hw) + ',')
js.append('  corners: [' + ','.join(
    f"{{i:{j+1},s:{i*2:.1f},side:{int(np.sign(k[i]))},r:{1/max(abs(k[i]),1e-9):.1f},deg:0}}" for j, i in enumerate(merged)) + '],')
js.append('};')
open('track_data.js', 'w').write('\n'.join(js))

fig, ax = plt.subplots(figsize=(12, 8), dpi=115)
ax.plot(np.append(x, x[0]), np.append(z, z[0]), '-', lw=7, color='#202124', solid_capstyle='round')
ax.plot(x[::3], z[::3], ':', lw=.7, color='#ffc51f')
ax.plot(x[0], z[0], 'o', ms=10, color='#e10600', zorder=6)
ax.annotate('S/F', (x[0], z[0]), xytext=(8, -16), textcoords='offset points',
            color='#e10600', fontsize=11, weight='bold')
for j, i in enumerate(merged):
    ax.plot(x[i], z[i], '.', ms=3, color='#0a84ff')
    ax.annotate(f'T{j+1}{"R" if k[i]>0 else "L"}', (x[i], z[i]),
                xytext=(6, 4), textcoords='offset points', fontsize=8, color='#0a84ff')
ax.set_aspect('equal'); ax.grid(alpha=.25)
ax.set_title(f'REAL HIKC track  L={L:.0f} m   {len(merged)} corners')
fig.tight_layout(); fig.savefig('track_real.png')
print('saved track_real.png')

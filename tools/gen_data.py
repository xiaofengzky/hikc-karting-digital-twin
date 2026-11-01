# -*- coding: utf-8 -*-
"""把求解好的中心线转成 3D 数据: 居中, 重采样 2m, 加高程/宽度, 输出 JS"""
import numpy as np, math, json

raw = json.load(open('track_raw.json'))
P = np.array(raw['pts'])
L = raw['length']
corners = raw['corners']

# 居中
cx = (P[:, 0].min() + P[:, 0].max()) / 2
cz = (P[:, 1].min() + P[:, 1].max()) / 2
P = P - np.array([cx, cz])

# 去掉闭合重复的末点
if np.linalg.norm(P[-1] - P[0]) < 0.5:
    P = P[:-1]

# 等弧长重采样 2m
d = np.linalg.norm(np.diff(np.vstack([P, P[:1]]), axis=0), axis=1)
s = np.concatenate([[0], np.cumsum(d)[:-1]])
ss = np.arange(0, L, 2.0)
xs = np.interp(ss, s, P[:, 0], period=L)
zs = np.interp(ss, s, P[:, 1], period=L)

# 高程: 多弯高起伏, 最大坡度约 5%
elev = 3.1 * np.sin(2 * np.pi * ss / L * 1.0 - 1.15) \
     + 1.55 * np.sin(2 * np.pi * ss / L * 3.0 + 0.55) \
     + 0.55 * np.sin(2 * np.pi * ss / L * 6.0)
elev -= elev[0]

# 宽度: 主直道 12m, 弯心收窄到 10m, 大弯外侧加宽到 12.5
hw = np.full(len(ss), 5.5)
for c in corners:
    dc = np.abs(((ss - c['s'] + L / 2) % L) - L / 2)
    m = dc < 22
    hw[m] = np.minimum(hw[m], 5.0 + 2.0 * (dc[m] / 22) ** 2)
# 主直道加宽
for k in range(len(ss)):
    if ss[k] < 150 or ss[k] > L - 110:
        hw[k] = 6.0
hw = np.clip(hw, 5.0, 6.2)

pts = np.stack([xs, elev, zs], 1)

def fmt(a, n=1):
    return '[' + ','.join(f'{v:.{n}f}' for v in a) + ']'

js = []
js.append('const TRACK_DATA = {')
js.append(f'  length: {L:.2f},')
js.append(f'  step: 2.0,')
js.append('  pts: [')
for i in range(0, len(pts), 6):
    js.append('    ' + ','.join(f'[{p[0]:.1f},{p[1]:.2f},{p[2]:.1f}]' for p in pts[i:i + 6]) + ',')
js.append('  ],')
js.append('  hw: ' + fmt(hw, 2) + ',')
js.append('  corners: [' + ','.join(
    f"{{i:{c['i']},s:{c['s']:.1f},side:{c['side']},r:{c['R']:.1f},deg:{c['deg']:.1f}}}" for c in corners) + '],')
js.append('};')
open('track_data.js', 'w').write('\n'.join(js))
print('pts', len(pts), ' len', L, ' bbox', pts[:, 0].min(), pts[:, 0].max(), pts[:, 2].min(), pts[:, 2].max())
print('max grade %', round(float(np.abs(np.diff(elev) / 2.0).max()) * 100, 2))
print('elev range', round(float(elev.min()), 2), round(float(elev.max()), 2))

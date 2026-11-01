# -*- coding: utf-8 -*-
"""HIKC 孝感国际卡丁车赛车场 — 赛道中心线 (最终版)
17 弯 / 10 右 7 左 / 1240m / 宽 10-12m
直道长度作为自由变量解闭合, 弯角正则微调
"""
import numpy as np, math, json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.optimize import least_squares

TARGET_LEN = 1240.0
HP = math.pi / 2

SEG = [
    ('S', 200),            # 0 主直道(发车区)
    ('C', 32, 90, +1),     # T1
    ('S', 38),
    ('C', 18, 38, -1),     # T2
    ('S', 12),
    ('C', 18, 38, +1),     # T3
    ('S', 30),
    ('C', 16, 25, -1),     # T4
    ('S', 15),
    ('C', 16, 20, -1),     # T5
    ('S', 10),
    ('C', 16, 45, +1),     # T6
    ('S', 25),
    ('C', 30, 90, +1),     # T7
    ('S', 48),
    ('C', 17, 42, -1),     # T8
    ('S', 12),
    ('C', 17, 42, +1),     # T9
    ('S', 52),
    ('C', 20, 40, +1),     # T10
    ('S', 12),
    ('C', 20, 40, -1),     # T11
    ('S', 55),
    ('C', 30, 90, +1),     # T12
    ('S', 30),
    ('C', 18, 30, -1),     # T13
    ('S', 8),
    ('C', 18, 30, +1),     # T14
    ('S', 10),
    ('C', 18, 34, -1),     # T15
    ('S', 8),
    ('C', 18, 34, +1),     # T16
    ('S', 45),
    ('C', 34, 90, +1),     # T17
    ('S', 180),
]

s_idx = [i for i, q in enumerate(SEG) if q[0] == 'S']
c_idx = [i for i, q in enumerate(SEG) if q[0] == 'C']


def trace(dL, dA, step=1.2):
    p = np.array([0.0, 0.0]); h = 0.0
    pts = [p.copy()]
    L = 0.0; si = 0; ai = 0; s_acc = 0.0
    corners = []
    for q in SEG:
        if q[0] == 'S':
            val = max(4.0, q[1] + dL[si]); si += 1
            d = np.array([math.cos(h), math.sin(h)])
            n = max(2, int(val / 1.5))
            for i in range(1, n + 1):
                pts.append(p + d * (val * i / n))
            p = pts[-1].copy(); L += val; s_acc += val
        else:
            R, deg, side = q[1], max(8.0, q[2] + dA[ai]), q[3]; ai += 1
            a = math.radians(deg); n = max(8, int(R * abs(a) / step))
            cx = p[0] + R * math.cos(h + side * HP)
            cz = p[1] + R * math.sin(h + side * HP)
            first = pts[-1]
            for i in range(1, n + 1):
                t = a * i / n
                ang = h - side * HP + side * t
                pts.append(np.array([cx + R * math.cos(ang), cz + R * math.sin(ang)]))
            corners.append(dict(x=float((pts[-1][0] + first[0]) / 2),
                                z=float((pts[-1][1] + first[1]) / 2),
                                R=R, deg=deg, side=side, s=s_acc + R * abs(a) / 2))
            p = pts[-1].copy(); h += side * a
            L += R * abs(a); s_acc += R * abs(a)
    return np.array(pts), L, h, corners


def resid(x):
    dL, dA = x[:len(s_idx)], x[len(s_idx):]
    pts, L, h, _ = trace(dL, dA)
    e = pts[-1] - pts[0]
    return np.concatenate([e * 1.0, [(L - TARGET_LEN) / 3.0],
                           [(h - 2 * math.pi) * 60.0],
                           0.06 * dL, 0.9 * dA])


x0 = np.zeros(len(s_idx) + len(c_idx))
lo = np.array([-s[1] * 0.55 for s in [SEG[i] for i in s_idx]] + [-q[2] * 0.40 for q in [SEG[i] for i in c_idx]])
hi = np.array([s[1] * 2.5 for s in [SEG[i] for i in s_idx]] + [q[2] * 0.40 for q in [SEG[i] for i in c_idx]])
r = least_squares(resid, x0, bounds=(lo, hi), max_nfev=20000, xtol=1e-13, ftol=1e-13, gtol=1e-13)
dL, dA = r.x[:len(s_idx)], r.x[len(s_idx):]
pts, L, h, corners = trace(dL, dA)

print(f'长度 {L:.2f}  闭合 {np.linalg.norm(pts[-1]-pts[0]):.4f}  h={math.degrees(h)%360:.2f}')
print('直道', np.round(np.array([SEG[i][1] for i in s_idx]) + dL, 1))
print('弯角', np.round(np.array([SEG[i][2] for i in c_idx]) + dA, 1))
print('弯数', len(corners), '右', sum(1 for c in corners if c['side'] > 0),
      '左', sum(1 for c in corners if c['side'] < 0))
print('包围盒 x[{:.0f},{:.0f}] z[{:.0f},{:.0f}]'.format(
    pts[:, 0].min(), pts[:, 0].max(), pts[:, 1].min(), pts[:, 1].max()))


def selfx(P):
    n = len(P); step = 4
    S = [(P[i], P[(i + step) % n]) for i in range(0, n, step)]
    bad = []
    for i in range(len(S)):
        for j in range(i + 9, len(S)):
            if i == 0 and j > len(S) - 9:
                continue
            a, b = S[i]; c, d = S[j]
            def ccw(p, q, w):
                return (w[1] - p[1]) * (q[0] - p[0]) - (q[1] - p[1]) * (w[0] - p[0])
            if ccw(a, c, d) * ccw(b, c, d) < 0 and ccw(a, b, c) * ccw(a, b, d) < 0:
                bad.append((i, j))
    return bad


bad = selfx(pts)
print('自交', len(bad), bad[:5])

json.dump(dict(length=L, pts=pts.tolist(), dL=dL.tolist(), dA=dA.tolist(),
               corners=[dict(i=k + 1, x=c['x'], z=c['z'], R=c['R'], deg=c['deg'],
                             side=c['side'], s=c['s']) for k, c in enumerate(corners)]),
          open('track_raw.json', 'w'))

fig, ax = plt.subplots(figsize=(11, 8), dpi=110)
ax.plot(pts[:, 0], pts[:, 1], '-', lw=8, color='#2a2a2a', solid_capstyle='round')
ax.plot(pts[::3, 0], pts[::3, 1], ':', lw=.8, color='#ffc51f')
ax.plot(pts[0, 0], pts[0, 1], 'o', ms=10, color='#e10600', zorder=5)
ax.annotate('S/F', (pts[0, 0], pts[0, 1]), xytext=(8, -16), textcoords='offset points',
            color='#e10600', fontsize=11, weight='bold')
for k, c in enumerate(corners):
    ax.plot(c['x'], c['z'], '.', ms=3.5, color='#19a7ff')
    ax.annotate(f"T{k+1}{'R' if c['side']>0 else 'L'}", (c['x'], c['z']),
                xytext=(5, 3), textcoords='offset points', fontsize=7.5, color='#0a84ff')
ax.set_aspect('equal'); ax.grid(alpha=.25)
ax.set_title(f'HIKC Xiaogan  L={L:.0f} m | 17 corners | 10R / 7L')
fig.tight_layout(); fig.savefig('track_plan.png')
print('ok')

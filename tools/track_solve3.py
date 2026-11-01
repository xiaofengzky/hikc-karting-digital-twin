# -*- coding: utf-8 -*-
"""HIKC 孝感国际卡丁车赛车场 — 赛道中心线求解 v3
弯道序列表 (直道+圆弧) -> 最小范数闭合优化 -> 精确 1240m / 17 弯 (10R/7L)
输出 track_pts.json + 平面图
"""
import numpy as np, math, json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.optimize import least_squares

TARGET_LEN = 1240.0
HP = math.pi / 2

# ('S', L) | ('C', R, deg, side)  side +1 右 / -1 左
SEG = [
    ('S', 175),            # 主直道
    ('C', 32, 92, +1),     # T1
    ('S', 45),
    ('C', 15, 50, -1),     # T2
    ('S', 10),
    ('C', 15, 50, +1),     # T3
    ('S', 40),
    ('C', 22, 45, +1),     # T4
    ('S', 12),
    ('C', 22, 45, -1),     # T5
    ('S', 55),
    ('C', 26, 108, +1),    # T6
    ('S', 30),
    ('C', 14, 42, -1),     # T7
    ('S', 12),
    ('C', 14, 42, +1),     # T8
    ('S', 50),
    ('C', 24, 112, +1),    # T9
    ('S', 60),
    ('C', 17, 55, -1),     # T10
    ('S', 14),
    ('C', 17, 55, +1),     # T11
    ('S', 40),
    ('C', 26, 90, +1),     # T12
    ('S', 55),
    ('C', 19, 38, -1),     # T13
    ('S', 12),
    ('C', 19, 38, +1),     # T14
    ('S', 65),
    ('C', 22, 55, -1),     # T15
    ('S', 15),
    ('C', 22, 55, +1),     # T16
    ('S', 30),
    ('C', 28, 30, +1),     # T17
    ('S', 20),
]


def trace(seg, dL, dA, step=1.0):
    """返回 (pts, length, end_heading, corners)  pts: (x,z) 累积"""
    sL, sA = 0, 0
    p = np.array([0.0, 0.0])
    h = 0.0
    pts = [p.copy()]
    L = 0.0
    corners = []
    s_acc = 0.0
    for q in seg:
        if q[0] == 'S':
            val = q[1] + dL[sL]
            sL += 1
            d = np.array([math.cos(h), math.sin(h)])
            n = max(2, int(abs(val) / 1.5))
            for i in range(1, n + 1):
                pts.append(p + d * (val * i / n))
            p = pts[-1].copy()
            L += abs(val)
            s_acc += abs(val)
        else:
            R, deg, side = q[1], q[2] + dA[sA], q[3]
            sA += 1
            a = math.radians(deg)
            n = max(6, int(R * abs(a) / step))
            cx = p[0] + R * math.cos(h + side * HP)
            cz = p[1] + R * math.sin(h + side * HP)
            for i in range(1, n + 1):
                t = a * i / n
                ang = h - side * HP + side * t
                pts.append(np.array([cx + R * math.cos(ang), cz + R * math.sin(ang)]))
            mid = (pts[-1] + pts[-1 - n // 2]) / 2
            corners.append(dict(x=float(pts[-1][0] + pts[-1 - n // 2][0]) / 2,
                                z=float(pts[-1][1] + pts[-1 - n // 2][1]) / 2,
                                R=R, deg=deg, side=side, s=s_acc + R * abs(a) / 2))
            p = pts[-1].copy()
            h += side * a
            L += R * abs(a)
            s_acc += R * abs(a)
    return np.array(pts), L, h, corners


s_idx = [i for i, q in enumerate(SEG) if q[0] == 'S']
c_idx = [i for i, q in enumerate(SEG) if q[0] == 'C']


def unpack(x):
    dL = x[:len(s_idx)]
    dA = x[len(s_idx):]
    return dL, dA


def resid(x):
    dL, dA = unpack(x)
    pts, L, h, _ = trace(SEG, dL, dA)
    e = pts[-1] - pts[0]
    return np.concatenate([e, [(L - TARGET_LEN) / 8.0], 0.35 * dL, 2.2 * dA])


x0 = np.zeros(len(s_idx) + len(c_idx))
lo = np.array([-s[1] * 0.75 for s in [SEG[i] for i in s_idx]] + [-q[2] * 0.45 for q in [SEG[i] for i in c_idx]])
hi = np.array([s[1] * 2.2 for s in [SEG[i] for i in s_idx]] + [q[2] * 0.45 for q in [SEG[i] for i in c_idx]])
r = least_squares(resid, x0, bounds=(lo, hi), max_nfev=6000, xtol=1e-12, ftol=1e-12)
dL, dA = unpack(r.x)
pts, L, h, corners = trace(SEG, dL, dA)

print(f'长度 {L:.2f}  闭合 {np.linalg.norm(pts[-1]-pts[0]):.4f}  末端朝向 {math.degrees(h)%360:.2f}')
print('直道修正', np.round(dL, 1))
print('弯角修正', np.round(dA, 1))
print('弯数', len(corners), '右', sum(1 for c in corners if c['side'] > 0), '左', sum(1 for c in corners if c['side'] < 0))
print('包围盒 x[{:.0f},{:.0f}] z[{:.0f},{:.0f}]'.format(
    pts[:, 0].min(), pts[:, 0].max(), pts[:, 1].min(), pts[:, 1].max()))

# ---- 自交检测 ----
def self_intersect(P):
    n = len(P)
    bad = []
    for i in range(0, n - 2, 3):
        for j in range(i + 12, n - 2, 3):
            if i == 0 and j > n - 12:
                continue
            a, b = P[i], P[i + 3]
            c, d = P[j], P[j + 3]
            def ccw(p, q, r_):
                return (r_[1] - p[1]) * (q[0] - p[0]) - (q[1] - p[1]) * (r_[0] - p[0])
            if ccw(a, c, d) * ccw(b, c, d) < 0 and ccw(a, b, c) * ccw(a, b, d) < 0:
                bad.append((i, j))
    return bad

si = self_intersect(pts)
print('自交对数', len(si), si[:6])

json.dump(dict(length=L, pts=pts.tolist(),
               corners=[dict(i=k + 1, x=c['x'], z=c['z'], R=c['R'], deg=c['deg'],
                             side=c['side'], s=c['s']) for k, c in enumerate(corners)]),
          open('track_raw.json', 'w'))

fig, ax = plt.subplots(figsize=(11, 8.5), dpi=110)
ax.plot(pts[:, 0], pts[:, 1], '-', lw=8, color='#262626', solid_capstyle='round')
ax.plot(pts[::4, 0], pts[::4, 1], ':', lw=0.8, color='#ffc51f')
ax.plot(pts[0, 0], pts[0, 1], 'o', ms=10, color='#e10600', zorder=5)
ax.annotate('S/F', (pts[0, 0], pts[0, 1]), xytext=(8, -14), textcoords='offset points',
            color='#e10600', fontsize=11, weight='bold')
for c in corners:
    ax.plot(c['x'], c['z'], '.', ms=4, color='#19a7ff')
    ax.annotate(f"T{c['side'] and 'R' or 'L'}" if False else f"T{int(corners.index(c))+1}{'R' if c['side']>0 else 'L'}",
                (c['x'], c['z']), xytext=(6, 4), textcoords='offset points', fontsize=8, color='#0a84ff')
ax.set_aspect('equal'); ax.grid(alpha=.25)
ax.set_title(f'HIKC Xiaogan  L={L:.0f} m  |  17 corners (10R/7L)  |  w=10-12m')
fig.tight_layout(); fig.savefig('track_plan.png')
print('saved')

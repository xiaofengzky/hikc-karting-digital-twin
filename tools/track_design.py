# -*- coding: utf-8 -*-
"""HIKC 湖北国际卡丁车赛车场 - 赛道中心线求解器
按弯道序列(直线+圆弧)生成封闭赛道: 校正方向闭合, 用线性系统解位置闭合,
并锁定总长 1240m / 17 弯(10右7左)。输出中心线 JSON 与平面图预览。
"""
import numpy as np, math, json, os

TARGET_LEN = 1240.0
HALF_PI = math.pi / 2

# ('S', length) 直线 / ('C', R, angle_deg, side) 弯道  side: +1 右  -1 左
SEGMENTS = [
    ('S', 150),
    ('C', 34, 86, +1),   # T1
    ('S', 62),
    ('C', 16, 60, -1),   # T2
    ('S', 18),
    ('C', 22, 48, +1),   # T3
    ('S', 30),
    ('C', 14, 72, -1),   # T4
    ('S', 22),
    ('C', 20, 94, +1),   # T5
    ('S', 40),
    ('C', 26, 118, +1),  # T6
    ('S', 55),
    ('C', 18, 54, -1),   # T7
    ('S', 20),
    ('C', 24, 64, +1),   # T8
    ('S', 45),
    ('C', 16, 46, -1),   # T9
    ('S', 25),
    ('C', 18, 80, +1),   # T10
    ('S', 38),
    ('C', 22, 40, -1),   # T11
    ('S', 30),
    ('C', 15, 92, +1),   # T12
    ('S', 25),
    ('C', 20, 34, -1),   # T13
    ('S', 42),
    ('C', 28, 58, +1),   # T14
    ('S', 33),
    ('C', 17, 44, -1),   # T15
    ('S', 28),
    ('C', 21, 70, +1),   # T16
    ('S', 60),
    ('C', 24, 30, +1),   # T17
]


def arc_pts(p0, h0, R, ang_deg, side, step=1.0):
    a = math.radians(ang_deg)
    n = max(6, int(R * a / step))
    cx = p0[0] + R * math.cos(h0 + side * HALF_PI)
    cy = p0[1] + R * math.sin(h0 + side * HALF_PI)
    out = []
    for i in range(1, n + 1):
        t = a * i / n
        ang = h0 - side * HALF_PI + side * t
        out.append((cx + R * math.cos(ang), cy + R * math.sin(ang), h0 + side * t))
    return out


def build(segs, deltas=None, ang_scale=1.0):
    deltas = deltas or {}
    pts = [np.array([0.0, 0.0])]
    arcs = []          # 采样点 (x,y,h)
    h = 0.0
    total = 0.0
    corners = []
    for idx, s in enumerate(segs):
        if s[0] == 'S':
            L = s[1] + deltas.get(idx, 0.0)
            d = np.array([math.cos(h), math.sin(h)])
            n = max(2, int(L / 2.0))
            base = pts[-1].copy()
            for i in range(1, n + 1):
                pts.append(base + d * (L * i / n))
            total += L
        else:
            R, ang, side = s[1], s[2] * ang_scale, s[3]
            g = arc_pts(pts[-1], h, R, ang, side, 1.2)
            for q in g:
                pts.append(np.array([q[0], q[1]]))
            h += side * math.radians(ang)
            total += R * math.radians(ang)
            mid = g[len(g) // 2]
            corners.append(dict(x=mid[0], y=mid[1], side=side, R=R, deg=ang,
                                h0=g[0][2], h1=g[-1][2]))
    return np.array(pts), total, h, corners


def net(segs, scale):
    return sum(s[3] * s[2] * scale for s in segs if s[0] == 'C')


if __name__ == '__main__':
    scale = 360.0 / net(SEGMENTS, 1.0)
    pts, L, h, corners = build(SEGMENTS, ang_scale=scale)
    print(f'角度缩放 {scale:.4f}  长度 {L:.1f}  闭合误差 {np.linalg.norm(pts[-1] - pts[0]):.2f}')

    s_idx = [i for i, s in enumerate(SEGMENTS) if s[0] == 'S']
    pick = [s_idx[0], s_idx[4], s_idx[8], s_idx[13]]
    A = np.zeros((3, len(pick)))
    for k, si in enumerate(pick):
        pp, LL, _, _ = build(SEGMENTS, deltas={si: 1.0}, ang_scale=scale)
        A[:, k] = [pp[-1][0] - pts[-1][0], pp[-1][1] - pts[-1][1], LL - L]
    b = np.array([-pts[-1][0], -pts[-1][1], TARGET_LEN - L])
    sol, *_ = np.linalg.lstsq(A, b, rcond=None)
    print('直道修正', [round(float(v), 1) for v in sol])

    deltas = {si: float(v) for si, v in zip(pick, sol)}
    pts, L, h, corners = build(SEGMENTS, deltas=deltas, ang_scale=scale)
    print(f'最终长度 {L:.2f}  闭合 {np.linalg.norm(pts[-1]-pts[0]):.3f}  '
          f'朝向 {math.degrees(h)%360:.2f}  弯数 {len(corners)} '
          f'(右{sum(1 for c in corners if c["side"]>0)}/左{sum(1 for c in corners if c["side"]<0)})')
    print('包围盒 x[{:.1f},{:.1f}] y[{:.1f},{:.1f}]'.format(
        pts[:, 0].min(), pts[:, 0].max(), pts[:, 1].min(), pts[:, 1].max()))

    # 重采样等弧长 + 高程
    d = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(d)])
    ss = np.linspace(0, s[-1], int(s[-1] / 2.0) + 1)
    xs = np.interp(ss, s, pts[:, 0])
    ys = np.interp(ss, s, pts[:, 1])
    # 高程: 长波起伏, 最大坡度约 5%
    zz = 3.6 * np.sin(2 * math.pi * ss / L - 1.1) + 1.7 * np.sin(2 * math.pi * 3 * ss / L + 0.6)
    zz -= zz[0]

    out = dict(
        length=round(float(L), 1),
        center=[[round(float(a), 2), round(float(b), 2), round(float(c), 3)] for a, b, c in zip(xs, ys, zz)],
        corners=[dict(i=i + 1, x=round(c['x'], 1), y=round(c['y'], 1), r=round(c['R'], 1),
                      deg=round(c['deg'], 1), side=c['side']) for i, c in enumerate(corners)],
    )
    json.dump(out, open('track_pts.json', 'w'))

    # 预览图
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(11, 8), dpi=110)
    ax.plot(xs, ys, '-', lw=9, color='#2b2b2b', solid_capstyle='round')
    ax.plot(xs, ys, '--', lw=0.7, color='#ffcc00')
    ax.plot(xs[0], ys[0], 'o', ms=9, color='#e10600')
    ax.annotate('START', (xs[0], ys[0]), textcoords='offset points', xytext=(6, 8), color='#e10600')
    for c in out['corners']:
        ax.plot(c['x'], c['y'], '.', ms=3, color='#00b0ff')
        ax.annotate(f"T{c['i']}{'R' if c['side']>0 else 'L'}", (c['x'], c['y']),
                    textcoords='offset points', xytext=(5, 5), fontsize=7.5, color='#0af')
    ax.set_aspect('equal'); ax.grid(alpha=.2)
    ax.set_title(f'HIKC Xiaogan Kart Circuit  L={L:.0f}m  corners={len(corners)}')
    fig.tight_layout(); fig.savefig('track_plan.png')
    print('saved track_plan.png')

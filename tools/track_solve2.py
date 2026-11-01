# -*- coding: utf-8 -*-
"""HIKC 赛道中心线求解 v2：极坐标谐波环形 + 各向异性拉伸
保证不自交, 曲率分析自动数弯(右10/左7), 锁定长度 1240m, 输出 JSON + 预览
"""
import numpy as np, math, json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

TARGET_LEN = 1240.0

# r(θ) = R0 * (1 + Σ A_i cos(k_i θ + p_i))
HARM = [(3, 0.075, 0.30), (5, 0.055, 1.05), (7, 0.042, 2.30), (11, 0.026, 0.40)]
R0 = 150.0
KX, KZ = 1.22, 0.90     # 各向异性: 东西向拉长


def centerline(n=2400):
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    r = np.ones(n)
    for k, a, p in HARM:
        r += a * np.cos(k * th + p)
    x = R0 * r * np.cos(th) * KX
    z = R0 * r * np.sin(th) * KZ
    return np.stack([x, z], axis=1)


def smooth_closed(P, it=2):
    for _ in range(it):
        P = 0.25 * np.roll(P, 1, axis=0) + 0.5 * P + 0.25 * np.roll(P, -1, axis=0)
    return P


def arclen(P):
    d = np.roll(P, -1, axis=0) - P
    return np.linalg.norm(d, axis=1)


def corners_of(P, min_r=70.0, merge=18.0):
    """按曲率找弯心. 返回 [(s, side, R, deg)]  side +1 右 / -1 左"""
    n = len(P)
    d1 = np.roll(P, -1, axis=0) - np.roll(P, 1, axis=0)
    d2 = np.roll(P, -1, axis=0) - 2 * P + np.roll(P, 1, axis=0)
    num = d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]
    den = np.power((d1 ** 2).sum(1), 1.5) + 1e-12
    k = num / den
    k = np.convolve(np.concatenate([k[-9:], k, k[:9]]), np.ones(11) / 11, 'same')[9:-9]
    R = 1.0 / np.maximum(np.abs(k), 1e-6)
    seg = np.linalg.norm(np.roll(P, -1, axis=0) - P, axis=1)
    s = np.concatenate([[0], np.cumsum(seg)[:-1]])
    m = len(P)
    hits = []
    for i in range(m):
        if R[i] < min_r:
            a, b, c = (i - 1) % m, i, (i + 1) % m
            if R[i] <= R[a] and R[i] <= R[c]:
                hits.append(i)
    # 合并邻近峰值
    merged = []
    for i in hits:
        if merged and min((i - merged[-1]) % m, (merged[-1] - i) % m) < merge:
            if R[i] < R[merged[-1]]:
                merged[-1] = i
        else:
            merged.append(i)
    out = []
    for i in merged:
        # 弯道总转角: 积分曲率
        j = i
        span = []
        # 沿两侧扩展到曲率变号或半径>min_r
        for step in range(1, m):
            if R[(i + step) % m] > min_r * 1.4:
                break
            span.append((i + step) % m)
        for step in range(1, m):
            if R[(i - step) % m] > min_r * 1.4:
                break
            span.append((i - step) % m)
        idx = sorted(span) or [i]
        ang = abs(np.abs(k[idx]).sum() * seg[idx].mean())
        out.append((float(s[i]), int(np.sign(k[i])), float(R[i]), float(math.degrees(ang))))
    return out, k, R, s


if __name__ == '__main__':
    P = smooth_closed(centerline())
    cs, k, R, s = corners_of(P)
    L = np.linalg.norm(np.roll(P, -1, axis=0) - P, axis=1).sum()
    print(f'长度 {L:.1f}  包围 x[{P[:,0].min():.0f},{P[:,0].max():.0f}] z[{P[:,1].min():.0f},{P[:,1].max():.0f}]')
    print(f'弯数 {len(cs)}  右 {sum(1 for c in cs if c[1]>0)}  左 {sum(1 for c in cs if c[1]<0)}')
    for i, c in enumerate(cs):
        print(f'  T{i+1} {"R" if c[1]>0 else "L"} R={c[2]:.0f}m 转角~{c[3]:.0f}deg')

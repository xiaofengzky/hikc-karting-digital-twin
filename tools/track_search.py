# -*- coding: utf-8 -*-
"""HIKC 赛道自动寻形：
闭合傅里叶参数曲线 -> 曲率峰值数弯 -> 搜索 17 弯(10R/7L) 不自交 且像样的布局
"""
import numpy as np, math, json, itertools, random

TARGET_LEN = 1240.0
HP = math.pi / 2


def curve(params, n=1600):
    h = params['harm']
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    r = np.ones(n)
    for (k, a, p) in h:
        r = r + a * np.cos(k * th + p)
    x = params['R'] * r * np.cos(th) * params['kx']
    z = params['R'] * r * np.sin(th) * params['kz']
    return np.stack([x, z], 1), r


def smooth_closed(P, it=1):
    for _ in range(it):
        P = 0.25 * np.roll(P, 1, 0) + 0.5 * P + 0.25 * np.roll(P, -1, 0)
    return P


def curvature(P, win=9):
    d1 = np.roll(P, -1, 0) - np.roll(P, 1, 0)
    d2 = np.roll(P, -1, 0) - 2 * P + np.roll(P, 1, 0)
    num = d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]
    den = np.power((d1 ** 2).sum(1), 1.5) + 1e-12
    k = num / den
    k = np.convolve(np.concatenate([k[-win:], k, k[:win]]), np.ones(win) / win, 'same')[win:-win]
    return k


def analyze(P, min_r=75.0, gap=26.0):
    P = smooth_closed(P, 1)
    m = len(P)
    seg = np.linalg.norm(np.roll(P, -1, 0) - P, axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])[:-1]
    L = seg.sum()
    k = curvature(P)
    Ks = np.abs(k)
    R = 1.0 / np.maximum(Ks, 1e-7)
    peaks = []
    for i in range(m):
        a, b, c = (i - 1) % m, i, (i + 1) % m
        if Ks[i] >= Ks[a] and Ks[i] > Ks[c] and R[i] < min_r:
            peaks.append(i)
    merged = []
    for i in peaks:
        if merged:
            j = merged[-1]
            d = min((i - j) % m, (j - i) % m)
            if d * seg.mean() < gap:
                if Ks[i] > Ks[merged[-1]]:
                    merged[-1] = i
                continue
        merged.append(i)
    return dict(P=P, L=L, k=k, R=R, s=s, peaks=merged,
                n=len(merged),
                right=sum(1 for i in merged if k[i] > 0),
                left=sum(1 for i in merged if k[i] < 0),
                minR=float(R[merged].min()) if merged else 0,
                bbox=((P[:, 0].min(), P[:, 0].max()), (P[:, 1].min(), P[:, 1].max())))


def selfx(P):
    n = len(P)
    step = 4
    segs = [(P[i], P[(i + step) % n]) for i in range(0, n, step)]
    bad = 0
    for i in range(len(segs)):
        for j in range(i + 8, len(segs)):
            if i == 0 and j > len(segs) - 8:
                continue
            a, b = segs[i]
            c, d = segs[j]
            def ccw(p, q, r_):
                return (r_[1] - p[1]) * (q[0] - p[0]) - (q[1] - p[1]) * (r_[0] - p[0])
            if ccw(a, c, d) * ccw(b, c, d) < 0 and ccw(a, b, c) * ccw(a, b, d) < 0:
                bad += 1
    return bad


if __name__ == '__main__':
    random.seed(7)
    best = []
    ks = [2, 3, 4, 5, 6, 7, 9, 11]
    for trial in range(4000):
        nh = random.randint(3, 5)
        picks = random.sample(ks, nh)
        harm = [(k, random.uniform(0.06, 0.26), random.uniform(0, 2 * math.pi)) for k in picks]
        p = dict(harm=harm, R=1.0, kx=random.uniform(1.05, 1.35), kz=random.uniform(0.78, 1.0))
        P, r = curve(p)
        if r.min() < 0.35:
            continue
        A = analyze(P)
        if A['n'] != 17 or A['right'] != 10 or A['left'] != 7:
            continue
        if selfx(A['P']) > 0:
            continue
        (x0, x1), (z0, z1) = A['bbox']
        ratio = (x1 - x0) / (z1 - z0)
        if not (1.2 < ratio < 2.2):
            continue
        if A['minR'] < 11:
            continue
        score = abs(A['minR'] - 24) + abs(ratio - 1.65) * 20
        best.append((score, p, A))
        if len(best) > 40:
            best.sort(key=lambda t: t[0])
            best = best[:25]

    best.sort(key=lambda t: t[0])
    print('候选数', len(best))
    for sc, p, A in best[:6]:
        print(f"score {sc:.1f} n={A['n']} R/L={A['right']}/{A['left']} minR={A['minR']:.1f} "
              f"ratio={(A['bbox'][0][1]-A['bbox'][0][0])/(A['bbox'][1][1]-A['bbox'][1][0]):.2f} "
              f"L={A['L']:.0f}")
    json.dump([dict(score=s, harm=p['harm'], R=p['R'], kx=p['kx'], kz=p['kz'])
               for s, p, A in best[:10]], open('track_candidates.json', 'w'))

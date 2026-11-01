# -*- coding: utf-8 -*-
"""解析 VBO 遥测 -> 真实赛道中心线"""
import numpy as np, math, json, io, re
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

F = r"C:/Users/29651/xwechat_files/wxsn8kj4ceif022_3725/msg/file/2026-09/湖北国际卡丁车_2026-09-06_18_32_17.vbo"
F = r"C:/Users/29651/xwechat_files/wxid_usn8kj4ceif022_3725/msg/file/2026-09/湖北国际卡丁车_2026-09-06_18_32_17.vbo"

rows = []
started = False
for line in io.open(F, 'r', encoding='utf-8', errors='ignore'):
    if line.strip().startswith('[data]'):
        started = True
        continue
    if not started:
        continue
    parts = line.split()
    if len(parts) < 9:
        continue
    try:
        rows.append((float(parts[1]), float(parts[2]), float(parts[3]),
                     float(parts[4]), float(parts[5]), float(parts[6])))
    except ValueError:
        continue

A = np.array(rows, dtype=float)
print('采样点', len(A), ' 时长', A[-1, 0] - A[0, 0], 's')

# 时间 (hhmmss.xxx) -> 秒
def tsec(t):
    h = int(t // 10000); m = int((t % 10000) // 100); s = t % 100
    return h * 3600 + m * 60 + s

tt = np.array([tsec(t) for t in A[:, 0]])
tt -= tt[0]
lat_raw = A[:, 1]; lon_raw = A[:, 2]
lat = np.floor(lat_raw / 100) + (lat_raw % 100) / 60.0
lon = -(np.floor(-lon_raw / 100) + ((-lon_raw) % 100) / 60.0) if (lon_raw < 0).any() else np.floor(lon_raw / 100) + (lon_raw % 100) / 60.0
speed = A[:, 3]; head = A[:, 4]; hgt = A[:, 5]

print('lat', lat.min(), lat.max(), ' lon', lon.min(), lon.max(), ' hgt', hgt.min(), hgt.max())

# 局部米制坐标
lat0, lon0 = lat.mean(), lon.mean()
MLAT = 111320.0
MLON = 111320.0 * math.cos(math.radians(lat0))
x = (lon - lon0) * MLON
z = (lat - lat0) * MLAT      # 经航向校验：纬度增大对应 +z

d = np.hypot(np.diff(x), np.diff(z))
dist = np.concatenate([[0], np.cumsum(d)])
print('总里程', round(dist[-1], 1), 'm')

fig, axs = plt.subplots(1, 2, figsize=(15, 7), dpi=110)
ax = axs[0]
ax.plot(x, z, '-', lw=0.8, color='#e10600')
ax.plot(x[0], z[0], 'go', ms=9, label='start')
ax.set_aspect('equal'); ax.grid(alpha=.25); ax.legend()
ax.set_title(f'VBO track  {dist[-1]:.0f} m')

ax = axs[1]
ax.plot(tt, speed, lw=.6, color='#0a84ff')
ax.set_xlabel('t (s)'); ax.set_ylabel('km/h'); ax.grid(alpha=.25)
ax.set_title('speed')
fig.tight_layout(); fig.savefig('vbo_raw.png')
np.savez('vbo.npz', x=x, z=z, tt=tt, speed=speed, hgt=hgt, dist=dist)
print('saved vbo_raw.png')

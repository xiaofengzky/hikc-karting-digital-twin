# -*- coding: utf-8 -*-
"""卫星图裁剪 + 轨迹四向对比，确认镜像"""
from PIL import Image
import numpy as np, json, math
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

IM = r'C:\Users\29651\Desktop\7ADF88F1B8EF973564D6D6FBC3CBDEEB.jpg'
im = Image.open(IM).convert('RGB')
W, H = im.size
print('img', W, H)

# 赛道区域粗裁（目视估计）
crop = im.crop((0, 300, W, 840))
crop.save('sat_crop.png')
print('crop', crop.size)

d = json.load(open('vbo_lap.json'))
P = np.array(d['pts'])
x, z = P[:, 0], P[:, 1]

variants = [
    ('as-is', x, z),
    ('flip Z (mirror N-S)', x, -z),
    ('flip X (mirror E-W)', -x, z),
    ('rot180', -x, -z),
]

fig, axs = plt.subplots(1, 5, figsize=(22, 6), dpi=100)
axs[0].imshow(crop)
axs[0].set_title('satellite (north up)', fontsize=11)
axs[0].axis('off')
for k, (name, xx, zz) in enumerate(variants):
    a = axs[k + 1]
    a.plot(xx, zz, '-', lw=4, color='#222')
    a.plot(xx[0], zz[0], 'o', ms=6, color='#e10600')
    a.set_aspect('equal'); a.invert_yaxis()   # 与卫星图一致：z 向下 = 南
    a.set_title(name, fontsize=10); a.grid(alpha=.2)
fig.tight_layout(); fig.savefig('mirror_check.png')
print('saved mirror_check.png')

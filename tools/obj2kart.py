# -*- coding: utf-8 -*-
"""解析卡丁车 OBJ -> 量化几何 + base64，供单文件内联"""
import io, base64, struct, math, json

SRC = 'kart.obj'

verts = []
faces_by_group = {}
cur = 'default'

for line in io.open(SRC, 'r', encoding='utf-8', errors='ignore'):
    if line.startswith('v '):
        p = line.split()
        verts.append((float(p[1]), float(p[2]), float(p[3])))
    elif line.startswith('g '):
        cur = line[2:].strip() or 'default'
        faces_by_group.setdefault(cur, [])
    elif line.startswith('f '):
        p = line.split()[1:]
        idxs = []
        for tok in p:
            a = tok.split('/')[0]
            if a:
                idxs.append(int(a) - 1)
        if len(idxs) < 3:
            continue
        faces_by_group.setdefault(cur, [])
        for k in range(1, len(idxs) - 1):
            faces_by_group[cur].append((idxs[0], idxs[k], idxs[k + 1]))

print('verts', len(verts))
for g, f in faces_by_group.items():
    print(' group', g, 'tris', len(f))

# 统一缩放：按最大边长归一到车长 1.8m
xs = [v[0] for v in verts]; ys = [v[1] for v in verts]; zs = [v[2] for v in verts]
print('raw bbox x', min(xs), max(xs))
print('raw bbox y', min(ys), max(ys))
print('raw bbox z', min(zs), max(zs))

# 判断长轴
dx, dy, dz = max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)
print('dims', round(dx, 2), round(dy, 2), round(dz, 2))

out = {}
for g, fs in faces_by_group.items():
    if not fs:
        continue
    used = sorted({i for f in fs for i in f})
    remap = {v: k for k, v in enumerate(used)}
    idx = []
    for f in fs:
        idx.extend([remap[f[0]], remap[f[1]], remap[f[2]]])
    pos = [verts[i] for i in used]
    out[g] = (pos, idx)

# 合并所有组求统一变换（Z-up -> Y-up，居中，车长归一到 1.8m）
allx = [p[0] for g in out.values() for p in g[0]]
ally = [p[1] for g in out.values() for p in g[0]]
allz = [p[2] for g in out.values() for p in g[0]]
cx = (min(allx) + max(allx)) / 2
cy = (min(ally) + max(ally)) / 2
zbot = min(allz)
scale = 1.80 / (max(ally) - min(ally))
print('center', round(cx, 2), round(cy, 2), round(zbot, 2), 'scale', round(scale, 5))

payload = {}
for g, (pos, idx) in out.items():
    q = []
    for (x, y, z) in pos:
        # 原 Z-up：y=车长, x=车宽, z=高  ->  新 Y-up：x=车长, y=高, z=车宽
        q.append(round((y - cy) * scale * 10000))
        q.append(round((z - zbot) * scale * 10000))
        q.append(round((x - cx) * scale * 10000))
    # Int16 量化：1/10000 m 精度
    arr = struct.pack('<%dh' % len(q), *q)
    iarr = struct.pack('<%dH' % len(idx), *idx)
    payload[g] = (base64.b64encode(arr).decode(), base64.b64encode(iarr).decode(), len(pos), len(idx) // 3)
    print(g, 'verts', len(pos), 'tris', len(idx) // 3,
          'pos_b64', len(payload[g][0]), 'idx_b64', len(payload[g][1]))

js = ['const KART_MESH = {']
for g, (pb, ib, nv, nt) in payload.items():
    key = 'body' if 'body' in g.lower() else ('wheels' if 'wheel' in g.lower() else g)
    js.append(f'  {key}: {{ p: "{pb}", i: "{ib}", nv: {nv}, nt: {nt} }},')
js.append('};')
io.open('kart_data.js', 'w', encoding='utf-8').write('\n'.join(js))
print('total chars', sum(len(v[0]) + len(v[1]) for v in payload.values()))

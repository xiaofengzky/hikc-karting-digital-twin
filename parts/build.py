# -*- coding: utf-8 -*-
"""合并 parts 为单文件 index.html"""
import os, io

ORDER = [
    'p1_head.html',
    'p2_util.js',
    '../tools/track_data.js',
    'p2b_state.js',
    'p3_scene.js',
    'p4_track.js',
    'p5_trackfx.js',
    'p5b_kartdata.js',
    'p6_buildings.js',
    'p7_env.js',
    'p8_weather.js',
    'p9_camera.js',
    'p10_ui.js',
    'p11_main.js',
    'p12_tail.html',
]

base = os.path.dirname(os.path.abspath(__file__))
out = []
for f in ORDER:
    p = os.path.normpath(os.path.join(base, f))
    with io.open(p, 'r', encoding='utf-8') as fh:
        out.append(fh.read().rstrip('\n'))
    out.append('')

html = '\n'.join(out)

# 内联 three.js（离线可用）
three_path = os.path.normpath(os.path.join(base, '..', 'tools', 'three.min.js'))
if os.path.exists(three_path):
    with io.open(three_path, 'r', encoding='utf-8') as fh:
        three = fh.read()
    html = html.replace('/* THREE_JS_INLINE */', three)
    print('three.js inlined:', round(len(three) / 1024, 1), 'KB')

target = os.path.normpath(os.path.join(base, '..', 'HIKC_孝感卡丁车赛车场.html'))
with io.open(target, 'w', encoding='utf-8') as fh:
    fh.write(html)
print('written', target, len(html), 'chars', round(os.path.getsize(target) / 1024, 1), 'KB')

# GitHub Pages 入口（保持链接干净：/repo/ 直接打开）
idx = os.path.normpath(os.path.join(base, '..', 'index.html'))
with io.open(idx, 'w', encoding='utf-8') as fh:
    fh.write(html)
print('entry  ', idx, '(GitHub Pages 入口)')

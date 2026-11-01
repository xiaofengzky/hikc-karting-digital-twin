# -*- coding: utf-8 -*-
"""v3：法线方向修正 + 按现场照片还原（蓝白路肩/二层观景台/卡丁车/隔离墩）"""
import io, os
B = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'parts')

def patch(fn, pairs):
    p = os.path.join(B, fn); s = io.open(p, encoding='utf-8').read(); hit = 0
    for a, b in pairs:
        if a in s: s = s.replace(a, b); hit += 1
        else: print('  miss', fn, ':', a[:64].replace('\n', ' '))
    io.open(p, 'w', encoding='utf-8').write(s); print(fn, f'{hit}/{len(pairs)}')

# ---- 法线改为右法线（数据 z 轴向北）----
patch('p4_track.js', [
    ("    TRACK.N.push(new THREE.Vector3(-t.z, 0, t.x));   // 右法线",
     "    TRACK.N.push(new THREE.Vector3(t.z, 0, -t.x));   // 右法线（坐标 z 轴指向北）"),
])

# ---- 路肩蓝白 ----
patch('p4_track.js', [
    ("  for (let i = 0; i < 2; i++) { kg.fillStyle = i ? '#f2f2f2' : '#d21e12'; kg.fillRect(i * 128, 0, 128, 64); }",
     "  for (let i = 0; i < 2; i++) { kg.fillStyle = i ? '#eef1f4' : '#1b46c4'; kg.fillRect(i * 128, 0, 128, 64); }"),
])

# ---- 维修楼：一层车库 + 二层观景平台 ----
patch('p6_buildings.js', [
    ("  const p = t.p.clone().addScaledVector(t.nrm, t.hw + 15);",
     "  const p = t.p.clone().addScaledVector(t.nrm, -(t.hw + 16));"),
    # 二层改成观景平台
    ("""  addBox(g, LEN, 5.4, 13, MAT.concrete, 0, 0, 0);
  // 二层控制/车队房
  addBox(g, LEN, 2.6, 11, MAT.offwhite, 0, 5.4, 0.6);""",
     """  addBox(g, LEN, 5.4, 13, MAT.concrete, 0, 0, 0);
  // 二层观景平台 / 售票区（朝向赛道一侧敞开）
  addBox(g, LEN, 0.35, 12, MAT.offwhite, 0, 5.4, 0.5);
  for (let i = 0; i < 9; i++) {
    const s = addBox(g, LEN / 9 - 0.5, 0.42, 0.8, MAT.seat, -LEN / 2 + 3.6 + i * (LEN / 9), 5.75, 5.2);
  }
  // 观景台玻璃栏板
  const rail = new THREE.Mesh(new THREE.BoxGeometry(LEN, 1.0, 0.12), MAT.glass);
  rail.position.set(0, 6.55, -5.4);
  g.add(rail);
  // 二层顶棚前柱
  for (let i = -2; i <= 2; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.6, 6), MAT.metal);
    c.position.set(i * (LEN / 4.6), 6.9, -5.3);
    g.add(c);
  }"""),
    # 车道门朝向：维修楼在 -nrm（北），门要朝赛道（+z 局部）
    ("    d.position.set(x, 2.15, -6.56);\n    d.rotation.y = Math.PI;",
     "    d.position.set(x, 2.15, -6.56);\n    d.rotation.y = Math.PI;"),
    # 控制塔移到北侧同侧
    ("  const p = t.p.clone().addScaledVector(t.nrm, -(t.hw + 22));",
     "  const p = t.p.clone().addScaledVector(t.nrm, -(t.hw + 24));"),
    # 围场移到维修楼北侧
    ("function buildPaddock(cx = -118, cz = -108) {", "function buildPaddock(cx = -6, cz = 128) {"),
    ("  const ground = new THREE.Mesh(new THREE.PlaneGeometry(78, 54),",
     "  const ground = new THREE.Mesh(new THREE.PlaneGeometry(96, 46),"),
    ("    const tx = -18 + (i % 2) * 36, tz = -13 + Math.floor(i / 2) * 26;",
     "    const tx = -30 + (i % 2) * 60, tz = -10 + Math.floor(i / 2) * 22;"),
    ("  const conBoxes = [[-30, 20, 0], [-30, 16, 2], [30, 22, 1]];",
     "  const conBoxes = [[36, 16, 0], [36, 12, 2], [-38, 18, 1]];"),
    # 入口
    ("  const cx = 46, cz = -142;", "  const cx = -108, cz = 132;"),
    # 停车场
    ("function buildParking(cx = -52, cz = -178) {", "function buildParking(cx = -112, cz = 186) {"),
    # 服务建筑
    ("  const cx = -60, cz = 112;", "  const cx = 116, cz = -96;"),
    ("  const cx2 = 54, cz2 = 104;", "  const cx2 = 118, cz2 = -66;"),
])

# ---- 横幅与灯杆 ----
patch('p5_trackfx.js', [
    ("    const p = t.p.clone().addScaledVector(t.nrm, -(t.hw + 6.4));",
     "    const p = t.p.clone().addScaledVector(t.nrm, -(t.hw + 6.6));"),
    ("  const spots = [[-152, -112], [96, -112], [150, -14], [66, 108], [-56, 108], [-158, 26]];",
     "  const spots = [[-96, 96], [30, 104], [136, 66], [150, -22], [40, -92], [-118, -40], [-90, 40], [70, 46]];"),
])
PYEOF_MARK = None

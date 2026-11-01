# -*- coding: utf-8 -*-
"""建筑 / 相机 / UI 位置按真实赛道尺度重排"""
import io, os

B = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'parts')

def patch(fn, pairs):
    p = os.path.join(B, fn)
    s = io.open(p, encoding='utf-8').read()
    hit = 0
    for a, b in pairs:
        if a in s:
            s = s.replace(a, b); hit += 1
        else:
            print('  !! miss', fn, ':', a[:70].replace('\n', ' '))
    io.open(p, 'w', encoding='utf-8').write(s)
    print(f'{fn}: {hit}/{len(pairs)}')

# ---------- 看台 ----------
patch('p6_buildings.js', [
    ("  const s0 = 92;\n  const t = trackAt(s0);\n  const a = Math.atan2(t.t.z, t.t.x);\n  const p = t.p.clone().addScaledVector(t.nrm, -(t.hw + 19));",
     "  const s0 = 2;\n  const t = trackAt(s0);\n  const a = Math.atan2(t.t.z, t.t.x);\n  const p = t.p.clone().addScaledVector(t.nrm, -(t.hw + 18));"),
    ("  const LEN = 118, ROWS = 9, DEPTH = 1.85, RISE = 0.66;",
     "  const LEN = 86, ROWS = 8, DEPTH = 1.7, RISE = 0.62;"),
    ("  for (let i = -3; i <= 3; i++) {\n    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, roofY, 8), MAT.metal);\n    col.position.set(i * 17, roofY / 2, 9.6);",
     "  for (let i = -2; i <= 2; i++) {\n    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, roofY, 8), MAT.metal);\n    col.position.set(i * 20, roofY / 2, 9.6);"),
    ("    br.position.set(i * 17, roofY - 1.3, 7.6);",
     "    br.position.set(i * 20, roofY - 1.2, 7.6);"),
    # ---------- 控制塔 ----------
    ("  const s0 = 22;\n  const t = trackAt(s0);\n  const a = Math.atan2(t.t.z, t.t.x);\n  const p = t.p.clone().addScaledVector(t.nrm, -(t.hw + 26));",
     "  const s0 = 88;\n  const t = trackAt(s0);\n  const a = Math.atan2(t.t.z, t.t.x);\n  const p = t.p.clone().addScaledVector(t.nrm, -(t.hw + 22));"),
    # ---------- 维修区 ----------
    ("  const s0 = 76;\n  const t = trackAt(s0);\n  const a = Math.atan2(t.t.z, t.t.x);\n  const p = t.p.clone().addScaledVector(t.nrm, t.hw + 17);",
     "  const s0 = 34;\n  const t = trackAt(s0);\n  const a = Math.atan2(t.t.z, t.t.x);\n  const p = t.p.clone().addScaledVector(t.nrm, t.hw + 15);"),
    ("  const LEN = 132;", "  const LEN = 86;"),
    ("""  for (let i = 0; i < 13; i++) {
    const x = -LEN / 2 + 6 + i * 9.9;""",
     """  for (let i = 0; i < 8; i++) {
    const x = -LEN / 2 + 5.5 + i * 10.7;"""),
    ("    const d = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.2), doorMat);",
     "    const d = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.0), doorMat);"),
    ("    fr.position.set(x - 4.0, 2.25, -6.5); g.add(fr);\n    const fr2 = fr.clone(); fr2.position.x = x + 4.0; g.add(fr2);",
     "    fr.position.set(x - 3.8, 2.25, -6.5); g.add(fr);\n    const fr2 = fr.clone(); fr2.position.x = x + 3.8; g.add(fr2);"),
    ("    map: tex(windowTexture(22, 2, 0.35), 3, 1, 4), roughness: 0.25, metalness: 0.3",
     "    map: tex(windowTexture(15, 2, 0.35), 3, 1, 4), roughness: 0.25, metalness: 0.3"),
    # ---------- 围场 ----------
    ("function buildPaddock(cx = -90, cz = -20) {", "function buildPaddock(cx = -118, cz = -108) {"),
    ("  const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 110),",
     "  const ground = new THREE.Mesh(new THREE.PlaneGeometry(78, 54),"),
    ("""  for (let i = 0; i < 6; i++) {
    const tx = -55 + (i % 3) * 46, tz = -28 + Math.floor(i / 3) * 40;""",
     """  for (let i = 0; i < 4; i++) {
    const tx = -18 + (i % 2) * 36, tz = -13 + Math.floor(i / 2) * 26;"""),
    ("    const top = new THREE.Mesh(new THREE.ConeGeometry(6.4, 1.5, 4), MAT.canvasWhite);",
     "    const top = new THREE.Mesh(new THREE.ConeGeometry(6.0, 1.4, 4), MAT.canvasWhite);"),
    ("  const conBoxes = [[-8, 6, 0], [8, 6, 0], [-8, 6, 1], [22, 6, 2], [-24, 6, 3]];",
     "  const conBoxes = [[-30, 20, 0], [-30, 16, 2], [30, 22, 1]];"),
    # ---------- 入口 ----------
    ("  const cx = -62, cz = -205;", "  const cx = 46, cz = -142;"),
    ("    const beam = new THREE.Mesh(new THREE.BoxGeometry(25, 3.0, 2.6), MAT.darkMetal);",
     "    const beam = new THREE.Mesh(new THREE.BoxGeometry(25, 3.0, 2.6), MAT.darkMetal);"),
    # ---------- 停车场 ----------
    ("function buildParking(cx = -160, cz = -235) {", "function buildParking(cx = -52, cz = -178) {"),
    ("  const ground = new THREE.Mesh(new THREE.PlaneGeometry(190, 82), MAT.asphalt);",
     "  const ground = new THREE.Mesh(new THREE.PlaneGeometry(118, 56), MAT.asphalt);"),
    ("""  for (let i = 0; i < 26; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.7), lineMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(-84 + (i % 13) * 5.6, 0.07, -18 + Math.floor(i / 13) * 34);""",
     """  for (let i = 0; i < 18; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.7), lineMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(-46 + (i % 9) * 5.7, 0.07, -13 + Math.floor(i / 9) * 26);"""),
    ("""  for (let i = 0; i < 26; i++) {
    if (srnd() > 0.62) continue;""",
     """  for (let i = 0; i < 18; i++) {
    if (srnd() > 0.62) continue;"""),
    ("    cg.position.set(-84 + (i % 13) * 5.6, 0.05, -18 + Math.floor(i / 13) * 34);",
     "    cg.position.set(-46 + (i % 9) * 5.7, 0.05, -13 + Math.floor(i / 9) * 26);"),
    # ---------- 服务建筑 ----------
    ("  const cx = -168, cz = -78;", "  const cx = -60, cz = 112;"),
    ("  bg.rotation.y = 0.28;", "  bg.rotation.y = 0.16;"),
    ("  const cx2 = 12, cz2 = -168;", "  const cx2 = 54, cz2 = 104;"),
])

# ---------- 赛道附属 ----------
patch('p5_trackfx.js', [
    ("  for (let s = 6; s < 176; s += 11) {", "  for (let s = -44; s < 92; s += 10) {"),
    ("  const spots = [[-150, -150], [60, -152], [185, -60], [160, 95], [-40, 150], [-190, 40]];",
     "  const spots = [[-152, -112], [96, -112], [150, -14], [66, 108], [-56, 108], [-158, 26]];"),
    ("    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 22, 8), poleMat);",
     "    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 20, 8), poleMat);"),
    ("    pole.position.y = 11; pole.castShadow = true;", "    pole.position.y = 10; pole.castShadow = true;"),
    ("    arm.position.set(0.9, 21.6, 0); g.add(arm);", "    arm.position.set(0.9, 19.6, 0); g.add(arm);"),
    ("    head.position.set(2.2, 21.3, 0); g.add(head);", "    head.position.set(2.2, 19.3, 0); g.add(head);"),
])

# ---------- 相机 ----------
patch('p9_camera.js', [
    ("  center: new THREE.Vector3(0, 4, 0),\n  theta: 0.95, phi: 0.72, radius: 430,\n  pos: new THREE.Vector3(300, 210, 330),\n  look: new THREE.Vector3(0, 0, 0),\n  dPos: new THREE.Vector3(300, 210, 330),",
     "  center: new THREE.Vector3(0, 2, 0),\n  theta: 0.95, phi: 0.80, radius: 252,\n  pos: new THREE.Vector3(168, 152, 178),\n  look: new THREE.Vector3(0, 0, 0),\n  dPos: new THREE.Vector3(168, 152, 178),"),
    ("      CAM.center.set(0, 4, 0);\n      CAM.radius = 430; CAM.theta = 0.95; CAM.phi = 0.72;",
     "      CAM.center.set(0, 2, 0);\n      CAM.radius = 252; CAM.theta = 0.95; CAM.phi = 0.80;"),
    ("      const t = trackAt(c.s + 34);\n      const out = c.side > 0 ? -1 : 1;\n      const p = t.p.clone().addScaledVector(t.nrm, out * (t.hw + 16)).add(new THREE.Vector3(0, 6, 0));",
     "      const t = trackAt(c.s + 30);\n      const out = c.side > 0 ? -1 : 1;\n      const p = t.p.clone().addScaledVector(t.nrm, out * (t.hw + 13)).add(new THREE.Vector3(0, 5, 0));"),
    ("      const t = trackAt(96);\n      const p = t.p.clone().addScaledVector(t.nrm, -(t.hw + 12));",
     "      const t = trackAt(2);\n      const p = t.p.clone().addScaledVector(t.nrm, -(t.hw + 9));"),
    ("      return view([p.x, gy + 14.5, p.z], [l.x, l.y, l.z]);",
     "      return view([p.x, gy + 12.5, p.z], [l.x, l.y, l.z]);"),
    ("      const l = t.p.clone().addScaledVector(t.t, 48);",
     "      const l = t.p.clone().addScaledVector(t.t, 40);"),
    ("      const t = trackAt(74);\n      const p = t.p.clone().addScaledVector(t.nrm, t.hw + 30);",
     "      const t = trackAt(34);\n      const p = t.p.clone().addScaledVector(t.nrm, t.hw + 24);"),
    ("      return view([p.x, gy + 5.5, p.z], [l.x, l.y + 1, l.z]);",
     "      return view([p.x, gy + 4.6, p.z], [l.x, l.y + 1, l.z]);"),
    ("      const t = trackAt(640);\n      return view([330, 12, 190], [t.p.x, t.p.y + 3, t.p.z]);",
     "      const t = trackAt(600);\n      return view([224, 11, 116], [t.p.x, t.p.y + 3, t.p.z]);"),
    ("    CAM.lapS = (CAM.lapS + dt * 26) % TRACK.L;", "    CAM.lapS = (CAM.lapS + dt * 26) % TRACK.L;"),
])

# ---------- 主场景相机 ----------
patch('p3_scene.js', [
    ("  camera.position.set(210, 145, 235);", "  camera.position.set(168, 152, 178);"),
])

# ---------- UI 标签 ----------
patch('p10_ui.js', [
    ("  const gp = trackAt(96);\n  const gpos = gp.p.clone().addScaledVector(gp.nrm, -(gp.hw + 24));\n  const pp = trackAt(76);\n  const ppos = pp.p.clone().addScaledVector(pp.nrm, pp.hw + 20);\n  const ep = trackAt(20);\n  const epos = ep.p.clone().addScaledVector(ep.nrm, -(ep.hw + 34));",
     "  const gp = trackAt(2);\n  const gpos = gp.p.clone().addScaledVector(gp.nrm, -(gp.hw + 20));\n  const pp = trackAt(34);\n  const ppos = pp.p.clone().addScaledVector(pp.nrm, pp.hw + 18);\n  const ep = trackAt(20);\n  const epos = ep.p.clone().addScaledVector(ep.nrm, -(ep.hw + 34));"),
    ("      pos: new THREE.Vector3(-90, 0, -20), name: '围场 · 活动广场', en: 'PADDOCK · 8,000 m²', y: 4,",
     "      pos: new THREE.Vector3(-118, 0, -108), name: '围场 · 活动广场', en: 'PADDOCK · 8,000 m²', y: 4,"),
    ("      pos: new THREE.Vector3(-62, 0, -205), name: '主入口', en: 'MAIN ENTRANCE', y: 12,",
     "      pos: new THREE.Vector3(46, 0, -142), name: '主入口', en: 'MAIN ENTRANCE', y: 12,"),
    ("      pos: new THREE.Vector3(-168, 0, -78), name: '车辆维护车间', en: 'KART WORKSHOP', y: 7,",
     "      pos: new THREE.Vector3(-60, 0, 112), name: '车辆维护车间', en: 'KART WORKSHOP', y: 7,"),
    ("      pos: new THREE.Vector3(300, -2, 150), name: '王母湖', en: 'WANGMU LAKE', y: 1,",
     "      pos: new THREE.Vector3(214, -2, 110), name: '王母湖', en: 'WANGMU LAKE', y: 1,"),
    ("      pos: new THREE.Vector3(-470, 0, -330), name: '孝感奥体中心', en: 'XIAOGAN OLYMPIC CENTER', y: 24,",
     "      pos: new THREE.Vector3(-318, 0, -232), name: '孝感奥体中心', en: 'XIAOGAN OLYMPIC CENTER', y: 24,"),
    ("      pos: new THREE.Vector3(0, 0, 276), name: '城南大道', en: 'CHENGNAN AVENUE', y: 2,",
     "      pos: new THREE.Vector3(40, 0, 178), name: '城南大道', en: 'CHENGNAN AVENUE', y: 2,"),
    ("    { pos: new THREE.Vector3(t1.p.x, 0, t1.p.z), name: 'T1 弯 · 大半径右弯', en: 'TURN 01 — 90° RIGHT', y: 3,",
     "    { pos: new THREE.Vector3(t1.p.x, 0, t1.p.z), name: 'T1 弯 · 高速左弯', en: 'TURN 01', y: 3,"),
])

# -*- coding: utf-8 -*-
"""按真实赛道尺度重排场景参数"""
import io, os, re

B = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'parts')

def patch(fn, pairs):
    p = os.path.join(B, fn)
    s = io.open(p, encoding='utf-8').read()
    hit = 0
    for a, b in pairs:
        if a in s:
            s = s.replace(a, b)
            hit += 1
        else:
            print('  !! miss in', fn, ':', a[:60].replace('\n', ' '))
    io.open(p, 'w', encoding='utf-8').write(s)
    print(f'{fn}: {hit}/{len(pairs)}')

# ---------------- 地形 ----------------
patch('p4_track.js', [
    ("  h += far * (fbm(x * 0.0032 + 11, z * 0.0032 - 5, 3) - 0.5) * 22;",
     "  h += far * (fbm(x * 0.0032 + 11, z * 0.0032 - 5, 3) - 0.5) * 15;"),
    ("""  // 东侧王母湖盆
  const lakeEdge = smoothstep(255, 330, x) * (1 - smoothstep(430, 620, z));
  h = lerp(h, -6.5, smoothstep(300, 380, x) * (1 - smoothstep(470, 640, z)));
  // 西侧澴河
  const river = smoothstep(-300, -385, x) * (1 - smoothstep(-540, -700, x));
  h = lerp(h, -3.4, river * 0.9);
  // 南侧道路平台
  const road = smoothstep(215, 250, z) * (1 - smoothstep(300, 340, z));
  h = lerp(h, -0.9, road * 0.8);""",
     """  // 东侧王母湖盆
  h = lerp(h, -5.2, smoothstep(214, 300, x) * (1 - smoothstep(330, 480, z)));
  // 西侧澴河
  const river = smoothstep(-212, -270, x) * (1 - smoothstep(-420, -540, x));
  h = lerp(h, -3.0, river * 0.9);
  // 南侧道路平台
  const road = smoothstep(138, 162, z) * (1 - smoothstep(210, 246, z));
  h = lerp(h, -0.9, road * 0.8);"""),
    ("    if (x > 240 && y > -2.4 && y < 0.9) c.lerp(cSand, smoothstep(-2.4, 0.2, y) * .85);",
     "    if (x > 186 && y > -2.2 && y < 0.9) c.lerp(cSand, smoothstep(-2.2, 0.2, y) * .85);"),
    ("    if (y < -2.2) c.lerp(cWater, smoothstep(-2.2, -4.5, y));",
     "    if (y < -2.0) c.lerp(cWater, smoothstep(-2.0, -4.2, y));"),
])

# ---------------- 水面 / 湖岸 / 道路 / 城市 ----------------
patch('p7_env.js', [
    ("""  const lake = new THREE.Mesh(new THREE.PlaneGeometry(900, 1250, 1, 1), waterMat);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(700, -2.15, 100);""",
     """  const lake = new THREE.Mesh(new THREE.PlaneGeometry(760, 1100, 1, 1), waterMat);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(560, -2.05, 60);"""),
    ("""  const river = new THREE.Mesh(new THREE.PlaneGeometry(300, 1700, 1, 1), waterMat);
  river.rotation.x = -Math.PI / 2;
  river.position.set(-560, -1.9, 0);""",
     """  const river = new THREE.Mesh(new THREE.PlaneGeometry(280, 1300, 1, 1), waterMat);
  river.rotation.x = -Math.PI / 2;
  river.position.set(-395, -1.75, 0);"""),
    ("""  for (let i = 0; i < 90; i++) {
    const a = -0.55 + i * 0.021;
    const x = 300 + Math.cos(a) * 40 + 20;
    const z = 40 + Math.sin(a) * 420;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.12, 26), pathMat);
    seg.position.set(x, -0.55, z);""",
     """  for (let i = 0; i < 80; i++) {
    const a = -0.55 + i * 0.024;
    const x = 208 + Math.cos(a) * 26 + 10;
    const z = 20 + Math.sin(a) * 300;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.12, 24), pathMat);
    seg.position.set(x, -0.5, z);"""),
    ("""  const sandGeo = new THREE.PlaneGeometry(150, 320);""",
     """  const sandGeo = new THREE.PlaneGeometry(108, 230);"""),
    ("""  sand.rotation.z = 0.16;
  sand.position.set(292, -0.52, 250);""",
     """  sand.rotation.z = 0.16;
  sand.position.set(202, -0.48, 140);"""),
    ("  const cx = -545, cz = -415;", "  const cx = -318, cz = -232;"),
    ("  g.rotation.y = 0.42;", "  g.rotation.y = 0.36;"),
    ("""  const main = new THREE.Mesh(new THREE.PlaneGeometry(1500, 42), roadMat);
  main.rotation.x = -Math.PI / 2;
  main.position.set(0, -0.85, 276);""",
     """  const main = new THREE.Mesh(new THREE.PlaneGeometry(1100, 40), roadMat);
  main.rotation.x = -Math.PI / 2;
  main.position.set(40, -0.85, 178);"""),
    ("""  const cg = new THREE.Mesh(new THREE.PlaneGeometry(1500, 4.5), greenMat);
  cg.rotation.x = -Math.PI / 2;
  cg.position.set(0, -0.72, 276);""",
     """  const cg = new THREE.Mesh(new THREE.PlaneGeometry(1100, 4.5), greenMat);
  cg.rotation.x = -Math.PI / 2;
  cg.position.set(40, -0.72, 178);"""),
    ("""  for (const dz of [-24, 24]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1500, 6), walkMat);
    w.rotation.x = -Math.PI / 2;
    w.position.set(0, -0.8, 276 + dz);""",
     """  for (const dz of [-23, 23]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1100, 6), walkMat);
    w.rotation.x = -Math.PI / 2;
    w.position.set(40, -0.8, 178 + dz);"""),
    ("""  const east = new THREE.Mesh(new THREE.PlaneGeometry(30, 900), roadMat);
  east.rotation.x = -Math.PI / 2;
  east.position.set(246, -0.8, -120);""",
     """  const east = new THREE.Mesh(new THREE.PlaneGeometry(28, 620), roadMat);
  east.rotation.x = -Math.PI / 2;
  east.position.set(172, -0.8, -60);"""),
    ("""  for (const dz of [-10, 10]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(1500, 42), lm);
    l.rotation.x = -Math.PI / 2;
    l.position.set(0, -0.78, 276 + dz);""",
     """  for (const dz of [-10, 10]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(1100, 40), lm);
    l.rotation.x = -Math.PI / 2;
    l.position.set(40, -0.78, 178 + dz);"""),
    ("""  for (const dx of [-7, 7]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(30, 900), lm);
    l.rotation.x = -Math.PI / 2;
    l.rotation.z = Math.PI / 2;
    l.position.set(246 + dx, -0.78, -120);""",
     """  for (const dx of [-7, 7]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(28, 620), lm);
    l.rotation.x = -Math.PI / 2;
    l.rotation.z = Math.PI / 2;
    l.position.set(172 + dx, -0.78, -60);"""),
    ("""  const nL = 24;
  const lp = instanced(lampGeo, lampMat, nL), la = instanced(armGeo, lampMat, nL);
  for (let i = 0; i < nL; i++) {
    const x = -560 + i * 48;
    setInst(lp, i, x, 3.9, 276 - 22, 0);
    setInst(la, i, x, 8.3, 276 - 21.4, 0);
  }""",
     """  const nL = 22;
  const lp = instanced(lampGeo, lampMat, nL), la = instanced(armGeo, lampMat, nL);
  for (let i = 0; i < nL; i++) {
    const x = -440 + i * 44;
    setInst(lp, i, x, 3.9, 178 - 21, 0);
    setInst(la, i, x, 8.3, 178 - 20.4, 0);
  }"""),
    ("""    if (zone < 0.45) { x = sr(-1100, 1100); z = sr(-1250, -620); }
    else if (zone < 0.75) { x = sr(520, 1350); z = sr(-600, 700); }
    else { x = sr(-1350, -700); z = sr(-500, 700); }
    const d = Math.hypot(x, z);
    if (d < 560) continue;""",
     """    if (zone < 0.45) { x = sr(-900, 900); z = sr(-980, -480); }
    else if (zone < 0.75) { x = sr(420, 1100); z = sr(-460, 560); }
    else { x = sr(-1050, -560); z = sr(-400, 560); }
    const d = Math.hypot(x, z);
    if (d < 470) continue;"""),
    ("""      const a = sr(0, TAU), rad = sr(230, 420);
      x = Math.cos(a) * rad; z = Math.sin(a) * rad;
    } else if (r < 0.52) {   // 湖岸
      x = sr(250, 340); z = sr(-260, 480);
    } else if (r < 0.68) {   // 内场
      x = sr(-190, 190); z = sr(-115, 120);
    } else if (r < 0.84) {   // 道路绿化
      x = sr(-700, 700); z = sr(292, 320) ; 
    } else {
      x = sr(-700, 700); z = sr(-260, -180);
    }""",
     """      const a = sr(0, TAU), rad = sr(175, 330);
      x = Math.cos(a) * rad; z = Math.sin(a) * rad;
    } else if (r < 0.52) {   // 湖岸
      x = sr(186, 236); z = sr(-180, 330);
    } else if (r < 0.68) {   // 内场
      x = sr(-145, 145); z = sr(-90, 95);
    } else if (r < 0.84) {   // 道路绿化
      x = sr(-520, 520); z = sr(198, 224);
    } else {
      x = sr(-520, 520); z = sr(-215, -160);
    }"""),
    ("    const dt = distToTrack(x, z);\n    if (dt < 16) continue;",
     "    const dt = distToTrack(x, z);\n    if (dt < 13) continue;"),
    ("""    const x = sr(160, 260), z = sr(-190, -40);
    if (distToTrack(x, z) < 14) continue;""",
     """    const x = sr(128, 196), z = sr(-150, -60);
    if (distToTrack(x, z) < 12) continue;"""),
    ("  const X0 = -250, X1 = 268, Z0 = -178, Z1 = 170;",
     "  const X0 = -186, X1 = 202, Z0 = -196, Z1 = 128;"),
    ("  for (let x = X0; x <= X1; x += 6) { pts.push([x, Z0]); pts.push([x, Z1]); }",
     "  for (let x = X0; x <= X1; x += 6) { pts.push([x, Z0]); pts.push([x, Z1]); }"),
    ("    setInst(m, i, p[0], terrainHeight(p[0], p[1]) + 1.2, p[1]);",
     "    setInst(m, i, p[0], terrainHeight(p[0], p[1]) + 1.2, p[1]);"),
])

/* ============================================================
   建筑：看台 / 控制塔 / 维修区 / 围场 / 入口 / 停车
   ============================================================ */
const MAT = {};
function initMats() {
  const conc = tex(concreteTexture('#9a9b9d'), 4, 2, 4);
  MAT.concrete = new THREE.MeshStandardMaterial({ map: conc, roughness: 0.9, metalness: 0.02 });
  MAT.concreteDark = new THREE.MeshStandardMaterial({ color: 0x6b6d70, roughness: 0.92 });
  MAT.white = new THREE.MeshStandardMaterial({ color: 0xe9eaec, roughness: 0.72 });
  MAT.offwhite = new THREE.MeshStandardMaterial({ color: 0xd6d8da, roughness: 0.8 });
  MAT.metal = new THREE.MeshStandardMaterial({ color: 0x8f959c, roughness: 0.45, metalness: 0.72 });
  MAT.darkMetal = new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.55, metalness: 0.6 });
  MAT.red = new THREE.MeshStandardMaterial({ color: 0xc42a1b, roughness: 0.68 });
  MAT.seat = new THREE.MeshStandardMaterial({ color: 0xb02a20, roughness: 0.85 });
  MAT.glass = new THREE.MeshStandardMaterial({
    color: 0x2e4a63, roughness: 0.08, metalness: 0.55,
    transparent: true, opacity: 0.72, envMapIntensity: 1.4
  });
  MAT.roof = new THREE.MeshStandardMaterial({ color: 0xd2d6da, roughness: 0.55, metalness: 0.25 });
  MAT.roofDark = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.62, metalness: 0.3 });
  MAT.asphalt = new THREE.MeshStandardMaterial({ color: 0x5f636a, roughness: 0.96 });
  MAT.roll = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.7, metalness: 0.35 });
  MAT.canvasWhite = new THREE.MeshStandardMaterial({ color: 0xf0f1f2, roughness: 0.85, side: THREE.DoubleSide });
}

function addBox(g, w, h, d, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.rotation.y = ry;
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  return m;
}

/* ---- 主看台 ---- */
function buildGrandstand() {
  const s0 = 2;
  const t = trackAt(s0);
  const a = Math.atan2(t.t.z, t.t.x);
  const p = t.p.clone().addScaledVector(t.nrm, -(t.hw + 18));
  const gy = terrainHeight(p.x, p.z);
  const g = new THREE.Group();
  g.position.set(p.x, gy, p.z);
  g.rotation.y = -a;

  const LEN = 86, ROWS = 12, DEPTH = 1.6, RISE = 0.66;
  // 台阶
  for (let i = 0; i < ROWS; i++) {
    const z = 9.2 - i * DEPTH;
    const y = i * RISE;
    const step = addBox(g, LEN, RISE, DEPTH, MAT.concrete, 0, y, z);
    // 座椅面
    const seat = new THREE.Mesh(new THREE.BoxGeometry(LEN - 1.2, 0.14, DEPTH * 0.72), MAT.seat);
    seat.position.set(0, y + RISE + 0.04, z);
    seat.castShadow = true; seat.receiveShadow = true;
    g.add(seat);
  }
  // 后墙
  const backY = ROWS * RISE;
  addBox(g, LEN, 1.1, 0.5, MAT.concreteDark, 0, backY, 9.2 - ROWS * DEPTH - 0.2);

  // 顶棚
  const roofY = backY + 4.6;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(LEN + 4, 0.42, 15.5), MAT.roofDark);
  roof.position.set(0, roofY, 2.0);
  roof.rotation.x = -0.055;
  roof.castShadow = true; roof.receiveShadow = true;
  g.add(roof);
  // 檐口
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(LEN + 4, 0.75, 0.35), MAT.red);
  fascia.position.set(0, roofY - 0.3, 9.9);
  g.add(fascia);
  // 立柱
  for (let i = -2; i <= 2; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, roofY, 8), MAT.metal);
    col.position.set(i * 20, roofY / 2, 9.6);
    col.castShadow = true;
    g.add(col);
    // 斜撑
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 4.4), MAT.metal);
    br.position.set(i * 20, roofY - 1.2, 7.6);
    br.rotation.x = 0.72;
    g.add(br);
  }
  // 顶部品牌条
  const { c, x: gg } = cv(1024, 128);
  gg.fillStyle = '#0d0f13'; gg.fillRect(0, 0, 1024, 128);
  gg.fillStyle = '#ff3b1f'; gg.fillRect(0, 0, 1024, 9);
  gg.fillStyle = '#ffffff'; gg.font = 'bold 62px sans-serif'; gg.textAlign = 'center';
  gg.fillText('HIKC 湖北国际卡丁车赛车场', 512, 88);
  const signMat = new THREE.MeshStandardMaterial({ map: tex(c, 1, 1, 8), roughness: 0.7, side: THREE.DoubleSide });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 4, 2.1), signMat);
  sign.position.set(0, roofY - 1.9, 9.92);
  g.add(sign);

  scene.add(g);
  return g;
}

/* ---- 赛事控制塔 ---- */
function buildControlTower() {
  const s0 = 88;
  const t = trackAt(s0);
  const a = Math.atan2(t.t.z, t.t.x);
  const p = t.p.clone().addScaledVector(t.nrm, (t.hw + 58));
  const gy = terrainHeight(p.x, p.z);
  const g = new THREE.Group();
  g.position.set(p.x, gy, p.z);
  g.rotation.y = -a;

  addBox(g, 11, 8.5, 9, MAT.concrete, 0, 0, 0);
  // 玻璃层
  addBox(g, 11.6, 3.2, 9.6, MAT.glass, 0, 8.5, 0);
  // 挑檐
  const cap = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.5, 11.4), MAT.roof);
  cap.position.set(0, 12.1, 0); cap.castShadow = true;
  g.add(cap);
  // 栏杆
  addBox(g, 13.4, 0.7, 0.1, MAT.metal, 0, 11.7, 5.6);
  // 通讯天线
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 7, 6), MAT.metal);
  mast.position.set(3.4, 15.6, -2); mast.castShadow = true;
  g.add(mast);
  for (let i = 0; i < 3; i++) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.07, 10), MAT.metal);
    d.position.set(3.4, 13.6 + i * 1.5, -2);
    g.add(d);
  }
  scene.add(g);
  return g;
}

/* ---- 维修区（Pit Building） ---- */
function buildPitBuilding() {
  const s0 = 34;
  const t = trackAt(s0);
  const a = Math.atan2(t.t.z, t.t.x);
  const p = t.p.clone().addScaledVector(t.nrm, (t.hw + 49));
  const gy = terrainHeight(p.x, p.z);
  const g = new THREE.Group();
  g.position.set(p.x, gy, p.z);
  g.rotation.y = -a;

  const LEN = 86;
  // 主体
  addBox(g, LEN, 5.4, 13, MAT.concrete, 0, 0, 0);
  // 二层观景平台 / 售票区（朝向赛道一侧敞开）
  addBox(g, LEN, 0.35, 12, MAT.offwhite, 0, 5.4, 0.5);
  for (let i = 0; i < 9; i++) {
    const s = addBox(g, LEN / 9 - 0.5, 0.42, 0.8, MAT.seat, -LEN / 2 + 3.6 + i * (LEN / 9), 5.75, 5.2);
  }
  // 观景台玻璃栏板
  const rail = new THREE.Mesh(new THREE.BoxGeometry(LEN, 1.0, 0.12), MAT.glass);
  rail.position.set(0, 6.55, 5.9);
  g.add(rail);
  // 二层顶棚前柱
  for (let i = -2; i <= 2; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.6, 6), MAT.metal);
    c.position.set(i * (LEN / 4.6), 6.9, 5.8);
    g.add(c);
  }
  // 屋顶
  const roof = new THREE.Mesh(new THREE.BoxGeometry(LEN + 2.4, 0.36, 14.4), MAT.roof);
  roof.position.set(0, 8.2, 0); roof.castShadow = true; roof.receiveShadow = true;
  g.add(roof);
  // 车库门（朝赛道，-z）
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.6, metalness: 0.4 });
  for (let i = 0; i < 8; i++) {
    const x = -LEN / 2 + 5.5 + i * 10.7;
    const d = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.0), doorMat);
    d.position.set(x, 2.15, 6.56);
    d.rotation.y = 0;
    g.add(d);
    // 门框
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.5, 0.18), MAT.darkMetal);
    fr.position.set(x - 3.8, 2.25, 6.5); g.add(fr);
    const fr2 = fr.clone(); fr2.position.x = x + 3.8; g.add(fr2);
    // 车队号
    const { c: nc, x: ng } = cv(64, 64);
    ng.fillStyle = '#0d0f13'; ng.fillRect(0, 0, 64, 64);
    ng.fillStyle = '#ffb300'; ng.font = 'bold 34px sans-serif'; ng.textAlign = 'center';
    ng.fillText(String(i + 1).padStart(2, '0'), 32, 44);
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0),
      new THREE.MeshStandardMaterial({ map: tex(nc, 1, 1, 4), roughness: .8 }));
    nm.position.set(x - 3.0, 4.9, 6.55); nm.rotation.y = 0;
    g.add(nm);
  }
  // 二层窗带
  const wmat = new THREE.MeshStandardMaterial({
    map: tex(windowTexture(15, 2, 0.35), 3, 1, 4), roughness: 0.25, metalness: 0.3
  });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(LEN - 2, 2.0), wmat);
  win.position.set(0, 6.7, 4.9); win.rotation.y = 0;
  g.add(win);
  // 顶部广告
  const { c: bc, x: bg } = cv(1024, 96);
  bg.fillStyle = '#12161c'; bg.fillRect(0, 0, 1024, 96);
  bg.fillStyle = '#0a84ff'; bg.font = 'bold 46px sans-serif'; bg.textAlign = 'center';
  bg.fillText('PIT  ·  PADDOCK  ·  MYLAPS TIMING', 512, 64);
  const bn = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 1.1),
    new THREE.MeshStandardMaterial({ map: tex(bc, 1, 1, 8), roughness: .75 }));
  bn.position.set(0, 8.4, 7.2); bn.rotation.y = 0;
  g.add(bn);

  scene.add(g);
  return g;
}

/* ---- 围场 / 帐篷 / 集装箱 ---- */
function buildPaddock() {
  // 沿赛道生成条带，跟随中心线弯曲，内缘直抵路肩
  const S0 = -24, S1 = 66, STEP = 2;
  const pos = [], idx = [];
  const nrmOut = 41;
  let vi = 0;
  for (let s = S0; s <= S1; s += STEP) {
    const t = trackAt(s);
    const A = t.p.clone().addScaledVector(t.nrm, t.hw + 0.12);
    const B = t.p.clone().addScaledVector(t.nrm, nrmOut);
    pos.push(A.x, A.y + 0.07, A.z, B.x, B.y + 0.07, B.z);
    if (vi > 0) idx.push(vi - 2, vi, vi - 1, vi - 1, vi, vi + 1);
    vi += 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const padMat = new THREE.MeshStandardMaterial({ color: 0x676b72, roughness: 0.93, side: THREE.DoubleSide });
  const pad = new THREE.Mesh(geo, padMat);
  pad.receiveShadow = true;
  scene.add(pad);

  const f = trackFrame(22, 24);
  const g = new THREE.Group();
  g.position.set(f.p.x, f.p.y + 0.07, f.p.z);
  g.rotation.y = f.ry;

  // 帐篷
  for (let i = 0; i < 4; i++) {
    const tx = -24 + (i % 2) * 48, tz = -5 + Math.floor(i / 2) * 11;
    const tg = new THREE.Group();
    tg.position.set(tx, 0, tz);
    for (const [dx, dz] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) {
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.1, 6), MAT.metal);
      pl.position.set(dx, 1.55, dz); pl.castShadow = true;
      tg.add(pl);
    }
    const top = new THREE.Mesh(new THREE.ConeGeometry(6.0, 1.4, 4), MAT.canvasWhite);
    top.position.y = 3.8; top.rotation.y = Math.PI / 4;
    top.castShadow = true;
    tg.add(top);
    const roofFlat = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 7), MAT.canvasWhite);
    roofFlat.position.y = 3.05; tg.add(roofFlat);
    g.add(tg);
  }

  // 集装箱办公
  const cols = [0x1f4e79, 0xb03a2e, 0x2f6b4f, 0xd39b26];
  const conBoxes = [[34, 9, 0], [34, 6, 2], [-36, 9, 1]];
  conBoxes.forEach(([x, z, ci], i) => {
    const m = new THREE.MeshStandardMaterial({ color: cols[ci], roughness: 0.78, metalness: 0.15 });
    addBox(g, 6.1, 2.62, 2.44, m, x, 0, z, i % 2 ? Math.PI / 2 : 0);
  });

  scene.add(g);
  return g;
}

/* ---- 入口大门 ---- */
function buildEntrance() {
  // 主入口设在主干道西侧，一条支路接入场地
  const g = new THREE.Group();
  g.position.set(147, -0.45, 180);
  g.rotation.y = Math.PI / 2;               // 门架横跨东西向支路

  for (const dx of [-11, 11]) {
    addBox(g, 2.2, 9.5, 2.2, MAT.concrete, dx, 0, 0);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(25, 3.0, 2.6), MAT.darkMetal);
  beam.position.set(0, 9.5, 0);
  beam.castShadow = true;
  g.add(beam);

  const { c, x: gg } = cv(1024, 160);
  gg.fillStyle = '#0d1015'; gg.fillRect(0, 0, 1024, 160);
  gg.fillStyle = '#ff3b1f'; gg.fillRect(0, 0, 1024, 12);
  gg.fillStyle = '#ffffff'; gg.font = 'bold 78px sans-serif'; gg.textAlign = 'center';
  gg.fillText('HIKC', 512, 92);
  gg.fillStyle = '#ffb300'; gg.font = 'bold 30px sans-serif';
  gg.fillText('HUBEI INTERNATIONAL KARTING CIRCUIT', 512, 136);
  const s1 = new THREE.Mesh(new THREE.PlaneGeometry(24, 3.7),
    new THREE.MeshStandardMaterial({ map: tex(c, 1, 1, 8), roughness: .7, side: THREE.DoubleSide }));
  s1.position.set(0, 9.5, 1.35); g.add(s1);
  const s2 = s1.clone(); s2.position.z = -1.35; s2.rotation.y = Math.PI; g.add(s2);

  // 售票亭（绝对坐标，紧贴支路两侧，不继承门架旋转）
  for (const zz of [172.2, 187.8]) {
    const tg = new THREE.Group();
    tg.position.set(150, -0.45, zz);
    addBox(tg, 3.2, 2.8, 3.0, MAT.offwhite, 0, 0, 0);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.1), MAT.glass);
    w.position.set(-1.53, 1.7, 0);
    w.rotation.y = -Math.PI / 2;
    tg.add(w);
    scene.add(tg);
  }
  scene.add(g);
  return g;
}

/* ---- 停车场 ---- */
function buildParking() {
  const g = new THREE.Group();
  g.position.set(52, -0.5, 180);
  g.rotation.y = 0;

  const W = 96, D = 54;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, D), MAT.asphalt);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  g.add(ground);

  const rimMat = new THREE.MeshStandardMaterial({ color: 0x6d6a60, roughness: 0.96 });
  for (const [w, d, x, z] of [[W + 6, 4, 0, -D / 2 - 1], [W + 6, 4, 0, D / 2 + 1],
                              [4, D + 4, -W / 2 - 1, 0], [4, D + 4, W / 2 + 1, 0]]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), rimMat);
    rim.position.set(x, 0.02, z);
    rim.receiveShadow = true;
    g.add(rim);
  }

  const BAY_W = 3.0, BAY_D = 5.4, COLS = 14, ROWS = 3;
  const x0 = -(COLS - 1) * BAY_W / 2;
  const z0 = -(ROWS - 1) * 11;

  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xe6eaee, transparent: true, opacity: 0.72, depthWrite: false
  });
  const vLine = new THREE.PlaneGeometry(0.13, BAY_D);
  const hLine = new THREE.PlaneGeometry(BAY_W * (COLS - 1) + 0.2, 0.1);
  for (let r = 0; r < ROWS; r++) {
    const cz = z0 + r * 11;
    for (let c = 0; c <= COLS; c++) {
      const v = new THREE.Mesh(vLine, lineMat);
      v.rotation.x = -Math.PI / 2;
      v.position.set(x0 + (c - 0.5) * BAY_W, 0.035, cz);
      g.add(v);
    }
    for (const dz of [-BAY_D / 2, BAY_D / 2]) {
      const h = new THREE.Mesh(hLine, lineMat);
      h.rotation.x = -Math.PI / 2;
      h.position.set(0, 0.035, cz + dz);
      g.add(h);
    }
  }

  const carBody = new THREE.BoxGeometry(1.78, 0.72, 4.3);
  const carTop = new THREE.BoxGeometry(1.62, 0.5, 2.2);
  const carCols = [0x2a2d33, 0xb8bcc2, 0x8e1f26, 0x24406e, 0xe8e9eb, 0x3f4a3c];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (srnd() < 0.35) continue;
      const cx = x0 + c * BAY_W + sr(-0.16, 0.16);
      const cz = z0 + r * 11 + sr(-0.25, 0.25);
      const col = carCols[Math.floor(srnd() * carCols.length)];
      const body = new THREE.Mesh(carBody, new THREE.MeshStandardMaterial({
        color: col, roughness: 0.42, metalness: 0.35
      }));
      body.position.set(cx, 0.36, cz);
      body.rotation.y = sr(-0.03, 0.03);
      body.castShadow = true; body.receiveShadow = true;
      g.add(body);
      const top = new THREE.Mesh(carTop, new THREE.MeshStandardMaterial({
        color: 0x1c2230, roughness: 0.22, metalness: 0.5
      }));
      top.position.set(cx, 0.92, cz + 0.15);
      top.rotation.y = body.rotation.y;
      g.add(top);
    }
  }

  scene.add(g);
}

/* ---- 卡丁车库 + 附属 ---- */
function buildServiceBuildings() {
  const g = new THREE.Group();
  // 卡丁车存放/维护车间
  const cx = -34, cz = 136;
  const gy = terrainHeight(cx, cz);
  const bg = new THREE.Group();
  bg.position.set(cx, gy, cz);
  bg.rotation.y = 0.16;
  addBox(bg, 46, 5.2, 22, MAT.concreteDark, 0, 0, 0);
  addBox(bg, 47, 0.4, 23.4, MAT.roof, 0, 5.2, 0);
  const wm = new THREE.MeshStandardMaterial({
    map: tex(windowTexture(16, 2, 0.2), 2, 1, 4), roughness: 0.3, metalness: 0.35
  });
  const wz = new THREE.Mesh(new THREE.PlaneGeometry(42, 1.9), wm);
  wz.position.set(0, 3.6, 11.05); bg.add(wz);
  // 三樘卷帘门
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.62, metalness: 0.35 });
  for (const dx of [-13, 0, 13]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 3.2), doorMat);
    d.position.set(dx, 1.6, 11.06); bg.add(d);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(7.9, 0.22, 0.18), MAT.offwhite);
    fr.position.set(dx, 3.28, 11.1); bg.add(fr);
  }
  bg.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(bg);

  // 卫生间 / 小卖部
  const cx2 = 26, cz2 = 134;
  const gy2 = terrainHeight(cx2, cz2);
  const sg = new THREE.Group();
  sg.position.set(cx2, gy2, cz2);
  addBox(sg, 16, 3.4, 8, MAT.offwhite, 0, 0, 0);
  addBox(sg, 16.8, 0.3, 8.8, MAT.roof, 0, 3.4, 0);
  addBox(sg, 5, 2.4, 6, MAT.concreteDark, 10, 0, 0);
  // 玻璃窗带 + 入口门
  const gw = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 1.5), MAT.glass);
  gw.position.set(-1.6, 1.85, 4.03); sg.add(gw);
  const gm = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.3),
    new THREE.MeshStandardMaterial({ color: 0x33404d, roughness: 0.4, metalness: 0.4 }));
  gm.position.set(5.2, 1.15, 4.03); sg.add(gm);
  // 门上雨棚
  addBox(sg, 3.0, 0.16, 1.6, MAT.roof, 5.2, 2.42, 4.8);
  sg.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(sg);

  scene.add(g);
  return g;
}

/* ---- 卡丁车：使用真模（OBJ 量化内联，Z-up 已转 Y-up，车长 1.8m） ---- */
function decodeKartMesh(d) {
  const pbin = atob(d.p);
  const n = pbin.length >> 1;
  const pos = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = pbin.charCodeAt(i * 2) | (pbin.charCodeAt(i * 2 + 1) << 8);
    if (v & 0x8000) v -= 0x10000;
    pos[i] = v / 10000;
  }
  const ibin = atob(d.i);
  const m = ibin.length >> 1;
  const idx = new Uint16Array(m);
  for (let i = 0; i < m; i++) idx[i] = ibin.charCodeAt(i * 2) | (ibin.charCodeAt(i * 2 + 1) << 8);
  // 转成非索引几何：每个三角形独立顶点，法线按面重算，避免共享顶点法线导致的穿透观感
  const g0 = new THREE.BufferGeometry();
  g0.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g0.setIndex(new THREE.BufferAttribute(idx, 1));
  const g = g0.toNonIndexed();
  g0.dispose();
  g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}

/* 几何合并（无 BufferGeometryUtils） */
function mergeGeoList(list) {
  const pos = [], nor = [], idx = [];
  let off = 0;
  for (const it of list) {
    const g = it.g.clone();
    if (it.m) g.applyMatrix4(it.m);
    if (!g.attributes.normal) g.computeVertexNormals();
    const pa = g.attributes.position.array, na = g.attributes.normal.array;
    for (let i = 0; i < pa.length; i++) { pos.push(pa[i]); nor.push(na[i]); }
    const ia = g.index ? g.index.array : null;
    if (ia) for (let i = 0; i < ia.length; i++) idx.push(ia[i] + off);
    else for (let i = 0; i < pa.length / 3; i++) idx.push(i + off);
    off += pa.length / 3;
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

function buildKarts() {
  const N = 18;
  const F = trackFrame(22, 6 + 23);
  // 水泥区表面高度（地形已被压到 -0.18，不能再用 terrainHeight）
  const gy = trackAt(22).p.y + 0.09;

  const gBody = decodeKartMesh(KART_MESH.body);
  const gWheel = decodeKartMesh(KART_MESH.wheels);

  const mBody = new THREE.InstancedMesh(gBody, new THREE.MeshLambertMaterial({
    color: 0xb4bac2, side: THREE.DoubleSide
  }), N);
  const mWheel = new THREE.InstancedMesh(gWheel, new THREE.MeshStandardMaterial({
    color: 0x1c1e22, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide
  }), N);
  mBody.castShadow = false; mBody.receiveShadow = true;
  mWheel.castShadow = false; mWheel.receiveShadow = true;

  for (let i = 0; i < N; i++) {
    const col = i % 6, row = Math.floor(i / 6);
    const lx = -13 + col * 5.2 + (row % 2) * 0.9;
    const lz = -7.5 + row * 7.2;
    const wp = localToWorld(F, lx, lz);
    const y = gy + 0.02;
    setInst(mBody, i, wp.x, y, wp.z, F.ry + Math.PI);
    setInst(mWheel, i, wp.x, y, wp.z, F.ry + Math.PI);
  }
  mBody.instanceMatrix.needsUpdate = true;
  mWheel.instanceMatrix.needsUpdate = true;
  scene.add(mBody, mWheel);

  buildRunnerKart(gBody, gWheel);
}

/* ---- 涂装件：车身条纹 + 车头号码牌 ---- */
function makeKartLivery() {
  const g = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xd0202f, roughness: 0.36, metalness: 0.28 });
  const blk = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.55, metalness: 0.25 });

  // 车头号码牌
  const { c, x: gg } = cv(128, 128);
  gg.fillStyle = '#f2f5f8'; gg.fillRect(0, 0, 128, 128);
  gg.strokeStyle = '#d0202f'; gg.lineWidth = 8; gg.strokeRect(4, 4, 120, 120);
  gg.fillStyle = '#12294f'; gg.font = 'bold 86px sans-serif';
  gg.textAlign = 'center'; gg.textBaseline = 'middle';
  gg.fillText('33', 64, 70);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34),
    new THREE.MeshStandardMaterial({ map: tex(c, 1, 1, 8), roughness: 0.5 }));
  plate.position.set(0.895, 0.235, 0);
  plate.rotation.y = Math.PI / 2;
  g.add(plate);
  return g;
}

/* ---- 赛道上行驶的卡丁车 ---- */
let runnerKart = null, runnerS = 0;
const RUNNER = {
  pos: new THREE.Vector3(),
  dir: new THREE.Vector3(1, 0, 0),
  prevDir: new THREE.Vector3(1, 0, 0),
  speed: 17,
  roll: 0,
  ready: false
};
function buildRunnerKart(gBody, gWheel) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(gBody, new THREE.MeshLambertMaterial({
    color: 0xb4bac2, side: THREE.DoubleSide
  }));
  const wheel = new THREE.Mesh(gWheel, new THREE.MeshStandardMaterial({
    color: 0x1c1e22, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide
  }));
  g.add(body, wheel, makeKartLivery());
  g.position.y = 0.02;
  scene.add(g);
  runnerKart = g;

  let last = performance.now();
  (function step(now) {
    const dt = Math.min((now - last) / 1000, 0.06);
    last = now;
    runnerS = (runnerS + dt * RUNNER.speed) % TRACK.L;
    const t = trackAt(runnerS);
    runnerKart.position.set(t.p.x, t.p.y + 0.02, t.p.z);
    runnerKart.rotation.y = -Math.atan2(t.t.z, t.t.x) + Math.PI;   // 模型车头朝 -x，补 180°

    // 供跟车视角使用：位置 / 前进方向 / 过弯侧倾
    RUNNER.prevDir.copy(RUNNER.dir);
    RUNNER.dir.set(t.t.x, 0, t.t.z).normalize();
    RUNNER.pos.copy(runnerKart.position);
    const crossY = RUNNER.prevDir.x * RUNNER.dir.z - RUNNER.prevDir.z * RUNNER.dir.x;
    RUNNER.roll += ((-crossY * 26) - RUNNER.roll) * Math.min(dt * 6, 1);
    RUNNER.roll = clamp(RUNNER.roll, -0.30, 0.30);
    RUNNER.ready = true;

    requestAnimationFrame(step);
  })(last);
}

/* ---- 蓝白隔离墩（赛道内侧，照片同款） ---- */
function buildBarriers() {
  const geo = new THREE.BoxGeometry(1.25, 0.62, 0.42);
  const blue = new THREE.MeshStandardMaterial({ color: 0x1b46c4, roughness: 0.62 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.62 });
  const list = [];
  for (let s = -36; s < 96; s += 1.34) {
    if (s > 6 && s < 46) continue;    // 维修区出口：隔离墩在此断开
    const t = trackAt(s);
    const p = t.p.clone().addScaledVector(t.nrm, (t.hw + 1.5));
    list.push([p.x, terrainHeight(p.x, p.z), p.z, -Math.atan2(t.t.z, t.t.x)]);
  }
  const nb = Math.ceil(list.length / 2), nw = Math.floor(list.length / 2);
  const mb = instanced(geo, blue, nb), mw = instanced(geo, white, nw);
  let a = 0, b = 0;
  list.forEach((p, i) => {
    if (i % 2 === 0) setInst(mb, a++, p[0], p[1] + 0.31, p[2], p[3]);
    else setInst(mw, b++, p[0], p[1] + 0.31, p[2], p[3]);
  });
  mb.instanceMatrix.needsUpdate = true; mw.instanceMatrix.needsUpdate = true;
  scene.add(mb, mw);
}

/* ---- 计时塔（蓝色，照片左侧） ---- */
function buildTimingTower() {
  const s0 = -54;
  const t = trackAt(s0);
  const a = Math.atan2(t.t.z, t.t.x);
  const p = t.p.clone().addScaledVector(t.nrm, (t.hw + 34));
  const gy = terrainHeight(p.x, p.z);
  const g = new THREE.Group();
  g.position.set(p.x, gy, p.z);
  g.rotation.y = -a;
  const blue = new THREE.MeshStandardMaterial({ color: 0x16307a, roughness: 0.5, metalness: 0.35 });

  addBox(g, 4.2, 9.5, 3.4, blue, 0, 0, 0);
  // 顶部斜面屏
  const scr = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.0, 0.25), MAT.darkMetal);
  scr.position.set(0, 7.4, -1.9);
  scr.rotation.x = 0.22;
  g.add(scr);
  const { c, x: gg } = cv(512, 256);
  gg.fillStyle = '#0a0c10'; gg.fillRect(0, 0, 512, 256);
  gg.fillStyle = '#ff3b1f'; gg.font = 'bold 96px monospace'; gg.textAlign = 'center';
  gg.fillText('00:00.000', 256, 118);
  gg.fillStyle = '#3ddc84'; gg.font = 'bold 44px monospace';
  gg.fillText('LAP  1 / 20', 256, 190);
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.75),
    new THREE.MeshBasicMaterial({ map: tex(c, 1, 1, 4) }));
  sm.position.set(0, 7.45, -2.04);
  sm.rotation.x = 0.22;
  g.add(sm);
  scene.add(g);
}

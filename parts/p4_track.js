/* ============================================================
   赛道几何 + 地形
   ============================================================ */
const TRACK = { P: [], T: [], N: [], HW: [], N_: 0, L: 0, s: [] };

function buildTrack() {
  const D = TRACK_DATA;
  const n = D.pts.length;
  TRACK.N_ = n; TRACK.L = D.length;
  for (let i = 0; i < n; i++) {
    TRACK.P.push(new THREE.Vector3(D.pts[i][0], D.pts[i][1], D.pts[i][2]));
    TRACK.HW.push(D.hw[i]);
    TRACK.s.push(i * D.step);
  }
  for (let i = 0; i < n; i++) {
    const a = TRACK.P[(i - 1 + n) % n], b = TRACK.P[(i + 1) % n];
    const t = new THREE.Vector3().subVectors(b, a); t.y = 0; t.normalize();
    TRACK.T.push(t);
    TRACK.N.push(new THREE.Vector3(t.z, 0, -t.x));   // 右法线（坐标 z 轴指向北）
  }
}

/* 按弧长取赛道位置 */
function trackAt(s) {
  const L = TRACK.L, n = TRACK.N_;
  s = ((s % L) + L) % L;
  const f = s / (L / n);
  const i = Math.floor(f) % n, j = (i + 1) % n, t = f - Math.floor(f);
  return {
    p: new THREE.Vector3().lerpVectors(TRACK.P[i], TRACK.P[j], t),
    t: TRACK.T[i].clone().lerp(TRACK.T[j], t).normalize(),
    nrm: TRACK.N[i].clone().lerp(TRACK.N[j], t).normalize(),
    hw: lerp(TRACK.HW[i], TRACK.HW[j], t),
    i
  };
}

/* 让三角面朝上 */
function faceUp(geo) {
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  if (nrm.getY(0) < 0) {
    const idx = geo.index;
    if (idx) {
      const a = idx.array;
      for (let i = 0; i < a.length; i += 3) { const t = a[i]; a[i] = a[i + 2]; a[i + 2] = t; }
      idx.needsUpdate = true;
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function stripGeometry(getVerts, closeLoop = true) {
  const n = TRACK.N_;
  const pos = [], uv = [], idx = [];
  let vi = 0;
  for (let i = 0; i <= (closeLoop ? n : n - 1); i++) {
    const k = i % n;
    const v = getVerts(k, i);        // [{x,y,z,u,v}, {x,y,z,u,v}]
    pos.push(v[0].x, v[0].y, v[0].z, v[1].x, v[1].y, v[1].z);
    uv.push(v[0].u, v[0].v, v[1].u, v[1].v);
    if (i < (closeLoop ? n : n - 1)) {
      const a = vi, b = vi + 1, c = vi + 2, d = vi + 3;
      idx.push(a, c, b, b, c, d);
    }
    vi += 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return faceUp(g);
}

/* ---------- 地形高度场 ---------- */
let _lowPts = null;
function terrainHeight(x, z) {
  if (!_lowPts) {
    _lowPts = [];
    for (let i = 0; i < TRACK.N_; i += 8)
      _lowPts.push([TRACK.P[i].x, TRACK.P[i].y, TRACK.P[i].z]);
  }
  let sw = 0, sy = 0;
  for (let k = 0; k < _lowPts.length; k++) {
    const p = _lowPts[k];
    const dx = x - p[0], dz = z - p[2];
    const d2 = dx * dx + dz * dz;
    if (d2 > 260 * 260) continue;
    const w = 1 / (d2 + 240);
    sw += w; sy += w * p[1];
  }
  let h = sw > 0 ? sy / sw : 0;
  // 远处自然起伏
  const far = smoothstep(180, 620, Math.hypot(x * 0.9, z));
  h += far * (fbm(x * 0.0032 + 11, z * 0.0032 - 5, 3) - 0.5) * 15;
  // 东侧王母湖盆
  const shoreWob = (fbm(x * 0.0038 + 3.1, z * 0.0038 - 1.7, 3) - 0.5) * 150;
  const lakeMask = smoothstep(196, 276, -x + shoreWob)
                 * (1 - smoothstep(700, 800, -x + shoreWob))
                 * (1 - smoothstep(-60, 160, z + shoreWob * 0.5))
                 * (1 - smoothstep(520, 660, -z + shoreWob * 0.4));
  h = lerp(h, -6.0, lakeMask);
  if (lakeMask > 0.97) h = -6.0;
  // 西侧澴河
  const river = smoothstep(-212, -270, x) * (1 - smoothstep(-420, -540, x));
  h = lerp(h, -3.0, river * 0.9);
  // 南侧道路平台
  const road = smoothstep(138, 162, z) * (1 - smoothstep(210, 246, z));
  h = lerp(h, -0.9, road * 0.8);
  // 南侧城南大道走廊（z≈332）
  const southRd = (1 - smoothstep(34, 78, Math.abs(z - 332))) * (1 - smoothstep(400, 470, Math.abs(x + 160)));
  h = lerp(h, -0.95, southRd);
  // 东侧主干道走廊
  const corridor = (1 - smoothstep(22, 34, Math.abs(x - 168))) * (1 - smoothstep(300, 380, Math.abs(z - 10)));
  h = lerp(h, -0.95, corridor);
  // 入口支路走廊（自主干道向西接入场地）
  const spurCorr = (1 - smoothstep(18, 32, Math.abs(z - 180))) * (1 - smoothstep(90, 112, Math.abs(x - 138)));
  h = lerp(h, -0.95, spurCorr);
  // 维修区水泥地平台（P 房前）
  const pudZ = smoothstep(72, 79, z) * (1 - smoothstep(108, 118, z));
  const pudX = smoothstep(-92, -82, x) * (1 - smoothstep(44, 54, x));
  h = lerp(h, -0.18, pudZ * pudX);
  // 停车场平台
  const parkCorr = (1 - smoothstep(30, 44, Math.abs(z - 180))) * (1 - smoothstep(50, 64, Math.abs(x - 52)));
  h = lerp(h, -0.98, parkCorr);
  return h;
}

function buildTerrain() {
  const SIZE = 1500, SEG = 300;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  const cGrass = new THREE.Color(0x4a6b39);
  const cGrass2 = new THREE.Color(0x5c7d45);
  const cDry = new THREE.Color(0x7a8654);
  const cSand = new THREE.Color(0xa89a76);
  const cMud = new THREE.Color(0x4a4a3c);
  const cWater = new THREE.Color(0x2a3a3a);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    let y = terrainHeight(x, z);
    // 靠近赛道压平并略降，形成路肩过渡
    const tp = nearestTrackPoint(x, z);
    if (tp && tp.d < 26) {
      y = lerp(y, tp.y - 0.35, smoothstep(26, tp.hw + 3.5, tp.d));
    }
    pos.setY(i, y);

    const n1 = fbm(x * 0.011, z * 0.011, 2);
    const n2 = vnoise(x * 0.05, z * 0.05);
    let c = cGrass.clone().lerp(cGrass2, n1);
    c.lerp(cDry, smoothstep(0.62, 0.95, n1) * 0.55);
    c.offsetHSL(0, 0, (n2 - 0.5) * 0.045);
    if (y < -0.4) c.lerp(cMud, smoothstep(-0.4, -2.4, y));
    if (y < -2.95) c.lerp(cWater, smoothstep(-2.95, -4.6, y));
    // 湖岸沙滩

    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const gt = tex(grassTexture('#ffffff', 18), 90, 90, 4);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, map: gt, roughness: 0.97, metalness: 0.0
  });
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  m.name = 'terrain';
  scene.add(m);
  return m;
}

/* 赛道点空间索引（网格哈希，O(1) 最近点查询） */
const TGRID = { cell: 28, map: null };
function buildTrackGrid() {
  TGRID.map = new Map();
  for (let i = 0; i < TRACK.N_; i++) {
    const p = TRACK.P[i];
    const gx = Math.floor(p.x / TGRID.cell), gz = Math.floor(p.z / TGRID.cell);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const k = (gx + a) + ',' + (gz + b);
      let arr = TGRID.map.get(k);
      if (!arr) { arr = []; TGRID.map.set(k, arr); }
      arr.push(i);
    }
  }
}

function nearestTrackPoint(x, z) {
  if (!TGRID.map) buildTrackGrid();
  const gx = Math.floor(x / TGRID.cell), gz = Math.floor(z / TGRID.cell);
  const arr = TGRID.map.get(gx + ',' + gz);
  let best = -1, bd = Infinity;
  if (arr) {
    for (let k = 0; k < arr.length; k++) {
      const i = arr[k], p = TRACK.P[i];
      const d = (x - p.x) ** 2 + (z - p.z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
  }
  if (best < 0) {
    for (let i = 0; i < TRACK.N_; i += 3) {
      const p = TRACK.P[i];
      const d = (x - p.x) ** 2 + (z - p.z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
  }
  if (best < 0) return null;
  return { y: TRACK.P[best].y, hw: TRACK.HW[best], i: best, d: Math.sqrt(bd) };
}
function distToTrack(x, z) {
  const t = nearestTrackPoint(x, z);
  return t ? t.d : 9999;
}

/* ============================================================
   赛道面层
   ============================================================ */
let roadMat, wetLayer, kerbMesh, kerbMeshes = [];
let _roadTex = null;

function buildRoad() {
  const am = asphaltMaps();
  _roadTex = am;
  const map = tex(am.map, 1, 1, 16);
  const rough = new THREE.CanvasTexture(am.rough);
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping;

  roadMat = new THREE.MeshStandardMaterial({
    map, roughnessMap: rough, roughness: 0.94, metalness: 0.0,
    color: 0xffffff, envMapIntensity: 0.32
  });
  roadMat.userData.baseMap = map;
  roadMat.userData.baseRough = rough;

  const geo = stripGeometry((k, i) => {
    const p = TRACK.P[k], nn = TRACK.N[k], hw = TRACK.HW[k];
    const v = (i * 2.0) / 18.0;
    const L = p.clone().addScaledVector(nn, -hw);
    const R = p.clone().addScaledVector(nn, hw);
    return [{ x: L.x, y: L.y + 0.06, z: L.z, u: 0, v }, { x: R.x, y: R.y + 0.06, z: R.z, u: 1, v }];
  });
  const road = new THREE.Mesh(geo, roadMat);
  road.receiveShadow = true;
  road.name = 'road';
  scene.add(road);

  // 水膜（湿滑反光层）
  const wgeo = geo.clone();
  wetLayer = new THREE.Mesh(wgeo, new THREE.MeshStandardMaterial({
    color: 0x0d1418, roughness: 0.045, metalness: 0.85,
    transparent: true, opacity: 0, envMapIntensity: 1.35,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2
  }));
  wetLayer.position.y = 0.012;
  wetLayer.renderOrder = 2;
  scene.add(wetLayer);

  // 路缘石（弯道外侧红白）
  buildKerbs();
  buildRunoff();
  buildStartLine();
}

function buildKerbs() {
  // 蓝白相间路肩：只在弯道段，两侧铺（贴地条带）
  const { c: kc, x: kg } = cv(256, 64);
  kg.fillStyle = '#1b46c4'; kg.fillRect(0, 0, 128, 64);
  kg.fillStyle = '#eef1f4'; kg.fillRect(128, 0, 128, 64);
  const kt = tex(kc, 1, 1, 4);
  const kMat = new THREE.MeshStandardMaterial({ map: kt, roughness: 0.66, metalness: 0.0 });
  kerbMeshes = [];
  const corners = TRACK_DATA.corners;

  for (const c of corners) {
    const span = clamp(c.r * 0.68, 11, 19);
    for (const side of [-1, 1]) {
      const pos = [], uv = [], idx = [];
      let vi = 0;
      const step = 1.2, n = Math.ceil((span * 2) / step);
      for (let k = 0; k <= n; k++) {
        const s = c.s - span + k * step;
        const t = trackAt(s);
        const inn = t.hw * 0.985, out = t.hw + 1.35;
        const A = t.p.clone().addScaledVector(t.nrm, side * inn);
        const B = t.p.clone().addScaledVector(t.nrm, side * out);
        const gyB = terrainHeight(B.x, B.z);
        const by = Math.min(B.y + 0.02, Math.max(gyB + 0.03, B.y - 0.26));
        pos.push(A.x, A.y + 0.05, A.z, B.x, by, B.z);
        const u = s / 2.2;
        uv.push(u, 0, u, 1);
        if (k < n) idx.push(vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3);
        vi += 2;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      faceUp(g);
      const m = new THREE.Mesh(g, kMat);
      m.receiveShadow = true;
      scene.add(m);
      kerbMeshes.push(m);
    }
  }
  kerbMesh = kerbMeshes[0] || null;
}

function buildRunoff() {
  const geo = stripGeometry((k) => {
    const p = TRACK.P[k], nn = TRACK.N[k], hw = TRACK.HW[k];
    const y = p.y - 0.06;
    const A = p.clone().addScaledVector(nn, -hw - 0.85);
    const B = p.clone().addScaledVector(nn, -hw - 3.4);
    const C = p.clone().addScaledVector(nn, hw + 0.85);
    const D = p.clone().addScaledVector(nn, hw + 3.4);
    return [
      { x: A.x, y: y - 0.02, z: A.z, u: 0, v: 0 },
      { x: B.x, y: y - 0.12, z: B.z, u: 1, v: 0 }
    ];
  });
  const m1 = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x6a6f5e, roughness: 0.97 }));
  m1.receiveShadow = true;
  scene.add(m1);
  const geo2 = stripGeometry((k) => {
    const p = TRACK.P[k], nn = TRACK.N[k], hw = TRACK.HW[k];
    const y = p.y - 0.06;
    const A = p.clone().addScaledVector(nn, hw + 0.85);
    const B = p.clone().addScaledVector(nn, hw + 3.4);
    return [
      { x: A.x, y: y - 0.02, z: A.z, u: 0, v: 0 },
      { x: B.x, y: y - 0.12, z: B.z, u: 1, v: 0 }
    ];
  });
  const m2 = new THREE.Mesh(geo2, new THREE.MeshStandardMaterial({ color: 0x6a6f5e, roughness: 0.97 }));
  m2.receiveShadow = true;
  scene.add(m2);
}

function buildStartLine() {
  const t = trackAt(0);
  const a = Math.atan2(t.t.z, t.t.x);

  // 起跑线（棋盘格）：用 Group 承载朝向，避免欧拉角组合把面板立起来
  const { c, x: g } = cv(320, 48);
  const cellW = 20, cellH = 24;
  for (let y = 0; y < 2; y++) for (let x = 0; x < 16; x++) {
    g.fillStyle = (x + y) % 2 ? '#141414' : '#f2f2f2';
    g.fillRect(x * cellW, y * cellH, cellW, cellH);
  }
  const w = t.hw * 2;
  const grp = new THREE.Group();
  grp.position.copy(t.p);
  grp.position.y += 0.075;
  grp.rotation.y = -a + Math.PI / 2;   // 让 12m 的宽度横跨赛道
  const line = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.9),
    new THREE.MeshStandardMaterial({ map: tex(c, 1, 1, 8), roughness: 0.6,
      polygonOffset: true, polygonOffsetFactor: -4 }));
  line.rotation.x = -Math.PI / 2;
  grp.add(line);
  scene.add(grp);

  // 发车格：左右两组「梯子」——每组两条纵向线 + 组内横向分格，中间留空
  const stepS = 8;
  const gridMat = new THREE.MeshStandardMaterial({
    color: 0xe8ebee, roughness: 0.78, transparent: true, opacity: 0.9,
    polygonOffset: true, polygonOffsetFactor: -4
  });
  const groups = [
    { lat: -t.hw * 0.50, half: t.hw * 0.19, sStart: -1.5 },   // 首格贴起跑线
    { lat:  t.hw * 0.50, half: t.hw * 0.19, sStart: -5.5 }    // 右侧错开半格
  ];

  for (const g of groups) {
    // 该组的两条纵向线
    const s0 = g.sStart, s1 = g.sStart - 84;
    for (const edge of [-1, 1]) {
      const lat = g.lat + edge * g.half;
      const pos = [], idx = [];
      let vi = 0;
      const n = Math.ceil((s0 - s1) / 2);
      for (let k = 0; k <= n; k++) {
        const ss = s0 - k * 2;
        const tt = trackAt(ss);
        const A = tt.p.clone().addScaledVector(tt.nrm, lat - 0.065);
        const B = tt.p.clone().addScaledVector(tt.nrm, lat + 0.065);
        pos.push(A.x, A.y + 0.075, A.z, B.x, B.y + 0.075, B.z);
        if (k < n) idx.push(vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3);
        vi += 2;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      faceUp(geo);
      scene.add(new THREE.Mesh(geo, gridMat));
    }

    // 组内横向分格线
    const crossW = g.half * 2 + 0.16;
    for (let k = 0; k <= 10; k++) {
      const ss = g.sStart - k * stepS;
      const tt = trackAt(ss);
      const gg = new THREE.Group();
      gg.position.copy(tt.p).addScaledVector(tt.nrm, g.lat);
      gg.position.y += 0.075;
      gg.rotation.y = -Math.atan2(tt.t.z, tt.t.x) + Math.PI / 2;
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(crossW, 0.13), gridMat);
      bar.rotation.x = -Math.PI / 2;
      gg.add(bar);
      scene.add(gg);
    }
  }
}
/* 沿赛道的局部坐标系：p 为原点，lx 沿切线，lz 沿外侧法线 */
function trackFrame(s, off) {
  const t = trackAt(s);
  const p = t.p.clone().addScaledVector(t.nrm, off);
  const a = Math.atan2(t.t.z, t.t.x);
  return { p, a, ry: -a, ca: Math.cos(a), sa: Math.sin(a), hw: t.hw, t };
}
function localToWorld(f, lx, lz) {
  return new THREE.Vector3(
    f.p.x + lx * f.ca + lz * f.sa,
    f.p.y,
    f.p.z + lx * f.sa - lz * f.ca
  );
}

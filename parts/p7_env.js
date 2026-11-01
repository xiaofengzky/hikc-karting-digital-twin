/* ============================================================
   周边环境：王母湖 / 澴河 / 奥体中心 / 城市 / 道路 / 植被
   ============================================================ */
let waterMat, waterUni;

const WATER_VS = `
varying vec3 vW;
void main(){
  vec4 wp = modelMatrix * vec4(position,1.0);
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const WATER_FS = `
precision highp float;
varying vec3 vW;
uniform float uTime, uWind;
uniform vec3 uSunDir, uSkyCol, uDeepCol, uSunCol, uFogCol;
uniform float uFogD;

void main(){
  vec3 V = normalize(cameraPosition - vW);
  vec2 p = vW.xz * 0.055;
  float t = uTime * 0.32;
  vec2 g = vec2(0.0);
  g += vec2(cos(p.x*1.25 + t*1.6), cos(p.y*1.05 - t*1.35)) * 0.52;
  g += vec2(cos((p.x+p.y*0.7)*2.05 - t*2.1), cos((p.y-p.x*0.8)*2.5 + t*2.4)) * 0.27;
  g += vec2(cos(p.x*4.9 + t*3.3), cos(p.y*4.4 - t*3.0)) * 0.11;
  g += vec2(cos((p.x*1.7-p.y*2.3)*7.1 + t*4.6), cos((p.y*1.9+p.x*1.4)*6.4 - t*4.1)) * 0.05;
  g *= uWind * 0.9;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));

  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.2);
  vec3 col = mix(uDeepCol, uSkyCol, clamp(fres*1.45 + 0.12, 0.0, 1.0));
  col += uSkyCol * max(dot(N, uSunDir), 0.0) * 0.22;

  float spec = pow(max(dot(reflect(-V, N), uSunDir), 0.0), 220.0);
  col += uSunCol * spec * 2.6;
  float glint = pow(max(dot(reflect(-V, N), uSunDir), 0.0), 18.0);
  col += uSunCol * glint * 0.12;

  float dist = length(cameraPosition - vW);
  float fg = 1.0 - exp(-pow(uFogD * dist, 2.0));
  col = mix(col, uFogCol, clamp(fg, 0.0, 1.0));

  gl_FragColor = vec4(col, 1.0);
}`;

function buildWater() {
  waterUni = {
    uTime: { value: 0 }, uWind: { value: 0.55 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSkyCol: { value: new THREE.Color(0xa8c8e0) },
    uDeepCol: { value: new THREE.Color(0x1c4d55) },
    uSunCol: { value: new THREE.Color(0xfff2dd) },
    uFogCol: { value: new THREE.Color(0xbfd2e0) },
    uFogD: { value: 0.001 }
  };
  waterMat = new THREE.ShaderMaterial({
    uniforms: waterUni, vertexShader: WATER_VS, fragmentShader: WATER_FS
  });

  // 王母湖
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(640, 900, 1, 1), waterMat);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(-430, -3.05, -230);
  scene.add(lake);

  // 澴河
  const river = new THREE.Mesh(new THREE.PlaneGeometry(220, 1200, 1, 1), waterMat);
  river.rotation.x = -Math.PI / 2;
  river.position.set(-508, -2.7, 0);
  scene.add(river);
}

/* ---- 环湖绿道 + 沙滩 ---- */
function buildLakefront() {
  const pathMat = new THREE.MeshStandardMaterial({ color: 0x8f8574, roughness: 0.94 });
  const g = new THREE.Group();
  for (let i = 0; i < 80; i++) {
    const a = -0.55 + i * 0.024;
    const x = -(208 + Math.cos(a) * 26 + 10);
    const z = 20 + Math.sin(a) * 300;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.12, 24), pathMat);
    seg.position.set(x, terrainHeight(x, z) + 0.06, z);
    seg.rotation.y = -a + 0.4;
    seg.receiveShadow = true;
    g.add(seg);
  }
  scene.add(g);

  // （沙滩移除：平面边缘会浮出地形，改由地形顶点色处理）
}

/* ---- 奥体中心主体育场：拱顶 + 钢桁架立面 ---- */
function makeTrussTexture() {
  const { c, x: g } = cv(512, 256);
  g.fillStyle = '#16222e'; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = 'rgba(198,214,230,.50)';
  g.lineWidth = 2.6;
  for (let i = -8; i < 26; i++) {
    g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 120, 256); g.stroke();
    g.beginPath(); g.moveTo(i * 32, 256); g.lineTo(i * 32 + 120, 0); g.stroke();
  }
  g.strokeStyle = 'rgba(210,224,238,.75)';
  g.lineWidth = 5;
  for (const y of [0, 88, 176, 252]) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke();
  }
  g.fillStyle = 'rgba(70,110,150,.20)';
  g.fillRect(0, 0, 512, 256);
  return c;
}

function buildStadium() {
  const cx = 402, cz = -96;
  const gy = terrainHeight(cx, cz) - 0.6;
  const g = new THREE.Group();
  g.position.set(cx, gy, cz);
  g.rotation.y = 0.32;

  const RX = 152, RZ = 106, H = 32;

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xe6eaee, roughness: 0.42, metalness: 0.3, side: THREE.DoubleSide
  });
  const wallMat = new THREE.MeshStandardMaterial({
    map: tex(makeTrussTexture(), 6, 1, 8),
    color: 0xdde3e9, roughness: 0.5, metalness: 0.35, side: THREE.DoubleSide
  });
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xf2f5f7, roughness: 0.35, metalness: 0.45
  });

  // 立面：椭圆筒 + 桁架
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, H, 84, 1, true), wallMat);
  wall.scale.set(RX, 1, RZ);
  wall.position.y = H / 2;
  wall.castShadow = true; wall.receiveShadow = true;
  g.add(wall);

  // 拱顶：沿长轴拱起的筒形壳（对照实景：两端低、中间高）
  const NX = 56, NZ = 18, AMP = 30;
  const pos = [], idx = [], uv = [];
  for (let i = 0; i <= NX; i++) {
    const u = i / NX;
    const x = -RX + u * 2 * RX;
    const arch = AMP * Math.cos(u * Math.PI - Math.PI / 2);   // 端部=0，中间=AMP
    for (let j = 0; j <= NZ; j++) {
      const v = j / NZ;
      const z = -RZ + v * 2 * RZ;
      const side = 1 - Math.pow((v - 0.5) * 2, 2) * 0.16;     // 横向轻微收弧
      pos.push(x, H + arch * side, z);
      uv.push(u * 8, v * 2);
    }
  }
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NZ; j++) {
      const a = i * (NZ + 1) + j, b = a + 1, c = a + NZ + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const domeGeo = new THREE.BufferGeometry();
  domeGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  domeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  domeGeo.setIndex(idx);
  domeGeo.computeVertexNormals();
  const dome = new THREE.Mesh(domeGeo, roofMat);
  dome.castShadow = true; dome.receiveShadow = true;
  g.add(dome);

  // 屋檐白环
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RX * 1.005, 2.2, 8, 84), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.scale.set(1, RZ / RX, 1);
  ring.position.y = H;
  ring.castShadow = true;
  g.add(ring);

  // 底部基座
  const base = new THREE.Mesh(new THREE.CylinderGeometry(RX * 1.06, RX * 1.1, 12, 56),
    new THREE.MeshStandardMaterial({ color: 0xb9bdc2, roughness: 0.9 }));
  base.scale.set(1, 1, RZ / RX * 1.02);
  base.position.y = -6;
  base.receiveShadow = true;
  g.add(base);

  // 内场草皮
  const pitch = new THREE.Mesh(new THREE.CircleGeometry(1, 48),
    new THREE.MeshStandardMaterial({ color: 0x4d8a45, roughness: 0.96 }));
  pitch.scale.set(RX * 0.62, RZ * 0.62, 1);
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.y = 1.2;
  pitch.receiveShadow = true;
  g.add(pitch);

  scene.add(g);
  return g;
}

/* ---- 城南大道 ---- */
function buildRoadNet() {
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3b3e44, roughness: 0.94 });
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x777a74, roughness: 0.95 });
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x40632f, roughness: 0.96 });

  // 城南大道（东西向，南侧）
  const main = new THREE.Mesh(new THREE.PlaneGeometry(720, 40), roadMat);
  main.rotation.x = -Math.PI / 2;
  main.position.set(-160, -0.85, 332);
  main.receiveShadow = true;
  scene.add(main);

  // 中央绿化带
  const cg = new THREE.Mesh(new THREE.PlaneGeometry(720, 4.5), greenMat);
  cg.rotation.x = -Math.PI / 2;
  cg.position.set(-160, -0.78, 332);
  cg.receiveShadow = true;
  scene.add(cg);

  // 人行道
  for (const dz of [-20.6, 20.6]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(720, 6), walkMat);
    w.rotation.x = -Math.PI / 2;
    w.position.set(-160, -0.86, 332 + dz);
    scene.add(w);
  }

  // 场地北侧东西向道路（连接体育中心停车场）
  const north = new THREE.Mesh(new THREE.PlaneGeometry(330, 26), roadMat);
  north.rotation.x = -Math.PI / 2;
  north.position.set(-20, -0.82, -196);
  north.receiveShadow = true;
  scene.add(north);

  // 奥体东路：赛场与奥体中心之间的主干道（双向四车道 + 中央绿化带）
  const roadW = 30;
  // canvas 横躺：x 沿路长(u)，y 沿路宽(v)，与 PlaneGeometry(长, 宽) 的 uv 对齐
  const { c: rc, x: rg } = cv(512, 128);
  rg.fillStyle = '#43464c'; rg.fillRect(0, 0, 512, 128);
  rg.fillStyle = '#eef1f4';
  rg.fillRect(0, 4, 512, 7);            // 左边线
  rg.fillRect(0, 117, 512, 7);          // 右边线
  rg.fillRect(0, 60, 512, 3);           // 中央双黄线（会被绿化带部分遮挡）
  rg.fillRect(0, 65, 512, 3);
  const roadTex = tex(rc, 16, 1, 8);
  const mainMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.92 });
  main.material = mainMat;   // 纹理在下方才定义，这里补上（避免 TDZ 报错）
  const eastG = new THREE.Group();
  eastG.position.set(168, -0.86, 10);
  eastG.rotation.y = Math.PI / 2;
  const east = new THREE.Mesh(new THREE.PlaneGeometry(700, roadW), mainMat);
  east.rotation.x = -Math.PI / 2;
  east.receiveShadow = true;
  eastG.add(east);
  scene.add(eastG);

  // 人行道 + 路缘
  const kerbMat = new THREE.MeshStandardMaterial({ color: 0x9ba0a6, roughness: 0.9 });
  for (const dx of [-roadW / 2 - 2.2, roadW / 2 + 2.2]) {
    const wk = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 700), walkMat);
    wk.rotation.x = -Math.PI / 2;
    wk.position.set(168 + dx, -0.52, 10);
    wk.receiveShadow = true;
    scene.add(wk);
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.24, 700), kerbMat);
    kb.position.set(168 + dx + (dx > 0 ? -2.1 : 2.1), -0.5, 10);
    kb.receiveShadow = true;
    scene.add(kb);
  }

  // 接入场地的支路（自大路向西）
  // 支路专用纹理：双车道 + 中央虚线（避免复用主干道的双黄线）
  const { c: sc, x: sg } = cv(256, 128);
  sg.fillStyle = '#43464c'; sg.fillRect(0, 0, 256, 128);
  sg.fillStyle = 'rgba(240,242,244,.88)';
  for (let x = 0; x < 256; x += 72) sg.fillRect(x, 61, 34, 5);   // 中央虚线
  const spurTex = tex(sc, 3, 1, 8);
  const spur = new THREE.Mesh(new THREE.PlaneGeometry(46, 9.5),
    new THREE.MeshStandardMaterial({ map: spurTex, roughness: 0.92 }));
  spur.rotation.x = -Math.PI / 2;
  spur.position.set(129, -0.48, 180);
  spur.receiveShadow = true;
  scene.add(spur);

  // 支路末端与停车场衔接段（纯沥青，盖掉纹理白线，形成开口）
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(14, 11.0),
    new THREE.MeshStandardMaterial({ color: 0x484b52, roughness: 0.93 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(108, -0.47, 180);
  apron.receiveShadow = true;
  scene.add(apron);

  // 支路人行道 + 路缘石（与主干道同构）
  for (const dz of [-6.9, 6.9]) {
    const wk2 = new THREE.Mesh(new THREE.PlaneGeometry(52, 3.4), walkMat);
    wk2.rotation.x = -Math.PI / 2;
    wk2.position.set(122, -0.50, 180 + dz);
    wk2.receiveShadow = true;
    scene.add(wk2);
    const kb2 = new THREE.Mesh(new THREE.BoxGeometry(52, 0.22, 0.32), kerbMat);
    kb2.position.set(122, -0.50, 180 + dz + (dz > 0 ? -1.85 : 1.85));
    kb2.receiveShadow = true;
    scene.add(kb2);
  }

  // 中央绿化带（在支路路口断开）
  for (const [zc, zl] of [[-165, 350], [285, 190]]) {
    const med = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.42, zl), greenMat);
    med.position.set(168, -0.66, zc);
    med.receiveShadow = true;
    scene.add(med);
  }
  const med = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.42, 1), greenMat);
  med.visible = false;
  med.receiveShadow = true;
  scene.add(med);
  // 绿化带灌木
  const bushGeo = new THREE.IcosahedronGeometry(0.85, 0);
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x3d6b34, roughness: 0.95, flatShading: true });
  const bush = instanced(bushGeo, bushMat, 90, false);
  let bk = 0;
  for (let i = 0; i < 90; i++) {
    const bz = 10 - 340 + i * 7.6;
    if (Math.abs(bz - 180) < 12) { continue; }
    setInst(bush, bk++, 168 + sr(-0.5, 0.5), -0.45, bz, sr(0, 3.14), sr(.8, 1.25), sr(.8, 1.2), sr(.8, 1.25));
  }
  bush.count = bk;
  bush.instanceMatrix.needsUpdate = true;
  scene.add(bush);

  // 车道虚线：几何体逐段铺设（纹理方式在多轮调整后始终显示不出）
  const dashGeo = new THREE.PlaneGeometry(3.2, 0.17);
  const dashMat = new THREE.MeshBasicMaterial({
    color: 0xeef2f6, transparent: true, opacity: 0.92, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3
  });
  const nDash = Math.ceil(720 / 9) * 2 + Math.ceil(700 / 9) * 2 + 8;
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, nDash);
  let di = 0;
  // 城南大道（东西向）
  for (let x = -516; x < 196; x += 9) {
    for (const dz of [-10.6, 10.6]) {
      if (di >= nDash) break;
      setInst(dashes, di++, x, -0.79, 332 + dz, 0, 1, 1, 1, -Math.PI / 2, 0);
    }
  }
  // 奥体东路（南北向）
  for (let z = -336; z < 348; z += 9) {
    for (const dx of [-7.6, 7.6]) {
      if (di >= nDash) break;
      setInst(dashes, di++, 168 + dx, -0.80, z, 0, 1, 1, 1, -Math.PI / 2, Math.PI / 2);
    }
  }
  dashes.count = di;
  dashes.instanceMatrix.needsUpdate = true;
  scene.add(dashes);
  // 路灯
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.6 });
  const lampGeo = new THREE.CylinderGeometry(0.11, 0.15, 9, 6);
  const armGeo = new THREE.BoxGeometry(2.4, 0.13, 0.13);
  const nL = 22;
  const lp = instanced(lampGeo, lampMat, nL), la = instanced(armGeo, lampMat, nL);
  for (let i = 0; i < nL; i++) {
    const x = -440 + i * 44;
    setInst(lp, i, x, 3.9, 332 - 21, 0);
    setInst(la, i, x, 8.3, 332 - 20.4, 0);
  }
  scene.add(lp, la);
}

/* ---- 城市天际线 ---- */
function buildCity() {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const N = 150;
  const mat = new THREE.MeshStandardMaterial({
    color: 0x8d949e, roughness: 0.92, metalness: 0.05
  });
  const m = instanced(geo, mat, N, false);
  let k = 0;
  for (let i = 0; i < N; i++) {
    let x, z;
    const zone = srnd();
    if (zone < 0.55) { x = sr(-690, 690); z = sr(-1280, -830); }
    else if (zone < 1.01) { x = sr(600, 700); z = sr(-660, 660); }
    else { x = sr(-1120, -880); z = sr(-620, 760); }
    const d = Math.hypot(x, z);
    if (d < 820) continue;
    const h = sr(9, 30) * (1 + srnd() * 0.55);
    const w = sr(16, 34), dd = sr(16, 34);
    const gy = terrainHeight(x, z);
    setInst(m, k, x, gy + h / 2, z, sr(0, 1.57), w, h, dd);
    k++;
  }
  m.count = k;
  m.instanceMatrix.needsUpdate = true;
  scene.add(m);
}

/* ---- 植被 ---- */
let treeTrunks, treeCrowns;
function buildTrees() {
  const N = 760;
  const trunkGeo = new THREE.CylinderGeometry(0.17, 0.28, 3.4, 5);
  const crownGeo = new THREE.IcosahedronGeometry(2.0, 1);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 0.95 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x3e7033, roughness: 0.92, flatShading: true });

  treeTrunks = instanced(trunkGeo, trunkMat, N);
  treeCrowns = instanced(crownGeo, crownMat, N);
  const col = new THREE.Color();

  let k = 0;
  let guard = 0;
  while (k < N && guard < N * 30) {
    guard++;
    let x, z;
    const r = srnd();
    if (r < 0.30) {          // 场地外圈
      const a = sr(0, TAU), rad = sr(175, 330);
      x = Math.cos(a) * rad; z = Math.sin(a) * rad;
    } else if (r < 0.52) {   // 湖岸
      x = sr(-236, -186); z = sr(-180, 330);
    } else if (r < 0.68) {   // 内场（稀疏）
      x = sr(-145, 145); z = sr(-90, 95);
    } else if (r < 0.84) {   // 道路绿化
      x = sr(-520, 520); z = sr(198, 224);
    } else {
      x = sr(-520, 520); z = sr(-215, -160);
    }
    // 让开主干道与入口支路
    if (Math.abs(x - 168) < 22) continue;
    if (Math.abs(z - 180) < 30 && x > 0 && x < 185) continue;   // 支路 + 停车场
    if (x > -3 && x < 108 && z > 150 && z < 210) continue;
    const dt = distToTrack(x, z);
    if (dt < (r < 0.68 && r >= 0.52 ? 26 : 14)) continue;
    const gy = terrainHeight(x, z);
    if (gy < -1.2) continue;
    const sc = sr(0.55, 1.5);
    setInst(treeTrunks, k, x, gy + 1.7 * sc, z, sr(0, TAU), sc, sc, sc);
    setInst(treeCrowns, k, x, gy + (3.4 + 1.5) * sc, z, sr(0, TAU), sc * sr(.85, 1.25), sc * sr(.9, 1.3), sc * sr(.85, 1.25));
    col.setHSL(0.255 + sr(-0.035, 0.055), 0.30 + sr(-0.08, 0.13), 0.26 + sr(0, 0.12));
    treeCrowns.setColorAt(k, col);
    k++;
  }
  treeTrunks.count = k; treeCrowns.count = k;
  treeTrunks.instanceMatrix.needsUpdate = true;
  treeCrowns.instanceMatrix.needsUpdate = true;
  if (treeCrowns.instanceColor) treeCrowns.instanceColor.needsUpdate = true;
  scene.add(treeTrunks, treeCrowns);
}

/* 粉黛乱子草花海（奥体公园特色） */
function buildFlowerField() {
  const N = 1400;
  const geo = new THREE.ConeGeometry(0.42, 1.15, 3, 1, true);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xd98fc0, roughness: 0.9, side: THREE.DoubleSide, flatShading: true
  });
  const m = instanced(geo, mat, N, false);
  const col = new THREE.Color();
  let k = 0, guard = 0;
  while (k < N && guard < N * 12) {
    guard++;
    const x = sr(-196, -128), z = sr(-150, -60);
    if (distToTrack(x, z) < 12) continue;
    const gy = terrainHeight(x, z);
    if (gy < -0.6) continue;
    const s = sr(0.7, 1.5);
    setInst(m, k, x, gy + 0.55 * s, z, sr(0, TAU), s, s, s);
    col.setHSL(0.92 + sr(-0.04, 0.04), 0.42 + sr(-0.1, 0.12), 0.66 + sr(-0.08, 0.10));
    m.setColorAt(k, col);
    k++;
  }
  m.count = k;
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  scene.add(m);
}

/* 场地围栏 */
function buildPerimeter() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x3c4148, roughness: 0.85, metalness: 0.2 });
  const geo = new THREE.BoxGeometry(0.09, 1.9, 0.09);
  const pts = [];
  const X0 = -186, X1 = 202, Z0 = -196, Z1 = 186;
  for (let x = X0; x <= X1; x += 13) {
    if (Math.abs(x - 122) < 30) continue;          // 让开进场通道
    pts.push([x, Z0]); pts.push([x, Z1]);
  }
  for (let z = Z0; z <= Z1; z += 13) {
    if (Math.abs(z - 180) < 18) continue;          // 北边界让开入口
    pts.push([X0, z]); pts.push([X1, z]);
  }
  const m = instanced(geo, mat, pts.length, false);
  pts.forEach((p, i) => setInst(m, i, p[0], terrainHeight(p[0], p[1]) + 0.95, p[1]));
  m.instanceMatrix.needsUpdate = true;
  scene.add(m);
}

/* ---- 湖滨公园：步道、长椅、花坛、观景平台 ---- */
function buildLakePark() {
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.85 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.7, metalness: 0.4 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xa8875f, roughness: 0.88 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xc9c6bd, roughness: 0.92 });

  const benchGeo = new THREE.BoxGeometry(2.0, 0.10, 0.52);
  const backGeo = new THREE.BoxGeometry(2.0, 0.42, 0.09);
  const legGeo = new THREE.BoxGeometry(0.09, 0.42, 0.44);
  const benches = instanced(benchGeo, benchMat, 26, false);
  const backs = instanced(backGeo, benchMat, 26, false);
  const legs = instanced(legGeo, legMat, 26 * 2, false);
  let bi = 0, li = 0;

  // 花坛
  const bedGeo = new THREE.CylinderGeometry(2.2, 2.4, 0.5, 12);
  const bedMat = new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.95 });
  const beds = instanced(bedGeo, bedMat, 8, false);
  const flowerGeo = new THREE.IcosahedronGeometry(1.5, 0);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xc86a9a, roughness: 0.9, flatShading: true });
  const flowers = instanced(flowerGeo, flowerMat, 8, false);

  // 观景平台（伸入湖面的木平台）
  for (const z0 of [-40, 130]) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 0.35, 9), deckMat);
    deck.position.set(-262, -2.55, z0);
    deck.receiveShadow = true;
    scene.add(deck);
    for (const dz of [-4.2, 4.2]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(14, 0.9, 0.14), deckMat);
      rail.position.set(-262, -1.9, z0 + dz);
      scene.add(rail);
    }
  }

  // 沿湖岸布置长椅与花坛
  const shoreX = z => -214 - Math.sin(z * 0.011) * 16;
  let bIdx = 0, bedIdx = 0;
  for (let k = 0; k < 26; k++) {
    const z = -150 + k * 17;
    const x = shoreX(z);
    const gy = terrainHeight(x, z);
    const ry = Math.sin(z * 0.011) * 0.6;
    setInst(benches, bIdx, x, gy + 0.46, z, ry);
    setInst(backs, bIdx, x - Math.sin(ry) * 0.24, gy + 0.68, z - Math.cos(ry) * 0.24, ry);
    setInst(legs, li++, x - 0.7, gy + 0.21, z, ry);
    setInst(legs, li++, x + 0.7, gy + 0.21, z, ry);
    bIdx++;

    if (k % 3 === 1 && bedIdx < 8) {
      setInst(beds, bedIdx, x + 5, gy + 0.25, z + 3, 0);
      setInst(flowers, bedIdx, x + 5, gy + 0.85, z + 3, 0);
      bedIdx++;
    }
  }
  [benches, backs, legs, beds, flowers].forEach(m => { m.instanceMatrix.needsUpdate = true; scene.add(m); });

  // 园路（碎石小径，沿长椅连线）
  for (let k = 0; k < 40; k++) {
    const z = -150 + k * 11;
    const x = shoreX(z) + 3.2;
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 11.5), stoneMat);
    seg.rotation.x = -Math.PI / 2;
    seg.rotation.z = Math.sin(z * 0.011) * 0.12;
    seg.position.set(x, terrainHeight(x, z) + 0.05, z);
    seg.receiveShadow = true;
    scene.add(seg);
  }
}

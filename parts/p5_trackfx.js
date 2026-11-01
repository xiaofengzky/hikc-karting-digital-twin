/* ============================================================
   护栏 / 轮胎墙 / 标识 / 灯杆
   ============================================================ */
function instanced(geo, mat, count, castShadow = true) {
  const m = new THREE.InstancedMesh(geo, mat, count);
  m.castShadow = castShadow; m.receiveShadow = true;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return m;
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(),
  _v3 = new THREE.Vector3(), _s3 = new THREE.Vector3(1, 1, 1), _eu = new THREE.Euler();

function setInst(mesh, i, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _eu.set(rx, ry, rz);
  _q.setFromEuler(_eu);
  _v3.set(x, y, z); _s3.set(sx, sy, sz);
  _m4.compose(_v3, _q, _s3);
  mesh.setMatrixAt(i, _m4);
}

let fencePosts, fenceRails, tyreWall, tyreMeshCount = 0;

function buildFences() {
  const step = 4.0;
  const n = Math.floor(TRACK.L / step);
  const postGeo = new THREE.BoxGeometry(0.09, 1.35, 0.09);
  const railGeo = new THREE.BoxGeometry(step, 0.07, 0.05);
  const matPost = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.55, metalness: 0.7 });

  fencePosts = instanced(postGeo, matPost, n * 2);
  fenceRails = instanced(railGeo, matPost, n * 4);
  let pi = 0, ri = 0;
  for (let k = 0; k < n; k++) {
    const s = k * step;
    const t = trackAt(s);
    const ry = -Math.atan2(t.t.z, t.t.x);
    for (const side of [-1, 1]) {
      // 维修区出口：主直道靠 P 房一侧留出通往赛道的开口
      if (side > 0 && s > 6 && s < 46) continue;
      const off = t.hw + 4.6;
      const p = t.p.clone().addScaledVector(t.nrm, side * off);
      const gy = terrainHeight(p.x, p.z);
      setInst(fencePosts, pi++, p.x, gy + 0.67, p.z, ry);
      for (let lvl = 0; lvl < 2; lvl++)
        setInst(fenceRails, ri++, p.x, gy + 0.55 + lvl * 0.62, p.z, ry);
    }
  }
  fencePosts.count = pi; fenceRails.count = ri;
  fencePosts.instanceMatrix.needsUpdate = true;
  fenceRails.instanceMatrix.needsUpdate = true;
  scene.add(fencePosts, fenceRails);
}

function buildTyres() {
  const geo = new THREE.TorusGeometry(0.28, 0.13, 6, 14);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1b1b1e, roughness: 0.92, metalness: 0.0 });
  const list = [];
  const corners = TRACK_DATA.corners;
  for (const c of corners) {
    const span = clamp(c.r * 1.0, 12, 24);
    const out = c.side > 0 ? -1 : 1;
    for (let s = c.s - span; s <= c.s + span; s += 1.18) {
      const t = trackAt(s);
      const p = t.p.clone().addScaledVector(t.nrm, out * (t.hw + 5.6));
      const gy = terrainHeight(p.x, p.z);
      const layers = 3;
      for (let l = 0; l < layers; l++)
        list.push([p.x, gy + 0.16 + l * 0.255, p.z]);
    }
  }
  tyreMeshCount = list.length;
  tyreWall = instanced(geo, mat, tyreMeshCount);
  list.forEach((p, i) => setInst(tyreWall, i, p[0], p[1], p[2], sr(0, 3.14) * 0, 1, 1, 1, Math.PI / 2 + 0.05, 0));
  tyreWall.instanceMatrix.needsUpdate = true;
  scene.add(tyreWall);
}

/* 弯号牌 */
function buildCornerSigns() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f4f6, roughness: 0.7 });
  TRACK_DATA.corners.forEach((c, k) => {
    const span = clamp(c.r * 1.0, 12, 26);
    const out = c.side > 0 ? -1 : 1;
    const t = trackAt(c.s + span * 0.55);
    const p = t.p.clone().addScaledVector(t.nrm, out * (t.hw + 7.4));
    const gy = terrainHeight(p.x, p.z);
    const grp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), mat);
    pole.position.y = 1.3; pole.castShadow = true;
    grp.add(pole);
    const { c: pc, x: pg } = cv(128, 96);
    pg.fillStyle = '#12141a'; pg.fillRect(0, 0, 128, 96);
    pg.fillStyle = '#ff3b1f'; pg.fillRect(0, 0, 128, 10);
    pg.fillStyle = '#ffffff';
    pg.font = 'bold 46px sans-serif'; pg.textAlign = 'center';
    pg.fillText('T' + (k + 1), 64, 62);
    pg.font = 'bold 20px sans-serif'; pg.fillStyle = '#ffb300';
    pg.fillText(c.side > 0 ? 'R' : 'L', 64, 84);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.12),
      new THREE.MeshStandardMaterial({ map: tex(pc, 1, 1, 4), roughness: 0.75, side: THREE.DoubleSide }));
    sign.position.y = 2.55;
    sign.rotation.y = -Math.atan2(t.t.z, t.t.x);
    sign.castShadow = true;
    grp.add(sign);
    grp.position.set(p.x, gy, p.z);
    scene.add(grp);
  });
}

/* 广告横幅（沿主直道护栏） */
function buildBanners() {
  const texts = ['HIKC', 'VEGA', 'MYLAPS', 'ROK CUP', '湖北国际卡丁车', 'CKC', '孝感'];
  const cols = ['#e10600', '#0b1f3a', '#111111', '#00a3e0', '#c1121f', '#f0a500', '#1d3c34'];
  const matBase = new THREE.MeshStandardMaterial({ roughness: 0.72, side: THREE.FrontSide });
  let n = 0;
  for (let s = -44; s < 92; s += 10) {
    if (s > 4 && s < 48) continue;   // 维修区出口不设广告牌
    const t = trackAt(s);
    const p = t.p.clone().addScaledVector(t.nrm, (t.hw + 3.4));
    const gy = terrainHeight(p.x, p.z);
    const k = n % texts.length;
    const m = matBase.clone();
    m.map = tex(bannerTexture(texts[k], cols[k], '#ffffff'), 1, 1, 8);
    const g1 = new THREE.PlaneGeometry(10.4, 1.15);
    const b = new THREE.Mesh(g1, m);
    b.position.set(p.x, gy + 1.15, p.z);
    b.rotation.y = -Math.atan2(t.t.z, t.t.x);
    scene.add(b);
    const b2 = new THREE.Mesh(g1, m);
    b2.position.copy(b.position);
    b2.position.x -= Math.sin(b.rotation.y) * 0.02;
    b2.position.z -= Math.cos(b.rotation.y) * 0.02;
    b2.rotation.y = b.rotation.y + Math.PI;
    scene.add(b2);
    n++;
  }
}

/* 高杆灯 */
const floodLights = [];
function buildFloodLights() {
  const spots = [[-96, 96], [30, 104], [136, 66], [150, -22], [40, -92], [-118, -40], [-90, 40], [70, 46]];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x8d949b, roughness: 0.5, metalness: 0.65 });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x2a2d33, roughness: 0.6, metalness: 0.5,
    emissive: 0x000000
  });
  spots.forEach(([x, z]) => {
    const gy = terrainHeight(x, z);
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 20, 8), poleMat);
    pole.position.y = 10; pole.castShadow = true;
    g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.28, 0.28), poleMat);
    arm.position.set(0.9, 19.6, 0); g.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.5), headMat.clone());
    head.position.set(2.2, 19.3, 0); g.add(head);
    g.position.set(x, gy, z);
    scene.add(g);
    floodLights.push(head);
  });
}

/* ---- 发车门架：单侧大立柱 + 悬挑桁架横梁（对照实景图） ---- */
function buildStartGantry() {
  const t = trackAt(-5.5);
  const a = Math.atan2(t.t.z, t.t.x);
  const grp = new THREE.Group();
  grp.position.copy(t.p);
  grp.rotation.y = -a + Math.PI / 2;      // 局部 x = 路宽方向
  const hw = t.hw;

  const blue = new THREE.MeshStandardMaterial({ color: 0x1b3a6b, roughness: 0.52, metalness: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x4a5a4e, roughness: 0.5, metalness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.55, metalness: 0.35 });

  const colX = hw + 2.4;          // 立柱在赛道左侧
  const beamEndX = -(hw + 1.6);   // 横梁自左向右悬挑
  const beamY = 8.2;

  // 基座
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 2.4), blue);
  base.position.set(colX, 0.75, 0);
  base.castShadow = true; base.receiveShadow = true;
  grp.add(base);

  // 立柱（含竖排标题）
  const colH = 11.4;
  const col = new THREE.Mesh(new THREE.BoxGeometry(1.45, colH, 1.45), blue);
  col.position.set(colX, colH / 2 + 1.4, 0);
  col.castShadow = true;
  grp.add(col);

  const { c: vc, x: vg } = cv(256, 1400);
  vg.fillStyle = '#1b3a6b'; vg.fillRect(0, 0, 256, 1400);
  vg.fillStyle = '#f2c200';
  vg.fillRect(18, 0, 26, 1400);
  vg.fillStyle = '#ffffff';
  vg.font = 'bold 108px sans-serif';
  vg.textAlign = 'center'; vg.textBaseline = 'middle';
  const chars = '湖北国际卡丁车赛车场'.split('');
  chars.forEach((ch, i) => vg.fillText(ch, 152, 110 + i * 122));
  vg.fillStyle = '#f2c200'; vg.font = 'bold 64px sans-serif';
  vg.fillText('HKC', 152, 1400 - 44);
  const vMat = new THREE.MeshStandardMaterial({ map: tex(vc, 1, 1, 8), roughness: 0.55 });
  for (const zz of [0.73, -0.73]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 9.6), vMat);
    f.position.set(colX, 6.6, zz);
    if (zz < 0) f.rotation.y = Math.PI;
    grp.add(f);
  }

  // 基座文字
  const { c: bc, x: bg } = cv(512, 256);
  bg.fillStyle = '#1b3a6b'; bg.fillRect(0, 0, 512, 256);
  bg.fillStyle = '#f2c200'; bg.fillRect(0, 196, 512, 16);
  bg.fillStyle = '#ffffff'; bg.font = 'bold 96px sans-serif';
  bg.textAlign = 'center'; bg.textBaseline = 'middle';
  bg.fillText('HIKC', 256, 108);
  const bMat = new THREE.MeshStandardMaterial({ map: tex(bc, 1, 1, 8), roughness: 0.6 });
  for (const zz of [1.21, -1.21]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), bMat);
    f.position.set(colX, 0.8, zz);
    if (zz < 0) f.rotation.y = Math.PI;
    grp.add(f);
  }

  // 水平横梁（深蓝底 + 黄斜纹 + 白字）
  const beamW = Math.abs(beamEndX - colX) - 0.7;
  const beamCX = (colX + beamEndX) / 2;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(beamW, 0.85, 0.62), blue);
  beam.position.set(beamCX, beamY, 0);
  beam.castShadow = true;
  grp.add(beam);

  const { c: hc, x: hg } = cv(2048, 150);
  hg.fillStyle = '#12294f'; hg.fillRect(0, 0, 2048, 150);
  hg.save();
  hg.beginPath(); hg.rect(0, 0, 2048, 150); hg.clip();
  hg.fillStyle = '#f2c200';
  for (let i = -10; i < 34; i++) {
    hg.save();
    hg.translate(i * 78, 0);
    hg.transform(1, 0, -0.55, 1, 0, 0);
    hg.fillRect(0, 0, 26, 150);
    hg.restore();
  }
  hg.restore();
  hg.fillStyle = 'rgba(18,41,79,.86)';
  hg.fillRect(300, 10, 1450, 130);
  hg.fillStyle = '#ffffff';
  hg.font = 'bold 86px sans-serif';
  hg.textAlign = 'center'; hg.textBaseline = 'middle';
  hg.fillText('HKC', 430, 76);
  hg.font = 'bold 44px sans-serif';
  hg.fillText('湖北国际卡丁车赛车场', 900, 58);
  hg.font = 'bold 22px sans-serif';
  hg.fillStyle = '#f2c200';
  hg.fillText('HUBEI INTERNATIONAL KARTING CIRCUIT', 900, 104);
  const hMat = new THREE.MeshStandardMaterial({ map: tex(hc, 1, 1, 8), roughness: 0.55 });
  for (const zz of [0.33, -0.33]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(beamW, 0.78), hMat);
    f.position.set(beamCX, beamY, zz);
    if (zz < 0) f.rotation.y = Math.PI;
    grp.add(f);
  }

  // 悬挑桁架：柱顶 → 横梁末端，两根斜杆 + 竖撑
  const topY = colH + 1.0;
  for (const zz of [-0.42, 0.42]) {
    const dx = beamEndX - colX, dy = beamY - topY;
    const len = Math.hypot(dx, dy);
    const chord = new THREE.Mesh(new THREE.BoxGeometry(len, 0.26, 0.26), steel);
    chord.position.set((colX + beamEndX) / 2, (topY + beamY) / 2, zz);
    chord.rotation.z = Math.atan2(dy, dx);
    chord.castShadow = true;
    grp.add(chord);
  }
  for (let i = 1; i <= 5; i++) {
    const k = i / 6;
    const x = colX + (beamEndX - colX) * k;
    const yTop = topY + (beamY - topY) * k;
    const h = yTop - beamY;
    if (h < 0.2) continue;
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.14, h, 0.14), steel);
    v.position.set(x, (yTop + beamY) / 2, 0);
    grp.add(v);
  }

  // 梁下计时盒 + 发车灯
  // 横梁底面 = beamY - 0.425，盒子紧贴其下（无悬空）
  const beamBottom = beamY - 0.425;
  const boxH = 0.72;
  const boxCY = beamBottom - boxH / 2;
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.5, boxH, 0.6), dark);
  box.position.set(beamCX + 1.0, boxCY, 0);
  box.castShadow = true;
  grp.add(box);
  // 发车灯：纯色面片，朝**东面**（车出最后一个弯驶来时看到的那一面）
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xff1a1a, side: THREE.DoubleSide });
  const lampGeo = new THREE.CircleGeometry(0.24, 16);
  for (let i = 0; i < 4; i++) {
    for (const zz of [0.33, -0.33]) {
      const l = new THREE.Mesh(lampGeo, lampMat);
      l.position.set(beamCX + 0.10 + i * 0.60, boxCY, zz);
      grp.add(l);
    }
  }

  scene.add(grp);
}

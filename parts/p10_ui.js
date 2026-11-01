/* ============================================================
   UI / 标签 / 小地图
   ============================================================ */
const TAGS = [];
let tagEls = [];

function buildTags() {
  const C = TRACK_DATA.corners;
  const t1 = trackAt(C[0].s + 30);
  const gp = trackAt(2);
  const gpos = gp.p.clone().addScaledVector(gp.nrm, (gp.hw + 49));
  const pp = trackAt(34);
  const ppos = pp.p.clone().addScaledVector(pp.nrm, pp.hw + 49);
  const ep = trackAt(20);
  const epos = ep.p.clone().addScaledVector(ep.nrm, -(ep.hw + 34));

  const defs = [
    {
      pos: ppos, name: 'P 房 · 维修区', en: 'PIT BUILDING · 8 BAYS', y: 9,
      desc: '8 个车队车库单元，二层是观景平台与售票区，玻璃栏板正对主直道；P 房与赛道之间是水泥停车区。',
      rows: [['车库', '8 间'], ['二层', '观景 + 售票'], ['前方', '水泥停车区']]
    }
  ];


  const wrap = document.getElementById('tags');
  defs.forEach((d, i) => {
    const el = document.createElement('div');
    el.className = 'tag';
    el.innerHTML = `<i>◆</i>${d.name}`;
    el.addEventListener('click', () => showInfo(d));
    wrap.appendChild(el);
    TAGS.push({ ...d, el, world: d.pos.clone().setY((d.pos.y || 0) + (d.y || 4)) });
  });
}

function updateTags() {
  const w = innerWidth, h = innerHeight;
  const v = new THREE.Vector3();
  for (const t of TAGS) {
    v.copy(t.world).project(camera);
    const dist = camera.position.distanceTo(t.world);
    const visible = v.z < 1 && dist < 780 && CAM.mode !== 'lap';
    if (!visible) { t.el.style.opacity = '0'; t.el.style.pointerEvents = 'none'; continue; }
    t.el.style.opacity = clamp(1.35 - dist / 700, 0.18, 1);
    t.el.style.pointerEvents = 'auto';
    t.el.style.left = ((v.x * 0.5 + 0.5) * w) + 'px';
    t.el.style.top = ((-v.y * 0.5 + 0.5) * h) + 'px';
  }
}

function showInfo(d) {
  document.getElementById('iTitle').textContent = d.name;
  document.getElementById('iEn').textContent = d.en;
  document.getElementById('iDesc').textContent = d.desc;
  document.getElementById('iRows').innerHTML =
    (d.rows || []).map(r => `<span>${r[0]}</span><b>${r[1]}</b>`).join('');
  document.getElementById('info').classList.add('show');
}

/* ---------- 小地图 ---------- */
let mmCtx, mmBase, mmScale = 1, mmOx = 0, mmOz = 0;
function initMinimap() {
  const cv2 = document.getElementById('minimap');
  mmCtx = cv2.getContext('2d');
  const W = cv2.width, H = cv2.height;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const p of TRACK.P) {
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
    z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z);
  }
  mmScale = Math.min((W - 16) / (x1 - x0), (H - 16) / (z1 - z0));
  mmOx = (W - (x1 - x0) * mmScale) / 2 - x0 * mmScale;
  mmOz = (H - (z1 - z0) * mmScale) / 2 - z0 * mmScale;

  mmBase = document.createElement('canvas');
  mmBase.width = W; mmBase.height = H;
  const g = mmBase.getContext('2d');
  g.fillStyle = 'rgba(18,22,28,.9)';
  g.fillRect(0, 0, W, H);
  // 湖
  g.fillStyle = 'rgba(28,64,84,.55)';
  g.fillRect(W - 12, 0, 12, H);
  g.beginPath();
  g.moveTo(W - 18, 6); g.lineTo(W - 4, 0); g.lineTo(W - 4, H); g.lineTo(W - 26, H);
  g.closePath(); g.fill();
  // 赛道
  g.beginPath();
  TRACK.P.forEach((p, i) => {
    const x = p.x * mmScale + mmOx, y = p.z * mmScale + mmOz;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  });
  g.closePath();
  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 9; g.lineJoin = 'round'; g.stroke();
  g.strokeStyle = '#e8eef6';
  g.lineWidth = 3.4; g.stroke();
  // 起点
  const t0 = TRACK.P[0];
  g.fillStyle = '#ff3b1f';
  g.beginPath();
  g.arc(t0.x * mmScale + mmOx, t0.z * mmScale + mmOz, 3, 0, TAU);
  g.fill();
}

function drawMinimap() {
  if (!mmCtx) return;
  const W = mmBase.width, H = mmBase.height;
  mmCtx.clearRect(0, 0, W, H);
  mmCtx.drawImage(mmBase, 0, 0);

  // 相机
  const cx = camera.position.x * mmScale + mmOx;
  const cz = camera.position.z * mmScale + mmOz;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const ang = Math.atan2(dir.z, dir.x);

  mmCtx.save();
  mmCtx.translate(clamp(cx, 4, W - 4), clamp(cz, 4, H - 4));
  mmCtx.rotate(ang);
  mmCtx.fillStyle = 'rgba(255,179,0,.9)';
  mmCtx.beginPath();
  mmCtx.moveTo(6, 0); mmCtx.lineTo(-4, 4); mmCtx.lineTo(-4, -4);
  mmCtx.closePath(); mmCtx.fill();
  mmCtx.restore();

  // 视野扇形
  mmCtx.save();
  mmCtx.globalAlpha = .25;
  mmCtx.fillStyle = '#ffb300';
  mmCtx.beginPath();
  mmCtx.moveTo(clamp(cx, 4, W - 4), clamp(cz, 4, H - 4));
  mmCtx.arc(clamp(cx, 4, W - 4), clamp(cz, 4, H - 4), 16, ang - 0.5, ang + 0.5);
  mmCtx.closePath();
  mmCtx.fill();
  mmCtx.restore();
}

/* ---------- 控件绑定 ---------- */
function initUI() {
  document.querySelectorAll('#wxBtns button').forEach(b => {
    b.addEventListener('click', () => applyWeather(b.dataset.w, false));
  });

  const tr = document.getElementById('timeRange');
  tr.addEventListener('input', () => {
    S.time = parseFloat(tr.value);
    document.getElementById('tLabel').textContent = fmtTime(S.time);
  });
  document.querySelectorAll('[data-t]').forEach(b => {
    b.addEventListener('click', () => {
      S.time = parseFloat(b.dataset.t);
      tr.value = S.time;
      document.getElementById('tLabel').textContent = fmtTime(S.time);
    });
  });

  document.querySelectorAll('#seasonBtns button').forEach(b => {
    b.addEventListener('click', () => {
      const v = parseFloat(b.dataset.s);
      S.dayOfYear = Math.round(v * 365.24);
      document.querySelectorAll('#seasonBtns button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      document.getElementById('seasonName').textContent = b.textContent;
      updateSky(true);
    });
  });

  document.querySelectorAll('#spdBtns button').forEach(b => {
    b.addEventListener('click', () => {
      const v = parseFloat(b.dataset.v);
      S.speed = v;
      S.playing = v > 0;
      document.querySelectorAll('#spdBtns button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      document.getElementById('spdLabel').textContent =
        v === 0 ? '暂停' : (v === 1 ? '实时' : v + '×');
    });
  });

  document.querySelectorAll('#views button').forEach(b => {
    b.addEventListener('click', () => setCamMode(b.dataset.v));
  });

  const panel = document.getElementById('panel');
  document.getElementById('collapse').addEventListener('click', () => panel.classList.add('collapsed'));
  document.getElementById('toggle').addEventListener('click', () => panel.classList.remove('collapsed'));
  document.getElementById('infoX').addEventListener('click', () =>
    document.getElementById('info').classList.remove('show'));

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // 提示自动淡出
  let hinted = false;
  const hideHint = () => {
    if (hinted) return;
    hinted = true;
    setTimeout(() => document.getElementById('hint').style.opacity = '0', 2600);
  };
  renderer.domElement.addEventListener('pointerdown', hideHint);
  renderer.domElement.addEventListener('wheel', hideHint);
  setTimeout(hideHint, 9000);
}

function fmtTime(t) {
  const h = Math.floor(t) % 24, m = Math.floor((t - Math.floor(t)) * 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

/* ---------- 面板刷新 ---------- */
let _uiAcc = 0;
function updateUI(dt) {
  _uiAcc += dt;
  if (_uiAcc < 0.12) return;
  _uiAcc = 0;
  const st = surfaceState(S.wet);
  const grip = Math.round(100 * (1 - 0.52 * Math.pow(S.wet, 0.85)));

  document.getElementById('tLabel').textContent = fmtTime(S.time);
  document.getElementById('bClock').textContent = fmtTime(S.time);
  document.getElementById('bTemp').innerHTML = Math.round(S.temp) + '<small>°C</small>';
  document.getElementById('bHum').innerHTML = Math.round(S.hum) + '<small>%</small>';
  document.getElementById('bWind').innerHTML = S.windNow.toFixed(1) + '<small>m/s</small>';
  document.getElementById('bVis').innerHTML = (S.vis >= 10 ? Math.round(S.vis) : S.vis.toFixed(1)) + '<small>km</small>';
  document.getElementById('bSun').innerHTML = Math.max(0, Math.round(S.sun.el / DEG)) + '<small>°</small>';

  document.getElementById('surfTxt').textContent = st.t;
  document.getElementById('surfTxt').style.color = st.c;
  document.getElementById('wetBar').style.width = (S.wet * 100).toFixed(0) + '%';
  document.getElementById('gripTxt').textContent = grip + '%';
  document.getElementById('gripTxt').style.color = grip > 80 ? '#3ddc84' : grip > 55 ? '#ffb300' : '#ff5b3d';
  document.getElementById('gripBar').style.width = grip + '%';
  document.getElementById('rtempTxt').textContent = Math.round(S.roadTemp) + '°C';
  document.getElementById('depthTxt').textContent = (S.wet > 0.65 ? (S.wet - 0.65) * 22 : 0).toFixed(1) + ' mm';

  const mmS = document.getElementById('mmS');
  if (mmS) mmS.textContent = Math.round(CAM.mode === 'lap' ? CAM.lapS : 0) + ' m';

  const t4 = document.getElementById('timeRange');
  if (document.activeElement !== t4) t4.value = S.time;
}

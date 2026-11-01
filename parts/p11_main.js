/* ============================================================
   启动 / 主循环
   ============================================================ */
let _skyAcc = 0, _mmAcc = 0, _last = 0, running = false;

const LOAD_STEPS = [
  ['初始化渲染管线', () => { initScene(); initMats(); }],
  ['解析赛道中心线', () => { buildTrack(); }],
  ['生成地形高程场', () => { buildTerrain(); }],
  ['铺设赛道面层', () => { buildRoad(); }],
  ['架设护栏与轮胎墙', () => { buildFences(); buildTyres(); buildBanners(); buildStartGantry(); }],
  ['建造看台与场馆', () => {
    buildControlTower(); buildPitBuilding(); buildKarts(); buildBarriers(); buildTimingTower();
    buildPaddock(); buildEntrance(); buildParking(); buildServiceBuildings();
  }],
  ['注入王母湖与澴河', () => { buildWater(); buildLakefront(); }],
  ['布置城市与道路', () => { buildRoadNet(); buildStadium(); buildCity(); }],
  ['种植植被与花海', () => { buildTrees(); buildFlowerField(); buildLakePark(); buildPerimeter(); }],
  ['构建降水系统', () => { buildRain(); buildSnow(); buildFloodLights(); }],
  ['装配交互界面', () => {
    buildTags(); initMinimap(); initUI(); initCamera();
    applyWeather('clear', true);
    setCamMode('orbit', false);
  }]
];

async function boot() {
  const bar = document.querySelector('#bar i');
  const ltxt = document.getElementById('ltxt');
  for (let i = 0; i < LOAD_STEPS.length; i++) {
    const [name, fn] = LOAD_STEPS[i];
    ltxt.textContent = name + '…';
    bar.style.width = ((i) / LOAD_STEPS.length * 100).toFixed(0) + '%';
    await new Promise(r => requestAnimationFrame(() => r()));
    try {
      fn();
    } catch (err) {
      console.error('步骤失败: ' + name, err);
      ltxt.textContent = '加载异常: ' + name;
    }
  }
  bar.style.width = '100%';
  ltxt.textContent = '就绪';
  await new Promise(r => setTimeout(r, 260));

  // 预热一帧
  S.sun = sunPosition(S.time, S.dayOfYear);
  updateSky(true);
  renderer.render(scene, camera);

  const ld = document.getElementById('loader');
  ld.style.opacity = '0';
  setTimeout(() => ld.style.display = 'none', 900);
  running = true;
  _last = performance.now();
  requestAnimationFrame(loop);
}

function loop(now) {
  requestAnimationFrame(loop);
  if (!running) return;
  const dt = Math.min((now - _last) / 1000, 0.08);
  _last = now;
  S.simT += dt;

  // 时间推进（1× = 12 倍实时）
  if (S.playing) {
    S.time += dt * S.speed * 12 / 3600;
    if (S.time >= 24) S.time -= 24;
  }

  // 太阳
  S.sun = sunPosition(S.time, S.dayOfYear);

  // 天气插值 + 赛道湿度演进
  lerpWeather(dt);
  updateWetness(dt);
  S.snowCover = clamp((S.snowCover || 0) + (S.wx.snow > 0.25 ? dt * 0.12 : -dt * 0.05), 0, 1);

  // 天空（限流）
  _skyAcc += dt;
  if (_skyAcc > 0.09) { _skyAcc = 0; updateSky(false); }

  updateWeatherVisual(dt, S.simT);
  updateCamera(dt);
  updateTags();
  updateUI(dt);

  _mmAcc += dt;
  if (_mmAcc > 0.1) { _mmAcc = 0; drawMinimap(); }

  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.THREE) {
    document.getElementById('ltxt').textContent = 'Three.js 加载失败，请检查网络后刷新';
    return;
  }
  boot();
});

/* ============================================================
   全局状态 + 天气预设
   ============================================================ */
const WEATHER = {
  clear:     { name: '晴',   cloud: 0.16, gloom: 0.00, haze: 0.05, rain: 0.0,  snow: 0.0, fog: 0.00098, wind: 2.6,  dt: 0,    hum: 48 },
  partly:    { name: '多云', cloud: 0.45, gloom: 0.20, haze: 0.16, rain: 0.0,  snow: 0.0, fog: 0.00125, wind: 3.8,  dt: -1.2, hum: 58 },
  overcast:  { name: '阴',   cloud: 0.88, gloom: 0.64, haze: 0.36, rain: 0.0,  snow: 0.0, fog: 0.00150, wind: 4.8,  dt: -3.2, hum: 72 },
  lightRain: { name: '小雨', cloud: 0.93, gloom: 0.76, haze: 0.44, rain: 0.38, snow: 0.0, fog: 0.00190, wind: 5.6,  dt: -4.6, hum: 88 },
  heavyRain: { name: '大雨', cloud: 1.00, gloom: 0.90, haze: 0.52, rain: 0.85, snow: 0.0, fog: 0.00270, wind: 8.4,  dt: -5.6, hum: 95 },
  storm:     { name: '雷雨', cloud: 1.00, gloom: 1.00, haze: 0.58, rain: 1.00, snow: 0.0, fog: 0.00310, wind: 12.5, dt: -6.4, hum: 97, thunder: true },
  fog:       { name: '雾',   cloud: 0.52, gloom: 0.56, haze: 0.96, rain: 0.0,  snow: 0.0, fog: 0.00750, wind: 1.3,  dt: -2.4, hum: 96 },
  snow:      { name: '雪',   cloud: 0.96, gloom: 0.84, haze: 0.50, rain: 0.0,  snow: 0.85, fog: 0.00230, wind: 3.4, dt: -17,  hum: 88 }
};

const S = {
  time: 14.0,
  dayOfYear: 292,          // 10/19
  weather: 'clear',
  wet: 0.0,                // 赛道湿度 0-1（真实演进值）
  wetPrev: 0.0,
  speed: 1,
  playing: true,
  sun: { dir: new THREE.Vector3(0, 1, 0), el: 0.9, az: 3.14 },
  wx: { cloud: 0.07, gloom: 0, haze: 0.16, rain: 0, snow: 0, fogDensity: 0.0004, wind: 2.6, tempOff: 0 },
  temp: 24, hum: 48, windNow: 2.6, vis: 20, roadTemp: 32,
  camMode: 'orbit',
  lapProgress: 0,
  paused: false,
  simT: 0
};

function applyWeather(key, instant) {
  const w = WEATHER[key];
  if (!w) return;
  S.weather = key;
  S.wxTarget = w;
  if (instant) {
    S.wx.cloud = w.cloud; S.wx.gloom = w.gloom; S.wx.haze = w.haze;
    S.wx.rain = w.rain; S.wx.snow = w.snow; S.wx.fogDensity = w.fog;
    S.wx.wind = w.wind; S.wx.tempOff = w.dt;
    updateSky(true);
  }
  document.querySelectorAll('#wxBtns button').forEach(b =>
    b.classList.toggle('on', b.dataset.w === key));
  document.getElementById('wxName').textContent = w.name;
}

/* 天气参数平滑过渡（避免突变） */
function lerpWeather(dt) {
  const w = S.wxTarget || WEATHER[S.weather];
  const k = 1 - Math.pow(0.0015, dt * 0.55);
  S.wx.cloud += (w.cloud - S.wx.cloud) * k;
  S.wx.gloom += (w.gloom - S.wx.gloom) * k;
  S.wx.haze += (w.haze - S.wx.haze) * k;
  S.wx.rain += (w.rain - S.wx.rain) * k;
  S.wx.snow += (w.snow - S.wx.snow) * k;
  S.wx.fogDensity += (w.fog - S.wx.fogDensity) * k;
  S.wx.wind += (w.wind - S.wx.wind) * k;
  S.wx.tempOff += (w.dt - S.wx.tempOff) * k;

  // 气温：季节基准 + 日变化 + 天气修正
  const seasonBase = 16.5 + 12.2 * Math.cos(TAU * (S.dayOfYear - 202) / 365.24);
  const diurnal = 6.2 * Math.sin(TAU * (S.time - 9.2) / 24);
  const tgtTemp = seasonBase + diurnal + S.wx.tempOff;
  S.temp += (tgtTemp - S.temp) * (1 - Math.pow(0.002, dt * 0.4));

  const tgtHum = clamp(w.hum + (S.wx.rain > 0.05 ? 6 : 0) - Math.max(0, S.temp - 26) * 1.5, 25, 99);
  S.hum += (tgtHum - S.hum) * (1 - Math.pow(0.02, dt * 0.5));

  S.windNow = S.wx.wind * (0.82 + 0.28 * Math.sin(performance.now() * 0.00042) + 0.1 * Math.sin(performance.now() * 0.0013));
  S.vis = clamp(24 * Math.exp(-S.wx.fogDensity * 620), 0.05, 30);

  // 路面温度：日照 + 气温
  const sunHit = clamp(S.sun.el / (60 * DEG), 0, 1);
  const tgtRoad = S.temp + 16 * sunHit * (1 - S.wx.gloom) - S.wet * 9 + S.wx.rain * 4;
  S.roadTemp += (tgtRoad - S.roadTemp) * (1 - Math.pow(0.05, dt * 0.6));
}

/* ---------- 赛道湿度演进 ---------- */
function updateWetness(dt) {
  const w = S.wx;
  // 降雨浸润：路面吸水到饱和度，强度越大越快
  const soak = w.rain * 0.055 + w.snow * 0.020;
  // 蒸发干燥：日照 + 温度 + 风
  const sunFactor = clamp(S.sun.el / (50 * DEG), 0, 1)
    * (1 - clamp(w.gloom, 0, 1) * 0.72);
  const tempFactor = clamp((S.roadTemp - 6) / 34, 0, 1);
  const evap = (0.004 + sunFactor * 0.052 + w.wind * 0.0016) * tempFactor;

  let nw = S.wet + (soak - evap * (0.25 + S.wet * 1.5)) * dt;
  // 雪后融化极慢
  if (w.snow > 0.1) nw -= w.snow * 0.004 * dt * tempFactor;
  S.wet = clamp(nw, 0, 1);
}

function surfaceState(rho) {
  if (rho < 0.035) return { t: '干燥', c: '#3ddc84', k: 'DRY' };
  if (rho < 0.20) return { t: '微湿', c: '#9ede5a', k: 'DAMP' };
  if (rho < 0.45) return { t: '潮湿', c: '#ffb300', k: 'WET' };
  if (rho < 0.72) return { t: '湿滑', c: '#ff8a1f', k: 'SLICK' };
  if (rho < 0.90) return { t: '积水', c: '#ff5b3d', k: 'STANDING' };
  return { t: '严重积水', c: '#e10600', k: 'FLOODED' };
}

/* ============================================================
   HIKC 数字孪生 · 基础工具
   ============================================================ */
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));

// 确定性随机（保证每次生成一致）
let _seed = 20260819;
function srnd() { _seed = (_seed * 16807 + 19487171) % 2147483647; return (_seed & 0x7fffffff) / 2147483647; }
function sr(a, b) { return a + srnd() * (b - a); }

/* ---------- 噪声 ---------- */
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
function fbm(x, y, oct = 4) {
  let v = 0, a = 0.5, fx = x, fy = y;
  for (let i = 0; i < oct; i++) { v += a * vnoise(fx, fy); fx *= 2.03; fy *= 2.03; a *= 0.5; }
  return v;
}

/* ---------- 画布纹理工厂 ---------- */
function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, x: c.getContext('2d') };
}
function tex(canvas, rx = 1, ry = 1, aniso = 8) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = aniso;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* 沥青路面：主纹理（含白边线）+ 粗糙度 */
function asphaltMaps() {
  const W = 512, H = 1024;
  const { c, x: g } = cv(W, H);
  g.fillStyle = '#4a4d52'; g.fillRect(0, 0, W, H);
  // 骨料噪点
  const img = g.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 46;
    d[i] = clamp(d[i] + n, 0, 255);
    d[i + 1] = clamp(d[i + 1] + n, 0, 255);
    d[i + 2] = clamp(d[i + 2] + n * 1.1, 0, 255);
  }
  g.putImageData(img, 0, 0);
  // 大片色差
  for (let i = 0; i < 26; i++) {
    const px = Math.random() * W, py = Math.random() * H, r = rnd(30, 130);
    const gr = g.createRadialGradient(px, py, 0, px, py, r);
    const dark = Math.random() > 0.45;
    gr.addColorStop(0, dark ? 'rgba(20,22,26,.085)' : 'rgba(150,150,155,.04)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2);
  }
  // 轮胎磨痕（中间深色带）
  const tb = g.createLinearGradient(0, 0, W, 0);
  tb.addColorStop(0, 'rgba(0,0,0,0)');
  tb.addColorStop(0.22, 'rgba(15,15,18,.045)');
  tb.addColorStop(0.5, 'rgba(15,15,18,.085)');
  tb.addColorStop(0.78, 'rgba(15,15,18,.045)');
  tb.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = tb; g.fillRect(0, 0, W, H);
  // 白边线
  g.fillStyle = 'rgba(238,240,242,.95)';
  const lw = 7;
  g.fillRect(W * 0.055, 0, lw, H);
  g.fillRect(W * 0.945 - lw, 0, lw, H);
  // 边线磨损
  for (let i = 0; i < 260; i++) {
    const y = Math.random() * H, hh = rnd(2, 16);
    g.fillStyle = `rgba(58,61,66,${rnd(.3, .85)})`;
    if (Math.random() > .5) g.fillRect(W * 0.055 + Math.random() * lw, y, rnd(1, 4), hh);
    else g.fillRect(W * 0.945 - lw + Math.random() * lw, y, rnd(1, 4), hh);
  }
  // 粗糙度图：磨痕处更光滑（反光）
  const { c: rc, x: rg } = cv(W, H);
  rg.fillStyle = '#e8e8e8'; rg.fillRect(0, 0, W, H);
  const rim = rg.getImageData(0, 0, W, H), rd = rim.data;
  for (let i = 0; i < rd.length; i += 4) {
    const n = 235 + (Math.random() - 0.5) * 30;
    rd[i] = rd[i + 1] = rd[i + 2] = n;
  }
  rg.putImageData(rim, 0, 0);
  const rb = rg.createLinearGradient(0, 0, W, 0);
  rb.addColorStop(0, 'rgba(255,255,255,0)');
  rb.addColorStop(0.32, 'rgba(120,120,120,.85)');
  rb.addColorStop(0.5, 'rgba(96,96,96,.9)');
  rb.addColorStop(0.68, 'rgba(120,120,120,.85)');
  rb.addColorStop(1, 'rgba(255,255,255,0)');
  rg.fillStyle = rb; rg.fillRect(0, 0, W, H);
  return { map: c, rough: rc };
}

/* 草地 */
function grassTexture(base = '#3f5b32', variance = 26) {
  const { c, x: g } = cv(256, 256);
  const col = parseInt(base.slice(1), 16);
  const r0 = col >> 16 & 255, g0 = col >> 8 & 255, b0 = col & 255;
  const img = g.createImageData(256, 256), d = img.data;
  for (let i = 0, p = 0; i < 256 * 256; i++, p += 4) {
    const n = (Math.random() - 0.5) * variance;
    d[p] = clamp(r0 + n, 0, 255); d[p + 1] = clamp(g0 + n * 1.15, 0, 255);
    d[p + 2] = clamp(b0 + n * .7, 0, 255); d[p + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 900; i++) {
    g.strokeStyle = `rgba(${r0 + rnd(-30, 30) | 0},${g0 + rnd(-20, 40) | 0},${b0 | 0},${rnd(.15, .4)})`;
    g.lineWidth = rnd(.5, 1.4);
    const px = Math.random() * 256, py = Math.random() * 256;
    g.beginPath(); g.moveTo(px, py); g.lineTo(px + rnd(-2, 2), py - rnd(2, 5)); g.stroke();
  }
  return c;
}

/* 混凝土 / 建筑外墙 */
function concreteTexture(base = '#8c8d90') {
  const { c, x: g } = cv(128, 128);
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},255,${rnd(.02, .07)})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, rnd(1, 3), rnd(1, 3));
  }
  return c;
}

/* 幕墙窗户 */
function windowTexture(cols = 10, rows = 12, lit = 0.25) {
  const W = 256, H = 256;
  const { c, x: g } = cv(W, H);
  g.fillStyle = '#2b3138'; g.fillRect(0, 0, W, H);
  const cw = W / cols, ch = H / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const on = Math.random() < lit;
      g.fillStyle = on
        ? `rgba(${240 + rnd(-20, 15) | 0},${225 + rnd(-30, 20) | 0},${180 + rnd(-40, 30) | 0},1)`
        : `rgba(${52 + rnd(-14, 26) | 0},${62 + rnd(-14, 26) | 0},${74 + rnd(-16, 30) | 0},1)`;
      g.fillRect(x * cw + cw * .12, y * ch + ch * .12, cw * .76, ch * .74);
    }
  }
  return c;
}

/* 广告 / 品牌条幅 */
function bannerTexture(text, bg = '#e10600', fg = '#ffffff') {
  const { c, x: g } = cv(512, 128);
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.fillStyle = fg;
  g.font = 'bold 60px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 66);
  g.globalAlpha = .18; g.fillStyle = '#000';
  for (let i = 0; i < 512; i += 8) g.fillRect(i, 0, 2, 128);
  return c;
}

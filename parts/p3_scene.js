/* ============================================================
   场景 / 天空 / 光照
   ============================================================ */
let renderer, scene, camera, sunLight, hemi, ambient, skyMesh, moonLight;
let pmrem, envRT = null;

const SKY_U = {
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uZenith: { value: new THREE.Color('#3f7fc4') },
  uHorizon: { value: new THREE.Color('#c3d8e8') },
  uGround: { value: new THREE.Color('#6b6f6a') },
  uSunCol: { value: new THREE.Color('#fff4e0') },
  uCloud: { value: 0.12 },
  uCloudCol: { value: new THREE.Color('#ffffff') },
  uCloudDark: { value: new THREE.Color('#8d949c') },
  uHaze: { value: 0.25 },
  uNight: { value: 0.0 },
  uTime: { value: 0.0 }
};

const SKY_VS = `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_Position = projectionMatrix * mv;
}`;

const SKY_FS = `
precision highp float;
varying vec3 vDir;
uniform vec3 uSunDir,uZenith,uHorizon,uGround,uSunCol,uCloudCol,uCloudDark;
uniform float uCloud,uHaze,uNight,uTime;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.07; a*=0.5; }
  return v;
}
float hash3(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }

void main(){
  vec3 d = normalize(vDir);
  float up = clamp(d.y, -1.0, 1.0);

  // 天穹渐变
  float t = pow(clamp(up,0.0,1.0), 0.52);
  vec3 col = mix(uHorizon, uZenith, t);

  // 地平线雾霾
  float haze = 1.0 - smoothstep(-0.04, 0.30 + uHaze*0.25, up);
  col = mix(col, uHorizon*0.93, haze*0.72*uHaze);

  // 地面半球（低于地平线）
  col = mix(col, uGround, smoothstep(0.02,-0.06,up));

  // 星空
  if(uNight > 0.02 && up > -0.02){
    vec3 sp = floor(d*230.0);
    float s = hash3(sp);
    float star = smoothstep(0.9975, 1.0, s) * uNight;
    star *= smoothstep(0.0, 0.25, up);
    col += vec3(star*1.5);
  }

  // 太阳
  float cd = max(dot(d,uSunDir), 0.0);
  float disc = smoothstep(0.99965, 0.99992, cd);
  float glow1 = pow(cd, 900.0)*1.6;
  float glow2 = pow(cd, 24.0)*0.16;
  float glow3 = pow(cd, 5.0)*0.05;
  col += uSunCol * ((disc*3.4 + glow1 + glow2 + glow3) * smoothstep(-0.10, 0.02, uSunDir.y));

  // 月亮（太阳反方向）
  float md = max(dot(d, -uSunDir), 0.0);
  float moon = smoothstep(0.9990, 0.99975, md) * uNight;
  col += vec3(0.75,0.80,0.92) * moon * 1.6;

  // 云层
  if(up > -0.03){
    vec2 cuv = d.xz / max(up*0.85 + 0.16, 0.18);
    cuv = cuv / (1.0 + length(cuv) * 0.05);     // 远处软压缩，压制高频格子
    vec2 drift = vec2(uTime*0.0022, uTime*0.0011);
    float f = fbm(cuv*0.55 + drift);
    f = mix(f, fbm(cuv*1.45 - drift*1.4), 0.38);
    float lo = 1.02 - uCloud*1.02;
    float hi = max(lo + 0.42, 1.36 - uCloud*1.10);
    float cov = smoothstep(lo, hi, f);
    cov *= smoothstep(-0.03, 0.14, up);
    float shade = fbm(cuv*1.05 + drift*0.8 + 3.1);
    vec3 cc = mix(uCloudDark, uCloudCol, smoothstep(0.32, 0.72, shade));
    // 云边缘受阳光染色
    float sunSide = pow(max(dot(normalize(d + vec3(0.0,0.35,0.0)), uSunDir),0.0), 3.0);
    cc += uSunCol * sunSide * 0.30 * smoothstep(-0.02,0.18,uSunDir.y);
    col = mix(col, cc, cov*0.96);
  }

  gl_FragColor = vec4(col, 1.0);
}`;

function initScene() {
  const app = document.getElementById('app');
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.85));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  app.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xbfd2e0, 0.00132);

  camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, 0.4, 9000);
  camera.position.set(168, 152, 178);
  camera.lookAt(0, 0, 0);

  // 天空穹顶
  const skyGeo = new THREE.SphereGeometry(4200, 48, 32);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: SKY_U, vertexShader: SKY_VS, fragmentShader: SKY_FS,
    side: THREE.BackSide, depthWrite: false, fog: false
  });
  skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.frustumCulled = false;
  scene.add(skyMesh);

  // 太阳光
  sunLight = new THREE.DirectionalLight(0xfff2dd, 2.6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(3072, 3072);
  const sc = sunLight.shadow.camera;
  sc.left = -520; sc.right = 520; sc.top = 520; sc.bottom = -520;
  sc.near = 1; sc.far = 1600;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.7;
  sunLight.shadow.radius = 2;
  scene.add(sunLight);
  scene.add(sunLight.target);

  moonLight = new THREE.DirectionalLight(0x9db4d8, 0.0);
  scene.add(moonLight);

  hemi = new THREE.HemisphereLight(0xbcd7f0, 0x5c5848, 1.05);
  scene.add(hemi);

  ambient = new THREE.AmbientLight(0xffffff, 0.16);
  scene.add(ambient);

  pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
}

/* ---------- 太阳位置（真实天文，孝感 30.92°N）---------- */
const LAT = 30.92 * DEG;
function sunPosition(hour, dayOfYear) {
  const decl = 23.44 * DEG * Math.sin(TAU * (dayOfYear - 81) / 365.24);
  const H = (hour - 12) * 15 * DEG;
  const sinEl = Math.sin(LAT) * Math.sin(decl) + Math.cos(LAT) * Math.cos(decl) * Math.cos(H);
  const el = Math.asin(clamp(sinEl, -1, 1));
  let cosAz = (Math.sin(decl) - Math.sin(el) * Math.sin(LAT)) / (Math.cos(el) * Math.cos(LAT) + 1e-9);
  cosAz = clamp(cosAz, -1, 1);
  let az = Math.acos(cosAz);
  if (H > 0) az = TAU - az;              // 下午偏西
  const dir = new THREE.Vector3(
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
    -Math.cos(el) * Math.cos(az)
  ).normalize();
  return { dir, el, az, decl };
}

/* ---------- 天空/光照随天气更新 ---------- */
const SKY_DAY = { zen: 0x1560c4, hor: 0x9ec7e8 };
const SKY_DUSK = { zen: 0x1f3c66, hor: 0xff9b5e };
const SKY_NIGHT = { zen: 0x03060d, hor: 0x0d1726 };

let _lastEnvT = -99;
function updateSky(force) {
  const st = S;
  const sp = st.sun;
  const el = sp.el;
  const dp = st.wx;
  SKY_U.uSunDir.value.copy(sp.dir);
  SKY_U.uTime.value = performance.now() * 0.001;

  const dayT = smoothstep(-6 * DEG, 22 * DEG, el);      // 0 夜 → 1 昼
  const duskT = Math.exp(-Math.pow((el - 2 * DEG) / (9 * DEG), 2));  // 日出日落强度
  const nightT = 1 - smoothstep(-10 * DEG, 1 * DEG, el);

  // 基础天穹色
  const zen = new THREE.Color(SKY_NIGHT.zen).lerp(new THREE.Color(SKY_DAY.zen), dayT);
  const hor = new THREE.Color(SKY_NIGHT.hor).lerp(new THREE.Color(SKY_DAY.hor), dayT);
  zen.lerp(new THREE.Color(SKY_DUSK.zen), duskT * 0.55);
  hor.lerp(new THREE.Color(SKY_DUSK.hor), duskT * 0.85);

  // 阴天/雨天压暗、去饱和
  const gr = dp.gloom;                     // 0 晴 → 1 阴沉
  zen.lerp(new THREE.Color(0x5a636e).multiplyScalar(0.35 + dayT * 0.65), gr * 0.72);
  hor.lerp(new THREE.Color(0x8d959f).multiplyScalar(0.32 + dayT * 0.68), gr * 0.78);

  SKY_U.uZenith.value.copy(zen);
  SKY_U.uHorizon.value.copy(hor);
  SKY_U.uGround.value.setHex(0x4a4f45).multiplyScalar(0.35 + dayT * 0.65);
  SKY_U.uCloud.value = dp.cloud;
  SKY_U.uHaze.value = dp.haze;
  SKY_U.uNight.value = nightT;

  // 太阳 / 天空光颜色
  const sunCol = new THREE.Color(0xfff3df);
  sunCol.lerp(new THREE.Color(0xff8b3d), clamp(duskT * 1.15, 0, 1));
  sunCol.lerp(new THREE.Color(0x8fa2b8), gr * 0.62);
  SKY_U.uSunCol.value.copy(sunCol);
  SKY_U.uCloudCol.value.setHex(0xffffff).lerp(sunCol, 0.32 * (1 - gr) + 0.1);
  SKY_U.uCloudDark.value.setHex(0x8d949c).lerp(new THREE.Color(0x4a5159), gr * 0.85);

  const sunI = clamp(smoothstep(-2.5 * DEG, 14 * DEG, el), 0, 1);
  sunLight.color.copy(sunCol);
  sunLight.intensity = (0.18 + 2.95 * sunI) * (1 - gr * 0.62) * (1 - dp.rain * 0.28);
  sunLight.position.copy(sp.dir).multiplyScalar(620);
  sunLight.target.position.set(0, 0, 0);
  sunLight.castShadow = sunI > 0.06 && gr < 0.86;

  moonLight.intensity = nightT * 0.42 * (1 - gr * 0.5);
  moonLight.position.copy(sp.dir).multiplyScalar(-500).setY(320);

  hemi.color.copy(zen).lerp(new THREE.Color(0xffffff), 0.3);
  hemi.groundColor.setHex(0x50503f).multiplyScalar(0.4 + dayT * 0.6);
  hemi.intensity = (0.28 + 1.05 * dayT) * (1 - gr * 0.2);
  ambient.intensity = 0.06 + 0.13 * dayT + 0.06 * gr;

  // 雾
  const fogC = hor.clone().lerp(new THREE.Color(0x9aa3ab), gr * 0.55);
  scene.fog.color.copy(fogC);
  scene.fog.density = dp.fogDensity;

  // 环境反射（限流刷新）
  const now = performance.now();
  if ((force || Math.abs(now - _lastEnvT) > 2600) && pmrem) {
    _lastEnvT = now;
    try {
      const tmp = new THREE.Scene();
      const m = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), skyMesh.material);
      tmp.add(m);
      const rt = pmrem.fromScene(tmp, 0, 0.1, 100);
      if (envRT) envRT.dispose();
      envRT = rt;
      scene.environment = rt.texture;
      m.geometry.dispose();
    } catch (e) { }
  }
}

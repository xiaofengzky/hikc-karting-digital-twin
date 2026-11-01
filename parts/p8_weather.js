/* ============================================================
   降水 / 闪电 / 赛道湿滑视觉
   ============================================================ */
let rainMesh, rainUni, snowMesh, snowUni, flash = 0, flashTimer = 6;

const RAIN_VS = `
attribute vec3 aOff;
attribute float aSpeed;
attribute float aEnd;
uniform float uTime, uIntensity, uH;
uniform vec3 uCam;
varying float vA;
void main(){
  vec3 p = aOff;
  float W = 120.0, D = 120.0;
  p.x = mod(p.x - uCam.x + W*0.5, W) - W*0.5 + uCam.x;
  p.z = mod(p.z - uCam.z + D*0.5, D) - D*0.5 + uCam.z;
  float fall = mod(p.y - uTime * aSpeed, uH);
  p.y = fall + uCam.y - uH * 0.30;
  p.y += aEnd * (0.9 + aSpeed * 0.035);
  p.x += aEnd * 0.14;
  vA = 1.0 - aEnd * 0.35;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const RAIN_FS = `
precision mediump float;
uniform float uOpacity;
varying float vA;
void main(){
  gl_FragColor = vec4(0.56, 0.64, 0.74, vA * uOpacity);
}`;

function buildRain() {
  const N = 7000;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 2 * 3);
  const off = new Float32Array(N * 2 * 3);
  const spd = new Float32Array(N * 2);
  const end = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const x = sr(-60, 60), y = sr(0, 90), z = sr(-60, 60), v = sr(22, 40);
    for (let e = 0; e < 2; e++) {
      const k = (i * 2 + e) * 3;
      off[k] = x; off[k + 1] = y; off[k + 2] = z;
      spd[i * 2 + e] = v;
      end[i * 2 + e] = e;
    }
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aOff', new THREE.BufferAttribute(off, 3));
  g.setAttribute('aSpeed', new THREE.BufferAttribute(spd, 1));
  g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  rainUni = {
    uTime: { value: 0 }, uIntensity: { value: 1 }, uH: { value: 90 },
    uCam: { value: new THREE.Vector3() }, uOpacity: { value: 0.55 }
  };
  rainMesh = new THREE.LineSegments(g, new THREE.ShaderMaterial({
    uniforms: rainUni, vertexShader: RAIN_VS, fragmentShader: RAIN_FS,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending
  }));
  rainMesh.frustumCulled = false;
  rainMesh.visible = false;
  scene.add(rainMesh);
}

const SNOW_VS = `
attribute vec3 aOff;
attribute float aSpeed;
uniform float uTime;
uniform vec3 uCam;
varying float vA;
void main(){
  vec3 p = aOff;
  float W = 130.0, H = 80.0;
  p.x = mod(p.x - uCam.x + W*0.5, W) - W*0.5 + uCam.x;
  p.z = mod(p.z - uCam.z + W*0.5, W) - W*0.5 + uCam.z;
  float fall = mod(p.y - uTime * aSpeed, H);
  p.y = fall + uCam.y - H * 0.28;
  p.x += sin(uTime * 0.9 + aOff.x * 0.7) * 1.6;
  p.z += cos(uTime * 0.75 + aOff.z * 0.6) * 1.6;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vA = clamp(1.0 - length(mv.xyz) / 110.0, 0.0, 1.0);
  gl_PointSize = clamp(260.0 / -mv.z, 1.2, 6.0);
  gl_Position = projectionMatrix * mv;
}`;

const SNOW_FS = `
precision mediump float;
uniform float uOpacity;
varying float vA;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  if(dot(d,d) > 0.25) discard;
  gl_FragColor = vec4(0.97, 0.98, 1.0, vA * uOpacity);
}`;

function buildSnow() {
  const N = 5200;
  const g = new THREE.BufferGeometry();
  const off = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    off[i * 3] = sr(-65, 65); off[i * 3 + 1] = sr(0, 80); off[i * 3 + 2] = sr(-65, 65);
    spd[i] = sr(1.6, 4.2);
  }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  g.setAttribute('aOff', new THREE.BufferAttribute(off, 3));
  g.setAttribute('aSpeed', new THREE.BufferAttribute(spd, 1));
  snowUni = {
    uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uOpacity: { value: 0.85 }
  };
  snowMesh = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: snowUni, vertexShader: SNOW_VS, fragmentShader: SNOW_FS,
    transparent: true, depthWrite: false
  }));
  snowMesh.frustumCulled = false;
  snowMesh.visible = false;
  scene.add(snowMesh);
}

/* ---- 每帧更新天气视觉 ---- */
function updateWeatherVisual(dt, t) {
  const w = S.wx;

  // 雨
  const rainOn = w.rain > 0.015;
  rainMesh.visible = rainOn;
  if (rainOn) {
    rainUni.uTime.value = t;
    rainUni.uCam.value.copy(camera.position);
    rainUni.uIntensity.value = w.rain;
    rainUni.uOpacity.value = clamp(0.10 + w.rain * 0.40, 0, 0.52);
    rainMesh.material.opacity = 1;
  }

  // 雪
  const snowOn = w.snow > 0.02;
  snowMesh.visible = snowOn;
  if (snowOn) {
    snowUni.uTime.value = t;
    snowUni.uCam.value.copy(camera.position);
    snowUni.uOpacity.value = clamp(w.snow * 0.95, 0, 0.95);
  }

  // 赛道湿滑
  const rho = S.wet;
  if (roadMat) {
    roadMat.roughness = lerp(0.94, 0.12, Math.pow(rho, 0.75));
    const c = lerp(1.0, 0.58, Math.pow(rho, 0.6));
    roadMat.color.setRGB(c, c, c * 1.02);
    roadMat.metalness = lerp(0.0, 0.32, rho);
    roadMat.envMapIntensity = lerp(0.28, 1.15, rho);
    if (wetLayer) {
      wetLayer.material.opacity = smoothstep(0.12, 0.92, rho) * 0.28;
      wetLayer.material.roughness = lerp(0.06, 0.02, rho);
      wetLayer.visible = rho > 0.1;
    }
    if (kerbMesh) {
      const f = lerp(1.0, 0.74, rho);
      kerbMesh.material.color.setRGB(f, f, f);
      kerbMesh.material.roughness = lerp(0.66, 0.30, rho);
    }
  }
  // 地面湿
  const terr = scene.getObjectByName('terrain');
  if (terr) terr.material.roughness = lerp(0.97, 0.55, rho * 0.8);

  // 雪堆积（地面变白）
  if (terr) {
    const snowAmt = clamp(S.snowCover || 0, 0, 1);
    if (snowAmt > 0.01) {
      terr.material.color.setRGB(1, 1, 1);
      // 通过 vertexColors 无法直接叠加，改用整体提亮
      terr.material.emissive = new THREE.Color(0x30333a);
      terr.material.emissiveIntensity = snowAmt * 0.35;
    } else {
      terr.material.emissiveIntensity = 0;
    }
  }

  // 水面
  if (waterUni) {
    waterUni.uTime.value = t;
    waterUni.uWind.value = 0.35 + w.wind * 0.09;
    waterUni.uSunDir.value.copy(S.sun.dir);
    waterUni.uSkyCol.value.copy(SKY_U.uHorizon.value).lerp(SKY_U.uZenith.value, 0.35);
    waterUni.uSunCol.value.copy(SKY_U.uSunCol.value);
    const deep = new THREE.Color(0x10262c).multiplyScalar(0.35 + 0.65 * (1 - SKY_U.uNight.value));
    waterUni.uDeepCol.value.copy(deep);
    waterUni.uFogCol.value.copy(scene.fog.color);
    waterUni.uFogD.value = scene.fog.density;
  }

  // 灯塔夜间
  const nightF = SKY_U.uNight.value;
  floodLights.forEach((h, i) => {
    h.material.emissive.setRGB(1, 0.97, 0.88);
    h.material.emissiveIntensity = nightF * 1.4 + (w.gloom > 0.7 ? 0.25 : 0);
  });

  // 雷暴闪电
  if (w.gloom > 0.8 && w.rain > 0.55) {
    flashTimer -= dt;
    if (flashTimer <= 0) {
      flashTimer = rnd(2.5, 11);
      flash = 1;
    }
  }
  if (flash > 0) {
    flash = Math.max(0, flash - dt * 9);
    const f = flash * flash;
    ambient.intensity += f * 3.2;
    hemi.intensity += f * 2.4;
    sunLight.intensity += f * 1.6;
  }
}

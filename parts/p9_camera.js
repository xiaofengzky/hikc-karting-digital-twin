/* ============================================================
   相机控制
   ============================================================ */
const CAM = {
  mode: 'orbit',
  center: new THREE.Vector3(0, 2, 0),
  theta: 0.95, phi: 0.80, radius: 252,
  pos: new THREE.Vector3(168, 152, 178),
  look: new THREE.Vector3(0, 0, 0),
  dPos: new THREE.Vector3(168, 152, 178),
  dLook: new THREE.Vector3(0, 0, 0),
  yaw: -0.8, pitch: -0.35,
  keys: {},
  dragging: false,
  lastX: 0, lastY: 0,
  lapS: 0,
  trans: 0,
  speedMul: 1
};

function initCamera() {
  const dom = renderer.domElement;

  const down = (e) => {
    CAM.dragging = true;
    CAM.lastX = e.clientX; CAM.lastY = e.clientY;
    dom.style.cursor = 'grabbing';
  };
  const move = (e) => {
    if (!CAM.dragging) return;
    const dx = e.clientX - CAM.lastX, dy = e.clientY - CAM.lastY;
    CAM.lastX = e.clientX; CAM.lastY = e.clientY;
    if (CAM.mode === 'fly') {
      CAM.yaw -= dx * 0.0032;
      CAM.pitch = clamp(CAM.pitch - dy * 0.0028, -1.35, 1.25);
    } else if (CAM.mode === 'orbit') {
      CAM.theta -= dx * 0.0055;
      CAM.phi = clamp(CAM.phi + dy * 0.0042, 0.06, 1.45);
    } else {
      // 预设/巡游模式下拖拽转自由
      setCamMode('orbit', false);
      CAM.theta -= dx * 0.0055;
      CAM.phi = clamp(CAM.phi + dy * 0.0042, 0.06, 1.45);
    }
  };
  const up = () => { CAM.dragging = false; dom.style.cursor = 'grab'; };

  dom.addEventListener('pointerdown', down);
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  dom.style.cursor = 'grab';

  dom.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (CAM.mode === 'fly') {
      const f = camera.getWorldDirection(new THREE.Vector3());
      CAM.pos.addScaledVector(f, -Math.sign(e.deltaY) * 14);
    } else {
      CAM.radius = clamp(CAM.radius * (1 + Math.sign(e.deltaY) * 0.11), 45, 1500);
    }
  }, { passive: false });

  // 触摸
  let touchDist = 0;
  dom.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      touchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: true });
  dom.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY);
      CAM.radius = clamp(CAM.radius * (1 - (d - touchDist) * 0.0035), 45, 1500);
      touchDist = d;
    }
  }, { passive: true });

  addEventListener('keydown', (e) => {
    CAM.keys[e.code] = true;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code) && CAM.mode !== 'fly') {
      // 自动切到漫游
    }
    if (e.code === 'Digit1') setCamMode('orbit');
    if (e.code === 'Digit2') setCamMode('fly');
    if (e.code === 'Digit3') setCamMode('t1');
    if (e.code === 'Digit4') setCamMode('grand');
    if (e.code === 'Digit5') setCamMode('pit');
    if (e.code === 'Digit6') setCamMode('lap');
    if (e.code === 'Digit7') setCamMode('lake');
    if (e.code === 'KeyF') setCamMode('fpv');
  });
  addEventListener('keyup', (e) => { CAM.keys[e.code] = false; });
}

function presetView(name) {
  const C = TRACK_DATA.corners;
  const view = (p, l) => ({ p: new THREE.Vector3(...p), l: new THREE.Vector3(...l) });
  switch (name) {
    case 'orbit':
      CAM.center.set(0, 2, 0);
      CAM.radius = 218; CAM.theta = 0.98; CAM.phi = 0.76;
      return { spin: true };
    case 't1': {
      const c = C[0];
      const t = trackAt(c.s + 30);
      const out = c.side > 0 ? -1 : 1;
      const p = t.p.clone().addScaledVector(t.nrm, out * (t.hw + 13)).add(new THREE.Vector3(0, 5, 0));
      const l = t.p.clone();
      return view([p.x, p.y, p.z], [l.x, l.y + 1, l.z]);
    }
    case 'grand': {
      const t0 = trackAt(16), t1 = trackAt(56);
      const p = t0.p.clone().addScaledVector(t0.nrm, (t0.hw + 41));
      return view([p.x, 7.8, p.z], [t1.p.x, 0.6, t1.p.z]);
    }
    case 'pit': {
      const t0 = trackAt(30), t1 = trackAt(66);
      const p = t0.p.clone().addScaledVector(t0.nrm, (t0.hw + 14));
      return view([p.x, 3.4, p.z], [t1.p.x, 0.9, t1.p.z]);
    }
    case 'lake': {
      const t = trackAt(150);
      return view([312, 34, 66], [t.p.x, t.p.y + 2, t.p.z]);
    }
    case 'fpv': {
      return { free: true };
    }
    case 'fly': {
      const d = camera.getWorldDirection(new THREE.Vector3());
      CAM.pos.copy(camera.position);
      CAM.yaw = Math.atan2(d.x, d.z);
      CAM.pitch = Math.asin(clamp(d.y, -1, 1));
      return { free: true };
    }
  }
  return null;
}

function setCamMode(name, animate = true) {
  if (name === 'lap') {
    CAM.mode = 'lap';
    CAM.lapS = 0;
    const t = trackAt(0);
    CAM.pos.copy(t.p).add(new THREE.Vector3(0, 9, 0));
    document.querySelectorAll('#views button').forEach(b => b.classList.toggle('on', b.dataset.v === 'lap'));
    return;
  }
  const v = presetView(name);
  CAM.mode = name;
  if (v && !v.spin && !v.free) {
    if (animate) {
      CAM.dPos.copy(v.p); CAM.dLook.copy(v.l);
      CAM.pos.copy(camera.position);
      CAM.look.copy(v.l);
      CAM.trans = 1;
    } else {
      CAM.pos.copy(v.p); CAM.look.copy(v.l);
      CAM.dPos.copy(v.p); CAM.dLook.copy(v.l);
    }
  }
  document.querySelectorAll('#views button').forEach(b => b.classList.toggle('on', b.dataset.v === name));
}

function updateCamera(dt) {
  const damp = 1 - Math.pow(0.0009, dt);

  // FPV 用广角，其余恢复常规
  const wantFov = CAM.mode === 'fpv' ? 78 : 55;
  if (Math.abs(camera.fov - wantFov) > 0.2) {
    camera.fov += (wantFov - camera.fov) * Math.min(dt * 6, 1);
    camera.updateProjectionMatrix();
  }

  if (CAM.mode === 'orbit') {
    const st = Math.sin(CAM.phi), ct = Math.cos(CAM.phi);
    CAM.dPos.set(
      CAM.center.x + CAM.radius * st * Math.sin(CAM.theta),
      CAM.center.y + CAM.radius * ct + 8,
      CAM.center.z + CAM.radius * st * Math.cos(CAM.theta)
    );
    CAM.dLook.copy(CAM.center);
    CAM.pos.lerp(CAM.dPos, damp * 0.9);
    CAM.look.lerp(CAM.dLook, damp * 0.9);
  } else if (CAM.mode === 'fpv') {
    if (RUNNER && RUNNER.ready) {
      const back = RUNNER.dir.clone().multiplyScalar(-3.4);
      const target = RUNNER.pos.clone().add(back);
      target.y += 1.30;
      CAM.pos.lerp(target, Math.min(dt * 14, 1));
      const look = RUNNER.pos.clone().addScaledVector(RUNNER.dir, 24);
      look.y += 0.85;
      CAM.look.lerp(look, Math.min(dt * 12, 1));
      camera.position.copy(CAM.pos);
      camera.up.set(0, 1, 0);
      camera.lookAt(CAM.look);
      camera.rotateZ(RUNNER.roll * 0.42);
      return;
    }
  } else if (CAM.mode === 'fly') {
    const sp = (CAM.keys.ShiftLeft || CAM.keys.ShiftRight ? 135 : 46) * dt;
    const fwd = new THREE.Vector3(
      Math.cos(CAM.pitch) * Math.sin(CAM.yaw), Math.sin(CAM.pitch), Math.cos(CAM.pitch) * Math.cos(CAM.yaw)
    ).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    if (CAM.keys.KeyW) CAM.pos.addScaledVector(fwd, sp);
    if (CAM.keys.KeyS) CAM.pos.addScaledVector(fwd, -sp);
    if (CAM.keys.KeyD) CAM.pos.addScaledVector(right, sp);
    if (CAM.keys.KeyA) CAM.pos.addScaledVector(right, -sp);
    if (CAM.keys.KeyQ) CAM.pos.y -= sp * 0.8;
    if (CAM.keys.KeyE) CAM.pos.y += sp * 0.8;
    CAM.pos.y = Math.max(CAM.pos.y, terrainHeight(CAM.pos.x, CAM.pos.z) + 1.6);
    CAM.look.copy(CAM.pos).add(fwd);
  } else if (CAM.mode === 'lap') {
    CAM.lapS = (CAM.lapS + dt * 26) % TRACK.L;
    const t = trackAt(CAM.lapS);
    const t2 = trackAt(CAM.lapS + 42);
    const p = t.p.clone().addScaledVector(t.nrm, -t.hw * 0.25);
    p.y += 3.4;
    CAM.pos.lerp(p, damp * 0.5);
    CAM.look.lerp(t2.p.clone().add(new THREE.Vector3(0, 1.6, 0)), damp * 0.5);
  } else {
    // 预设视角：平滑过渡
    CAM.pos.lerp(CAM.dPos, damp * 0.55);
    CAM.look.lerp(CAM.dLook, damp * 0.55);
  }

  camera.position.copy(CAM.pos);
  camera.lookAt(CAM.look);

  // 视场角随速度轻微变化（巡游时）
  const targetFov = CAM.mode === 'lap' ? 66 : 56;
  camera.fov += (targetFov - camera.fov) * damp * 0.3;
  camera.updateProjectionMatrix();
}

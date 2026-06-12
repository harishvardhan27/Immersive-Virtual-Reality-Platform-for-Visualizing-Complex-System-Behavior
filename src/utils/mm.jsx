import { useEffect, useRef } from "react";
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { useNetworkStore } from "../store/networkStore";

const NEURON_R     = 0.44;
const TRAIL_COUNT  = 6;
const TRAIL_T_OFF  = [0, 0.09, 0.18, 0.28, 0.38, 0.50];
const TRAIL_OPAC   = [1.0, 0.70, 0.42, 0.22, 0.10, 0.04];
const TRAIL_SCALE  = [1.0, 0.78, 0.60, 0.44, 0.30, 0.18];
const PULSE_BASE_R = 0.20;
const PULSE_SPEED  = 0.95;

function makeRng(seed) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

function normDisp(val, fn, layerCount, layer) {
  if (layer === 0 || layer === layerCount - 1) return Math.max(0, Math.min(1, val));
  if (fn === "tanh") return (val + 1) / 2;
  if (fn === "relu" || fn === "leaky_relu") return Math.min(1, Math.max(0, val / 2.5));
  return Math.max(0, Math.min(1, val));
}

function actToRGB(t) {
  t = Math.max(0, Math.min(1, t));
  let r, g, b;
  if      (t < 0.25) { const s=t/0.25;        r=0.02+s*0.04; g=0.05+s*0.38; b=0.18+s*0.62; }
  else if (t < 0.50) { const s=(t-0.25)/0.25; r=0.06+s*0.04; g=0.43+s*0.40; b=0.80-s*0.52; }
  else if (t < 0.75) { const s=(t-0.50)/0.25; r=0.10+s*0.82; g=0.83-s*0.13; b=0.28-s*0.28; }
  else               { const s=(t-0.75)/0.25; r=0.92+s*0.08; g=0.70-s*0.70; b=0; }
  return [r, g, b];
}

function buildOrganicPositions(layerSizes) {
  const rng = makeRng(42), gold = (1 + Math.sqrt(5)) / 2;
  const xPositions = layerSizes.map((_, l) => -10.5 + (l / (layerSizes.length - 1)) * 21);
  return layerSizes.map((count, l) => {
    if (count === 1) return [new THREE.Vector3(xPositions[l], 0, 0)];
    const yzR = l === 0 || l === layerSizes.length - 1 ? 1.4 : 3.5;
    return Array.from({ length: count }, (_, n) => {
      const theta = 2 * Math.PI * n / gold;
      const r = yzR * Math.sqrt((n + 0.5) / count);
      return new THREE.Vector3(xPositions[l], r * Math.cos(theta), r * Math.sin(theta));
    });
  });
}

function setCam(cam, { theta, phi, r }) {
  cam.position.set(r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.cos(theta));
  cam.lookAt(0, 0, 0);
}

export default function NeuralNetworkViz() {
  const { layerSizes, activationFn, weights, acts, setSelectedNeuron, setIsAnimating, inputs, setInput } = useNetworkStore();

  const mountRef       = useRef(null);
  const clockRef       = useRef(null);
  const mouseRef       = useRef({ down: false, x: 0, y: 0 });
  const camStateRef    = useRef({ theta: 0.22, phi: 1.38, r: 26 });
  const actsRef        = useRef(null);
  const fnRef          = useRef(activationFn);
  const layerSizesRef  = useRef(layerSizes);
  const raycasterRef   = useRef(new THREE.Raycaster());
  const neuronObjsRef  = useRef([]);
  const connObjsRef    = useRef([]);
  const pulseGroupsRef = useRef([]);
  const psRef          = useRef([]);
  const propagRef      = useRef({ startTime: -999, active: false });
  const atmoRef        = useRef([]);
  const vrPanelRef     = useRef(null);
  const vrStateRef     = useRef({ input1: 0.65, input2: 0.35 });
  const selectedRef    = useRef(null);
  const rendererRef    = useRef(null);
  const sceneRef       = useRef(null);

  // Sync refs with store state
  useEffect(() => { actsRef.current = acts; fnRef.current = activationFn; layerSizesRef.current = layerSizes; }, [acts, activationFn, layerSizes]);
  useEffect(() => { vrStateRef.current.input1 = inputs[0]; vrStateRef.current.input2 = inputs[1]; }, [inputs]);

  // Trigger propagation wave when acts update
  useEffect(() => {
    if (!clockRef.current || !acts) return;
    const el = clockRef.current.getElapsedTime();
    neuronObjsRef.current.forEach(l => l.forEach(o => { o.rippleState.triggered = false; }));
    psRef.current.forEach(ps => { ps.t = -1; ps.active = false; });
    pulseGroupsRef.current.forEach(grp => grp.forEach(p => { p.mesh.visible = false; }));
    propagRef.current = { startTime: el, active: true };
    const totalDur = (layerSizes.length - 1) * 0.75 + 2.0;
    setIsAnimating(true);
    const tid = setTimeout(() => { setIsAnimating(false); propagRef.current.active = false; }, totalDur * 1000);
    return () => clearTimeout(tid);
  }, [acts]);

  // Rebuild scene when layerSizes change
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Cleanup previous scene objects (keep renderer)
    neuronObjsRef.current.flat().forEach(o => {
      [o.sphere, o.glow, o.outerGlow, o.ring, o.ring2, o.ripple, o.ripple2].forEach(m => sceneRef.current?.remove(m));
    });
    connObjsRef.current.forEach(c => sceneRef.current?.remove(c.tube));
    pulseGroupsRef.current.flat().forEach(p => sceneRef.current?.remove(p.mesh));
    neuronObjsRef.current = []; connObjsRef.current = []; pulseGroupsRef.current = []; psRef.current = [];

    const scene = sceneRef.current;
    if (!scene) return;

    const positions = buildOrganicPositions(layerSizes);
    const allWAbs = weights.flatMap(({ W }) => W.map(Math.abs));
    const maxW = Math.max(...allWAbs, 0.001);

    const geoNeuron  = new THREE.SphereGeometry(NEURON_R, 28, 28);
    const geoGlow    = new THREE.SphereGeometry(NEURON_R * 2.5, 14, 14);
    const geoOuterG  = new THREE.SphereGeometry(NEURON_R * 4.0, 10, 10);
    const geoRing1   = new THREE.TorusGeometry(NEURON_R * 1.10, 0.030, 8, 36);
    const geoRing2   = new THREE.TorusGeometry(NEURON_R * 1.55, 0.018, 6, 28);
    const geoRipple1 = new THREE.TorusGeometry(NEURON_R * 1.7, 0.045, 6, 32);
    const geoRipple2 = new THREE.TorusGeometry(NEURON_R * 2.8, 0.030, 6, 28);
    const geoPulse   = TRAIL_SCALE.map(sm => new THREE.SphereGeometry(PULSE_BASE_R * sm, 9, 9));

    const neuronObjs = [];
    const rngN = makeRng(99);
    positions.forEach((layerPts, l) => {
      const lObjs = [];
      layerPts.forEach((pos, n) => {
        const mat = new THREE.MeshPhongMaterial({ color: 0x020c1e, emissive: 0x000818, emissiveIntensity: 1.0, shininess: 110, specular: 0x183a60, transparent: true, opacity: 0.94 });
        const sphere = new THREE.Mesh(geoNeuron, mat); sphere.position.copy(pos); sphere.userData = { layer: l, idx: n }; scene.add(sphere);
        const gMat = new THREE.MeshBasicMaterial({ color: 0x001860, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide });
        const glow = new THREE.Mesh(geoGlow, gMat); glow.position.copy(pos); scene.add(glow);
        const ogMat = new THREE.MeshBasicMaterial({ color: 0x000c30, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide });
        const outerGlow = new THREE.Mesh(geoOuterG, ogMat); outerGlow.position.copy(pos); scene.add(outerGlow);
        const r0 = rngN() * Math.PI * 2;
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x003870, transparent: true, opacity: 0.40, blending: THREE.AdditiveBlending, depthWrite: false });
        const ring = new THREE.Mesh(geoRing1, ringMat); ring.position.copy(pos); ring.rotation.set(Math.PI / 3, 0, r0); scene.add(ring);
        const r20 = rngN() * Math.PI * 2;
        const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x002850, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
        const ring2 = new THREE.Mesh(geoRing2, ring2Mat); ring2.position.copy(pos); ring2.rotation.set(Math.PI / 6, r20, Math.PI / 4); scene.add(ring2);
        const rippleMat = new THREE.MeshBasicMaterial({ color: 0x00ffee, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        const ripple = new THREE.Mesh(geoRipple1, rippleMat); ripple.position.copy(pos); scene.add(ripple);
        const ripple2Mat = new THREE.MeshBasicMaterial({ color: 0x4080ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        const ripple2 = new THREE.Mesh(geoRipple2, ripple2Mat); ripple2.position.copy(pos); scene.add(ripple2);
        lObjs.push({ sphere, glow, outerGlow, ring, ring2, ripple, ripple2, mat, gMat, ogMat, ringMat, ring2Mat, rippleMat, ripple2Mat, scaleState: { cur: 1.0, tgt: 1.0 }, rippleState: { active: false, timer: 0, triggered: false }, r0, r20 });
      });
      neuronObjs.push(lObjs);
    });
    neuronObjsRef.current = neuronObjs;

    const connObjs = [];
    const rngC = makeRng(7);
    for (let l = 0; l < layerSizes.length - 1; l++) {
      for (let i = 0; i < layerSizes[l]; i++) {
        for (let j = 0; j < layerSizes[l + 1]; j++) {
          const from = positions[l][i], to = positions[l + 1][j];
          const w = weights[l].W[i * layerSizes[l + 1] + j] ?? 0;
          const normW = Math.abs(w) / maxW;
          const mid = from.clone().lerp(to, 0.5);
          mid.y += (rngC() - 0.5) * 1.6; mid.z += (rngC() - 0.5) * 1.3;
          const curve = new THREE.CatmullRomCurve3([from, mid, to]);
          const geo = new THREE.TubeGeometry(curve, 12, 0.014 + normW * 0.065, 5, false);
          const positiveW = w > 0;
          const baseColor = positiveW ? new THREE.Color(0x003820) : new THREE.Color(0x350800);
          const mat = new THREE.MeshBasicMaterial({ color: baseColor.clone(), transparent: true, opacity: 0.12 + normW * 0.28, blending: THREE.AdditiveBlending, depthWrite: false });
          const tube = new THREE.Mesh(geo, mat); scene.add(tube);
          connObjs.push({ tube, mat, l, i, j, weight: w, normW, curve, positiveW, baseColor: baseColor.clone() });
        }
      }
    }
    connObjsRef.current = connObjs;

    const pulseGroups = connObjs.map(() =>
      Array.from({ length: TRAIL_COUNT }, (_, ti) => {
        const pMat = new THREE.MeshBasicMaterial({ color: 0x00eeff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        const mesh = new THREE.Mesh(geoPulse[ti], pMat); mesh.visible = false; scene.add(mesh);
        return { mesh, mat: pMat };
      })
    );
    pulseGroupsRef.current = pulseGroups;
    psRef.current = connObjs.map(() => ({ t: -1, active: false }));
  }, [layerSizes, weights]);

  // One-time scene + renderer setup
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    clockRef.current = new THREE.Clock();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010915);
    scene.fog = new THREE.FogExp2(0x010915, 0.020);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(52, mount.clientWidth / mount.clientHeight, 0.1, 130);
    setCam(camera, camStateRef.current);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.55;
    renderer.xr.enabled = true;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    const vrBtn = VRButton.createButton(renderer);
    vrBtn.style.cssText = "position:absolute;bottom:24px;left:50%;transform:translateX(-50%);z-index:100;";
    mount.appendChild(vrBtn);

    // VR controllers
    const ctrl0 = renderer.xr.getController(0);
    scene.add(ctrl0);
    const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -20)]);
    ctrl0.add(new THREE.Line(laserGeo, new THREE.LineBasicMaterial({ color: 0x00eeff, transparent: true, opacity: 0.6 })));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00eeff }));
    dot.position.set(0, 0, -20); ctrl0.add(dot);
    const ctrl1 = renderer.xr.getController(1); scene.add(ctrl1);

    // VR floating panel
    const panelGroup = new THREE.Group(); panelGroup.visible = false; scene.add(panelGroup);
    panelGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), new THREE.MeshBasicMaterial({ color: 0x010a1e, transparent: true, opacity: 0.88, side: THREE.DoubleSide })));
    const canvas2d = document.createElement('canvas'); canvas2d.width = 512; canvas2d.height = 192;
    const ctx2d = canvas2d.getContext('2d');
    const panelTex = new THREE.CanvasTexture(canvas2d);
    const panelPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 0.48), new THREE.MeshBasicMaterial({ map: panelTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    panelPlane.position.z = 0.001; panelGroup.add(panelPlane);
    vrPanelRef.current = { group: panelGroup, tex: panelTex, ctx: ctx2d };

    ctrl0.addEventListener('selectstart', () => {
      const origin = new THREE.Vector3(), dir = new THREE.Vector3();
      ctrl0.getWorldPosition(origin); ctrl0.getWorldDirection(dir); dir.negate();
      raycasterRef.current.set(origin, dir);
      const hits = raycasterRef.current.intersectObjects(neuronObjsRef.current.flat().map(o => o.sphere));
      if (hits.length > 0) {
        const { layer, idx } = hits[0].object.userData;
        const prev = selectedRef.current;
        const next = prev?.layer === layer && prev?.idx === idx ? null : { layer, idx };
        selectedRef.current = next;
        setSelectedNeuron(next);
      }
    });

    // Lights
    scene.add(new THREE.AmbientLight(0x080e28, 4.5));
    const kl = new THREE.DirectionalLight(0x2255a0, 1.5); kl.position.set(10, 16, 8); scene.add(kl);
    const al1 = new THREE.PointLight(0x0055ee, 2.2, 35);
    const al2 = new THREE.PointLight(0x00bb88, 1.4, 28);
    const al3 = new THREE.PointLight(0x660044, 1.0, 22);
    [al1, al2, al3].forEach(l => scene.add(l));
    atmoRef.current = [al1, al2, al3];

    // Starfield
    const sg = new THREE.BufferGeometry();
    const sp = new Float32Array(3000); for (let i = 0; i < 3000; i++) sp[i] = (Math.random() - 0.5) * 110;
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x1a3568, size: 0.065, transparent: true, opacity: 0.65 })));
    const grid = new THREE.GridHelper(50, 28, 0x071828, 0x030e1a);
    grid.position.y = -6.5; grid.material.transparent = true; grid.material.opacity = 0.28; scene.add(grid);

    // Mouse controls
    const canvas = renderer.domElement;
    const onMD = e => { mouseRef.current = { down: true, x: e.clientX, y: e.clientY }; };
    const onMM = e => {
      if (!mouseRef.current.down) return;
      const dx = e.clientX - mouseRef.current.x, dy = e.clientY - mouseRef.current.y;
      mouseRef.current.x = e.clientX; mouseRef.current.y = e.clientY;
      camStateRef.current.theta -= dx * 0.0062;
      camStateRef.current.phi = Math.max(0.10, Math.min(Math.PI - 0.10, camStateRef.current.phi + dy * 0.0062));
      setCam(camera, camStateRef.current);
    };
    const onMU = () => { mouseRef.current.down = false; };
    const onW = e => {
      e.preventDefault();
      camStateRef.current.r = Math.max(6, Math.min(48, camStateRef.current.r + e.deltaY * 0.030));
      setCam(camera, camStateRef.current);
    };
    const onCK = e => {
      const rect = canvas.getBoundingClientRect();
      const m = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycasterRef.current.setFromCamera(m, camera);
      const hits = raycasterRef.current.intersectObjects(neuronObjsRef.current.flat().map(o => o.sphere));
      if (hits.length > 0) {
        const { layer, idx } = hits[0].object.userData;
        const prev = selectedRef.current;
        const next = prev?.layer === layer && prev?.idx === idx ? null : { layer, idx };
        selectedRef.current = next;
        setSelectedNeuron(next);
      }
    };
    canvas.addEventListener("mousedown", onMD);
    window.addEventListener("mousemove", onMM);
    window.addEventListener("mouseup", onMU);
    canvas.addEventListener("wheel", onW, { passive: false });
    canvas.addEventListener("click", onCK);

    // Animation loop
    const _v = new THREE.Vector3(), _cA = new THREE.Color(), _cB = new THREE.Color();
    const _green = new THREE.Color(0x00ff70), _red = new THREE.Color(0xff3010);
    const LAYER_DELAYS = layerSizesRef.current.map((_, l) => l * 0.75);

    const animate = () => {
      const dt = Math.min(clockRef.current.getDelta(), 0.05);
      const el = clockRef.current.getElapsedTime();
      const CA = actsRef.current, fn = fnRef.current, prop = propagRef.current;
      const ls = layerSizesRef.current;
      const delays = ls.map((_, l) => l * 0.75);
      const ts = prop.active ? (el - prop.startTime) : Infinity;

      const [a1, a2, a3] = atmoRef.current;
      a1.position.set(Math.cos(el * 0.28) * 16, Math.sin(el * 0.18) * 7, Math.sin(el * 0.28) * 12);
      a2.position.set(Math.cos(el * 0.20 + 2.1) * 14, Math.cos(el * 0.12) * 5, Math.sin(el * 0.20 + 2.1) * 11);
      a3.position.set(-Math.cos(el * 0.15 + 1.0) * 10, Math.sin(el * 0.22 + 3.0) * 6, Math.cos(el * 0.15) * 8);

      if (CA) {
        neuronObjsRef.current.forEach((lObjs, l) => {
          lObjs.forEach((obj, n) => {
            const reached = ts >= delays[l];
            const raw = CA[l]?.[n] ?? 0;
            const dv = reached ? normDisp(raw, fn, ls.length, l) : 0;
            const breathe = 0.045 * Math.sin(el * (2.0 + l * 0.45 + n * 0.38) + l * 1.6 + n);
            _cA.setRGB(...actToRGB(dv));
            obj.mat.color.copy(_cA).multiplyScalar(0.16);
            obj.mat.emissive.copy(_cA); obj.mat.emissiveIntensity = 0.22 + dv * 2.6 + breathe;
            obj.gMat.color.copy(_cA); obj.gMat.opacity = 0.02 + dv * 0.34 + breathe * 0.55; obj.glow.scale.setScalar(0.7 + dv * 0.75);
            obj.ogMat.color.copy(_cA); obj.ogMat.opacity = Math.max(0, dv * 0.10 + breathe * 0.10); obj.outerGlow.scale.setScalar(0.6 + dv);
            obj.ringMat.color.copy(_cA); obj.ringMat.opacity = 0.18 + dv * 0.70;
            obj.ring.rotation.y = el * (0.40 + dv * 0.90); obj.ring.rotation.z = obj.r0 + el * (0.25 + dv * 0.45);
            obj.ring2Mat.color.copy(_cA); obj.ring2Mat.opacity = 0.10 + dv * 0.45;
            obj.ring2.rotation.x = el * -(0.30 + dv * 0.60); obj.ring2.rotation.z = obj.r20 + el * 0.18;
            obj.scaleState.tgt = 1.0 + dv * 0.40;
            obj.scaleState.cur += (obj.scaleState.tgt - obj.scaleState.cur) * Math.min(1, dt * 5.5);
            obj.sphere.scale.setScalar(obj.scaleState.cur);
            if (prop.active && ts >= delays[l] && ts < delays[l] + 0.18 && !obj.rippleState.triggered && dv > 0.04) {
              obj.rippleState.active = true; obj.rippleState.timer = 0; obj.rippleState.triggered = true;
            }
            if (obj.rippleState.active) {
              obj.rippleState.timer += dt;
              const rT = obj.rippleState.timer / 0.70;
              if (rT <= 1) {
                const ease = 1 - (1 - rT) * (1 - rT);
                obj.ripple.scale.setScalar(1.0 + ease * 3.8); obj.rippleMat.color.copy(_cA); obj.rippleMat.opacity = Math.max(0, (1 - rT) * 0.80 * Math.min(1, dv * 2)); obj.ripple.rotation.z = el * 1.2;
                obj.ripple2.scale.setScalar(1.0 + ease * 5.5); obj.ripple2Mat.color.lerpColors(_cA, _cB.setHex(0x4488ff), 0.4); obj.ripple2Mat.opacity = Math.max(0, (1 - rT) * 0.45 * Math.min(1, dv * 2)); obj.ripple2.rotation.z = -el * 0.8;
              } else { obj.rippleMat.opacity = 0; obj.ripple2Mat.opacity = 0; obj.rippleState.active = false; }
            } else { obj.rippleMat.opacity = Math.max(0, obj.rippleMat.opacity * 0.88); obj.ripple2Mat.opacity = Math.max(0, obj.ripple2Mat.opacity * 0.88); }
          });
        });

        connObjsRef.current.forEach((conn, ci) => {
          const { l, i, j, mat, baseColor, normW, positiveW, curve } = conn;
          const fD = ts >= delays[l] ? normDisp(CA[l]?.[i] ?? 0, fn, ls.length, l) : 0;
          const tD = ts >= delays[l + 1] ? normDisp(CA[l + 1]?.[j] ?? 0, fn, ls.length, l + 1) : 0;
          const avg = (fD + tD) * 0.5;
          mat.color.lerpColors(baseColor, positiveW ? _green : _red, avg * 0.65);
          mat.opacity = 0.06 + avg * 0.52 + normW * 0.10;
          const ps = psRef.current[ci];
          if (prop.active && !ps.active && ps.t < 0 && ts >= delays[l]) { ps.active = true; ps.t = Math.min((ts - delays[l]) * PULSE_SPEED, 0.08); }
          const grp = pulseGroupsRef.current[ci];
          if (ps.active) {
            ps.t += dt * PULSE_SPEED;
            if (ps.t > 1.0 + TRAIL_T_OFF[TRAIL_COUNT - 1]) { ps.active = false; ps.t = -1; grp.forEach(p => { p.mesh.visible = false; }); }
            else {
              grp.forEach(({ mesh, mat: pMat }, ti) => {
                const tT = ps.t - TRAIL_T_OFF[ti];
                if (tT < 0 || tT > 1.0) { mesh.visible = false; return; }
                curve.getPoint(tT, _v); mesh.position.copy(_v); mesh.visible = true;
                const arc = Math.sin(tT * Math.PI);
                pMat.color.setHSL(Math.max(0.3, 0.50 - ti * 0.03 - tT * 0.08), 0.85 - ti * 0.08, 0.50 + arc * 0.32);
                pMat.opacity = arc * TRAIL_OPAC[ti] * 0.95;
                mesh.scale.setScalar(Math.max(0.05, (0.6 + arc * 0.9) * TRAIL_SCALE[ti] / TRAIL_SCALE[0]));
              });
            }
          } else { grp.forEach(p => { if (p.mesh.visible) p.mesh.visible = false; }); }
        });
      }

      // VR thumbstick input
      const session = renderer.xr.getSession();
      if (session) {
        [...session.inputSources].forEach(src => {
          if (!src.gamepad) return;
          const thumbY = src.gamepad.axes[3] ?? src.gamepad.axes[1] ?? 0;
          const vs = vrStateRef.current;
          if (src.handedness === 'left' && Math.abs(thumbY) > 0.12) {
            vs.input1 = Math.max(0, Math.min(1, vs.input1 - thumbY * dt * 0.6));
            setInput(0, parseFloat(vs.input1.toFixed(3)));
          }
          if (src.handedness === 'right' && Math.abs(thumbY) > 0.12) {
            vs.input2 = Math.max(0, Math.min(1, vs.input2 - thumbY * dt * 0.6));
            setInput(1, parseFloat(vs.input2.toFixed(3)));
          }
        });
        const vp = vrPanelRef.current;
        if (vp) {
          const cam = renderer.xr.getCamera();
          const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
          vp.group.position.copy(cam.position).addScaledVector(fwd, 1.8);
          vp.group.position.y = cam.position.y - 0.3;
          vp.group.quaternion.copy(cam.quaternion);
          vp.group.visible = true;
          const c = vp.ctx, vs = vrStateRef.current;
          c.clearRect(0, 0, 512, 192);
          c.fillStyle = 'rgba(1,9,30,0.92)'; c.fillRect(0, 0, 512, 192);
          c.strokeStyle = '#0a2858'; c.lineWidth = 2; c.strokeRect(1, 1, 510, 190);
          c.font = 'bold 18px monospace'; c.fillStyle = '#00c2f4'; c.fillText('NEURALVIZ — VR', 16, 28);
          c.font = '13px monospace'; c.fillStyle = '#1a6090';
          c.fillText(`Input 1 (L ↕): ${vs.input1.toFixed(3)}`, 16, 56);
          c.fillText(`Input 2 (R ↕): ${vs.input2.toFixed(3)}`, 16, 76);
          if (CA) {
            const out = CA[CA.length - 1][0];
            const [r2, g2, b2] = actToRGB(out);
            c.fillStyle = `rgb(${Math.round(r2 * 255)},${Math.round(g2 * 255)},${Math.round(b2 * 255)})`;
            c.font = 'bold 28px monospace'; c.fillText(`Output: ${out.toFixed(4)}`, 16, 140);
          }
          const sn = selectedRef.current;
          if (sn) { c.font = '12px monospace'; c.fillStyle = '#00e8ff'; c.fillText(`Selected: Layer ${sn.layer} N${sn.idx + 1}`, 16, 172); }
          vp.tex.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);

    const onResize = () => { camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight); };
    window.addEventListener("resize", onResize);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("mousemove", onMM);
      window.removeEventListener("mouseup", onMU);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousedown", onMD);
      canvas.removeEventListener("wheel", onW);
      canvas.removeEventListener("click", onCK);
      renderer.dispose();
      if (mount.contains(vrBtn)) mount.removeChild(vrBtn);
      if (mount.contains(canvas)) mount.removeChild(canvas);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%", position: "relative", cursor: "crosshair" }} />;
}

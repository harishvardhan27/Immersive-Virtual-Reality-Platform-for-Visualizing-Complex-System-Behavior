import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import useSerial from "../hooks/useSerial";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const LAYER_SIZES  = [2, 5, 4, 1];
const LAYER_NAMES  = ["Input", "Hidden 1", "Hidden 2", "Output"];
const NEURON_R     = 0.44;
const LAYER_DELAYS = [0, 0.75, 1.50, 2.25]; // seconds per layer propagation delay
const TRAIL_COUNT  = 6;
const TRAIL_T_OFF  = [0, 0.09, 0.18, 0.28, 0.38, 0.50];
const TRAIL_OPAC   = [1.0, 0.70, 0.42, 0.22, 0.10, 0.04];
const TRAIL_SCALE  = [1.0, 0.78, 0.60, 0.44, 0.30, 0.18];
const PULSE_BASE_R = 0.20;
const PULSE_SPEED  = 0.95; // t-units/second along connection curve
const SOUND_THRESHOLD = 0.6; // Threshold for triggering extra pulses

// ═══════════════════════════════════════════════════════════════════════════════
// SEEDED PRNG  — stable organic positions across renders
// ═══════════════════════════════════════════════════════════════════════════════
function makeRng(seed) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NETWORK MATH
// ═══════════════════════════════════════════════════════════════════════════════
function boxMuller(mean = 0, std = 1) {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const sigmoid = x => 1 / (1 + Math.exp(-x));
function applyActivation(x, fn) {
  if (fn === "relu")  return Math.max(0, x);
  if (fn === "tanh")  return Math.tanh(x);
  return sigmoid(x);
}
function normDisp(val, fn, layer) {
  if (layer === 0 || layer === LAYER_SIZES.length - 1) return Math.max(0, Math.min(1, val));
  if (fn === "tanh") return (val + 1) / 2;
  if (fn === "relu") return Math.min(1, Math.max(0, val / 2.5));
  return Math.max(0, Math.min(1, val));
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR MAP  0.00→navy | 0.25→blue | 0.50→cyan | 0.75→yellow | 1.00→red
// ═══════════════════════════════════════════════════════════════════════════════
function actToRGB(t) {
  t = Math.max(0, Math.min(1, t));
  let r, g, b;
  if      (t < 0.25) { const s=t/0.25;           r=0.02+s*0.04; g=0.05+s*0.38; b=0.18+s*0.62; }
  else if (t < 0.50) { const s=(t-0.25)/0.25;    r=0.06+s*0.04; g=0.43+s*0.40; b=0.80-s*0.52; }
  else if (t < 0.75) { const s=(t-0.50)/0.25;    r=0.10+s*0.82; g=0.83-s*0.13; b=0.28-s*0.28; }
  else               { const s=(t-0.75)/0.25;    r=0.92+s*0.08; g=0.70-s*0.70; b=0; }
  return [r, g, b];
}
function actToThree(t) { const [r,g,b]=actToRGB(t); return new THREE.Color(r,g,b); }

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHTS SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════
let _weights = null;
function getWeights() {
  if (_weights) return _weights;
  _weights = LAYER_SIZES.slice(0,-1).map((inp,l) => {
    const out = LAYER_SIZES[l+1];
    return { W: Array.from({length:inp*out}, ()=>boxMuller(0,0.88)),
             b: Array.from({length:out},     ()=>boxMuller(0,0.30)), inp, out };
  });
  return _weights;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORWARD PASS
// ═══════════════════════════════════════════════════════════════════════════════
function forwardPass(inputs, fn) {
  const wts=getWeights(), acts=[[...inputs]], rawZ=[[...inputs]];
  let curr=[...inputs];
  wts.forEach(({W,b,inp,out},l)=>{
    const z=[],a=[];
    for(let j=0;j<out;j++){
      let s=b[j]; for(let i=0;i<inp;i++) s+=curr[i]*W[i*out+j]; z.push(s);
      a.push(l===wts.length-1?sigmoid(s):applyActivation(s,fn));
    }
    rawZ.push(z); acts.push(a); curr=a;
  });
  return {acts,rawZ};
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORGANIC BRAIN-LIKE POSITIONS  — Fibonacci spiral clusters per layer
// ═══════════════════════════════════════════════════════════════════════════════
function buildOrganicPositions() {
  const rng=makeRng(42), gold=(1+Math.sqrt(5))/2;
  const cfgs=[
    {x:-10.5, yzR:1.4, xJ:0.0},   // Input   – tight vertical pair
    {x: -3.5, yzR:3.8, xJ:0.55},  // Hidden1 – wide organic cluster
    {x:  3.5, yzR:3.2, xJ:0.50},  // Hidden2 – medium cluster
    {x: 10.5, yzR:0.0, xJ:0.0},   // Output  – single central point
  ];
  return LAYER_SIZES.map((count,l)=>{
    if(count===1) return [new THREE.Vector3(cfgs[l].x,0,0)];
    return Array.from({length:count},(_,n)=>{
      const theta=2*Math.PI*n/gold;
      const r=cfgs[l].yzR*Math.sqrt((n+0.5)/count);
      const xJit=(rng()-0.5)*cfgs[l].xJ;
      return new THREE.Vector3(cfgs[l].x+xJit, r*Math.cos(theta), r*Math.sin(theta));
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA HELPER
// ═══════════════════════════════════════════════════════════════════════════════
function setCam(cam,{theta,phi,r}){
  cam.position.set(r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.cos(theta));
  cam.lookAt(0,0,0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function NeuralNetworkViz() {
  // Arduino Serial Connection
  const { isSupported, isConnected, value: soundLevel, previousValue: prevSoundLevel, rawValue, error, connect, disconnect } = useSerial();
  
  const [useArduino, setUseArduino] = useState(false);
  const [input1,setInput1]           = useState(0.65);
  const [input2,setInput2]           = useState(0.35);
  const [activationFn,setActivationFn] = useState("relu");
  const [outputValue,setOutputValue] = useState(0);
  const [allActs,setAllActs]         = useState(null);
  const [allRawZ,setAllRawZ]         = useState(null);
  const [selectedNeuron,setSelectedNeuron] = useState(null);
  const [isAnimating,setIsAnimating] = useState(false);

  useEffect(()=>{ selectedNeuronRef.current=selectedNeuron; },[selectedNeuron]);
  useEffect(()=>{ if(vrStateRef.current){ vrStateRef.current.input1=input1; vrStateRef.current.input2=input2; }},[input1,input2]);
  
  // Update inputs from Arduino when connected
  useEffect(() => {
    if (isConnected && useArduino) {
      setInput1(soundLevel);
      setInput2(prevSoundLevel);
    }
  }, [soundLevel, prevSoundLevel, isConnected, useArduino]);

  const mountRef        = useRef(null);
  const cameraRef       = useRef(null);
  const animRef         = useRef(null);
  const clockRef        = useRef(null);
  const mouseRef        = useRef({down:false,x:0,y:0});
  const camStateRef     = useRef({theta:0.22,phi:1.38,r:26});
  const actsRef         = useRef(null);
  const fnRef           = useRef("relu");
  const raycasterRef    = useRef(new THREE.Raycaster());
  const neuronObjsRef   = useRef([]); // [l][n]
  const connObjsRef     = useRef([]); // [ci]
  const pulseGroupsRef  = useRef([]); // [ci][ti]
  const psRef           = useRef([]); // connPulseStates [ci]
  const propagRef       = useRef({startTime:-999,active:false});
  const atmoRef         = useRef([]);
  const vrPanelRef      = useRef(null);
  const vrStateRef      = useRef(null);
  const selectedNeuronRef = useRef(null);

  // ─── SCENE INIT ──────────────────────────────────────────────────────────────
  useEffect(()=>{
    const mount=mountRef.current; if(!mount) return;
    clockRef.current=new THREE.Clock();

    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0x010915);
    scene.fog=new THREE.FogExp2(0x010915,0.020);

    const camera=new THREE.PerspectiveCamera(52,mount.clientWidth/mount.clientHeight,0.1,130);
    cameraRef.current=camera;
    setCam(camera,camStateRef.current);

    const renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(mount.clientWidth,mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.55;
    renderer.xr.enabled=true;
    mount.appendChild(renderer.domElement);

    // VR Button
    const vrBtn=VRButton.createButton(renderer);
    vrBtn.style.cssText="position:absolute;bottom:24px;left:50%;transform:translateX(-50%);z-index:100;";
    mount.appendChild(vrBtn);

    // ── VR Controllers ───────────────────────────────────────────────────────
    const ctrl0=renderer.xr.getController(0); // right
    const ctrl1=renderer.xr.getController(1); // left
    scene.add(ctrl0); scene.add(ctrl1);

    // Laser beam for right controller
    const laserGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-20)]);
    const laserMat=new THREE.LineBasicMaterial({color:0x00eeff,transparent:true,opacity:0.6});
    const laser=new THREE.Line(laserGeo,laserMat);
    ctrl0.add(laser);

    // Dot at laser tip
    const dotMesh=new THREE.Mesh(new THREE.SphereGeometry(0.02,8,8),new THREE.MeshBasicMaterial({color:0x00eeff}));
    dotMesh.position.set(0,0,-20); ctrl0.add(dotMesh);

    // VR 3D info panel (floats in scene)
    const panelGroup=new THREE.Group();
    panelGroup.position.set(0,-0.5,-2);
    panelGroup.visible=false;
    scene.add(panelGroup);
    const panelBg=new THREE.Mesh(
      new THREE.PlaneGeometry(1.4,0.5),
      new THREE.MeshBasicMaterial({color:0x010a1e,transparent:true,opacity:0.88,side:THREE.DoubleSide})
    );
    panelGroup.add(panelBg);
    const canvas2d=document.createElement('canvas'); canvas2d.width=512; canvas2d.height=192;
    const ctx2d=canvas2d.getContext('2d');
    const panelTex=new THREE.CanvasTexture(canvas2d);
    const panelPlane=new THREE.Mesh(
      new THREE.PlaneGeometry(1.38,0.48),
      new THREE.MeshBasicMaterial({map:panelTex,transparent:true,side:THREE.DoubleSide,depthWrite:false})
    );
    panelPlane.position.z=0.001;
    panelGroup.add(panelPlane);
    vrPanelRef.current={group:panelGroup,tex:panelTex,ctx:ctx2d,canvas:canvas2d};

    // Controller state
    const vrState={input1:0.65,input2:0.35,prevAxes0:[0,0],prevAxes1:[0,0]};
    vrStateRef.current=vrState;

    // Right trigger → select neuron via ray
    const vrRaycaster=new THREE.Raycaster();
    ctrl0.addEventListener('selectstart',()=>{
      const origin=new THREE.Vector3(); const dir=new THREE.Vector3();
      ctrl0.getWorldPosition(origin);
      ctrl0.getWorldDirection(dir); dir.negate();
      vrRaycaster.set(origin,dir);
      const spheres=neuronObjsRef.current.flat().map(o=>o.sphere);
      const hits=vrRaycaster.intersectObjects(spheres);
      if(hits.length>0){
        const{layer,idx}=hits[0].object.userData;
        setSelectedNeuron(p=>p?.layer===layer&&p?.idx===idx?null:{layer,idx});
      }
    });

    // ── Lights ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x080e28,4.5));
    const kl=new THREE.DirectionalLight(0x2255a0,1.5); kl.position.set(10,16,8); scene.add(kl);
    const fl=new THREE.DirectionalLight(0x001035,0.8); fl.position.set(-10,-6,-8); scene.add(fl);
    const al1=new THREE.PointLight(0x0055ee,2.2,35);
    const al2=new THREE.PointLight(0x00bb88,1.4,28);
    const al3=new THREE.PointLight(0x660044,1.0,22);
    [al1,al2,al3].forEach(l=>scene.add(l));
    atmoRef.current=[al1,al2,al3];

    // ── Background ──────────────────────────────────────────────────────────
    const sg=new THREE.BufferGeometry();
    const sp=new Float32Array(1000*3); for(let i=0;i<3000;i++) sp[i]=(Math.random()-0.5)*110;
    sg.setAttribute("position",new THREE.BufferAttribute(sp,3));
    scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0x1a3568,size:0.065,transparent:true,opacity:0.65})));
    const ng=new THREE.BufferGeometry();
    const np=new Float32Array(300*3); for(let i=0;i<900;i++) np[i]=(Math.random()-0.5)*55;
    ng.setAttribute("position",new THREE.BufferAttribute(np,3));
    scene.add(new THREE.Points(ng,new THREE.PointsMaterial({color:0x003060,size:0.30,transparent:true,opacity:0.13,blending:THREE.AdditiveBlending,depthWrite:false})));
    const grid=new THREE.GridHelper(50,28,0x071828,0x030e1a);
    grid.position.y=-6.5; grid.material.transparent=true; grid.material.opacity=0.28;
    scene.add(grid);

    // ── Build network ────────────────────────────────────────────────────────
    const positions=buildOrganicPositions();
    const weights=getWeights();
    const allWAbs=weights.flatMap(({W})=>W.map(Math.abs));
    const maxW=Math.max(...allWAbs);

    // Shared geometries
    const geoNeuron  = new THREE.SphereGeometry(NEURON_R,28,28);
    const geoGlow    = new THREE.SphereGeometry(NEURON_R*2.5,14,14);
    const geoOuterG  = new THREE.SphereGeometry(NEURON_R*4.0,10,10);
    const geoRing1   = new THREE.TorusGeometry(NEURON_R*1.10,0.030,8,36);
    const geoRing2   = new THREE.TorusGeometry(NEURON_R*1.55,0.018,6,28);
    const geoRipple1 = new THREE.TorusGeometry(NEURON_R*1.7, 0.045,6,32);
    const geoRipple2 = new THREE.TorusGeometry(NEURON_R*2.8, 0.030,6,28);
    const geoPulse   = TRAIL_SCALE.map(sm=>new THREE.SphereGeometry(PULSE_BASE_R*sm,9,9));

    // ── Neuron objects ───────────────────────────────────────────────────────
    const neuronObjs=[];
    const rngN=makeRng(99);
    positions.forEach((layerPts,l)=>{
      const lObjs=[];
      layerPts.forEach((pos,n)=>{
        // Core
        const mat=new THREE.MeshPhongMaterial({color:0x020c1e,emissive:0x000818,emissiveIntensity:1.0,shininess:110,specular:0x183a60,transparent:true,opacity:0.94});
        const sphere=new THREE.Mesh(geoNeuron,mat);
        sphere.position.copy(pos); sphere.userData={layer:l,idx:n};
        scene.add(sphere);
        // Inner glow
        const gMat=new THREE.MeshBasicMaterial({color:0x001860,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide});
        const glow=new THREE.Mesh(geoGlow,gMat); glow.position.copy(pos); scene.add(glow);
        // Outer soft bloom
        const ogMat=new THREE.MeshBasicMaterial({color:0x000c30,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide});
        const outerGlow=new THREE.Mesh(geoOuterG,ogMat); outerGlow.position.copy(pos); scene.add(outerGlow);
        // Ring 1
        const r0=rngN()*Math.PI*2;
        const ringMat=new THREE.MeshBasicMaterial({color:0x003870,transparent:true,opacity:0.40,blending:THREE.AdditiveBlending,depthWrite:false});
        const ring=new THREE.Mesh(geoRing1,ringMat); ring.position.copy(pos); ring.rotation.set(Math.PI/3,0,r0); scene.add(ring);
        // Ring 2
        const r20=rngN()*Math.PI*2;
        const ring2Mat=new THREE.MeshBasicMaterial({color:0x002850,transparent:true,opacity:0.25,blending:THREE.AdditiveBlending,depthWrite:false});
        const ring2=new THREE.Mesh(geoRing2,ring2Mat); ring2.position.copy(pos); ring2.rotation.set(Math.PI/6,r20,Math.PI/4); scene.add(ring2);
        // Ripple 1
        const rippleMat=new THREE.MeshBasicMaterial({color:0x00ffee,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
        const ripple=new THREE.Mesh(geoRipple1,rippleMat); ripple.position.copy(pos); scene.add(ripple);
        // Ripple 2
        const ripple2Mat=new THREE.MeshBasicMaterial({color:0x4080ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
        const ripple2=new THREE.Mesh(geoRipple2,ripple2Mat); ripple2.position.copy(pos); scene.add(ripple2);

        lObjs.push({sphere,glow,outerGlow,ring,ring2,ripple,ripple2,
                    mat,gMat,ogMat,ringMat,ring2Mat,rippleMat,ripple2Mat,
                    scaleState:{cur:1.0,tgt:1.0},
                    rippleState:{active:false,timer:0,triggered:false},
                    r0,r20});
      });
      neuronObjs.push(lObjs);
    });
    neuronObjsRef.current=neuronObjs;

    // ── Curved connections via TubeGeometry ─────────────────────────────────
    const connObjs=[];
    const rngC=makeRng(7);
    for(let l=0;l<LAYER_SIZES.length-1;l++){
      for(let i=0;i<LAYER_SIZES[l];i++){
        for(let j=0;j<LAYER_SIZES[l+1];j++){
          const from=positions[l][i], to=positions[l+1][j];
          const w=weights[l].W[i*LAYER_SIZES[l+1]+j];
          const normW=Math.abs(w)/maxW;
          const tubeR=0.014+normW*0.065;
          const mid=from.clone().lerp(to,0.5);
          mid.y+=(rngC()-0.5)*1.6; mid.z+=(rngC()-0.5)*1.3;
          const curve=new THREE.CatmullRomCurve3([from,mid,to]);
          const geo=new THREE.TubeGeometry(curve,12,tubeR,5,false);
          const positiveW=w>0;
          const baseColor=positiveW?new THREE.Color(0x003820):new THREE.Color(0x350800);
          const mat=new THREE.MeshBasicMaterial({color:baseColor.clone(),transparent:true,opacity:0.12+normW*0.28,blending:THREE.AdditiveBlending,depthWrite:false});
          const tube=new THREE.Mesh(geo,mat); scene.add(tube);
          connObjs.push({tube,mat,l,i,j,fromPos:from.clone(),toPos:to.clone(),
                         weight:w,normW,curve,positiveW,baseColor:baseColor.clone()});
        }
      }
    }
    connObjsRef.current=connObjs;

    // ── Pulse trail pool ─────────────────────────────────────────────────────
    const pulseGroups=connObjs.map(()=>
      Array.from({length:TRAIL_COUNT},(_,ti)=>{
        const pMat=new THREE.MeshBasicMaterial({color:0x00eeff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
        const mesh=new THREE.Mesh(geoPulse[ti],pMat);
        mesh.visible=false; scene.add(mesh);
        return {mesh,mat:pMat};
      })
    );
    pulseGroupsRef.current=pulseGroups;
    psRef.current=connObjs.map(()=>({t:-1,active:false}));

    // ── Mouse controls ───────────────────────────────────────────────────────
    const canvas=renderer.domElement;
    const onMD=e=>{mouseRef.current={down:true,x:e.clientX,y:e.clientY};};
    const onMM=e=>{
      if(!mouseRef.current.down) return;
      const dx=e.clientX-mouseRef.current.x, dy=e.clientY-mouseRef.current.y;
      mouseRef.current.x=e.clientX; mouseRef.current.y=e.clientY;
      camStateRef.current.theta-=dx*0.0062;
      camStateRef.current.phi=Math.max(0.10,Math.min(Math.PI-0.10,camStateRef.current.phi+dy*0.0062));
      setCam(camera,camStateRef.current);
    };
    const onMU=()=>{mouseRef.current.down=false;};
    const onW=e=>{
      e.preventDefault();
      camStateRef.current.r=Math.max(6,Math.min(48,camStateRef.current.r+e.deltaY*0.030));
      setCam(camera,camStateRef.current);
    };
    const onCK=e=>{
      const rect=canvas.getBoundingClientRect();
      const m=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
      raycasterRef.current.setFromCamera(m,camera);
      const hits=raycasterRef.current.intersectObjects(neuronObjsRef.current.flat().map(o=>o.sphere));
      if(hits.length>0){
        const{layer,idx}=hits[0].object.userData;
        setSelectedNeuron(p=>p?.layer===layer&&p?.idx===idx?null:{layer,idx});
      }
    };
    canvas.addEventListener("mousedown",onMD);
    window.addEventListener("mousemove",onMM);
    window.addEventListener("mouseup",onMU);
    canvas.addEventListener("wheel",onW,{passive:false});
    canvas.addEventListener("click",onCK);

    // ── Animation loop ───────────────────────────────────────────────────────
    const _v=new THREE.Vector3(), _cA=new THREE.Color(), _cB=new THREE.Color();
    const _green=new THREE.Color(0x00ff70), _red=new THREE.Color(0xff3010);

    const animate=()=>{
      const dt=Math.min(clockRef.current.getDelta(),0.05);
      const el=clockRef.current.getElapsedTime();
      const CA=actsRef.current, fn=fnRef.current, prop=propagRef.current;
      const ts=prop.active?(el-prop.startTime):Infinity;

      // Atmospheric lights orbit
      const[a1,a2,a3]=atmoRef.current;
      a1.position.set(Math.cos(el*0.28)*16,Math.sin(el*0.18)*7,Math.sin(el*0.28)*12);
      a2.position.set(Math.cos(el*0.20+2.1)*14,Math.cos(el*0.12)*5,Math.sin(el*0.20+2.1)*11);
      a3.position.set(-Math.cos(el*0.15+1.0)*10,Math.sin(el*0.22+3.0)*6,Math.cos(el*0.15)*8);

      if(!CA){renderer.render(scene,camera);return;}

      // ── Neuron updates ─────────────────────────────────────────────────
      neuronObjsRef.current.forEach((lObjs,l)=>{
        const reached=ts>=LAYER_DELAYS[l];
        lObjs.forEach((obj,n)=>{
          const raw=CA[l]?.[n]??0;
          const dv=reached?normDisp(raw,fn,l):0;
          const breathe=0.045*Math.sin(el*(2.0+l*0.45+n*0.38)+l*1.6+n);

          // Core sphere emissive
          _cA.setRGB(...actToRGB(dv));
          obj.mat.color.copy(_cA).multiplyScalar(0.16);
          obj.mat.emissive.copy(_cA);
          obj.mat.emissiveIntensity=0.22+dv*2.6+breathe;

          // Inner glow
          obj.gMat.color.copy(_cA);
          obj.gMat.opacity=0.02+dv*0.34+breathe*0.55;
          obj.glow.scale.setScalar(0.7+dv*0.75);

          // Outer bloom
          obj.ogMat.color.copy(_cA);
          obj.ogMat.opacity=Math.max(0,dv*0.10+breathe*0.10);
          obj.outerGlow.scale.setScalar(0.6+dv*1.0);

          // Rings
          obj.ringMat.color.copy(_cA);
          obj.ringMat.opacity=0.18+dv*0.70;
          obj.ring.rotation.y=el*(0.40+dv*0.90);
          obj.ring.rotation.z=obj.r0+el*(0.25+dv*0.45);
          obj.ring2Mat.color.copy(_cA);
          obj.ring2Mat.opacity=0.10+dv*0.45;
          obj.ring2.rotation.x=el*-(0.30+dv*0.60);
          obj.ring2.rotation.z=obj.r20+el*0.18;

          // Scale animation — scale = 1 + activation * 0.4
          obj.scaleState.tgt=1.0+dv*0.40;
          obj.scaleState.cur+=(obj.scaleState.tgt-obj.scaleState.cur)*Math.min(1,dt*5.5);
          obj.sphere.scale.setScalar(obj.scaleState.cur);

          // Trigger ripple when layer first activates
          const justReached=ts>=LAYER_DELAYS[l]&&ts<LAYER_DELAYS[l]+0.18;
          if(prop.active&&justReached&&!obj.rippleState.triggered&&dv>0.04){
            obj.rippleState.active=true; obj.rippleState.timer=0; obj.rippleState.triggered=true;
          }

          // Ripple animation
          if(obj.rippleState.active){
            obj.rippleState.timer+=dt;
            const rT=obj.rippleState.timer/0.70;
            if(rT<=1){
              const ease=1-(1-rT)*(1-rT); // ease-out quad
              obj.ripple.scale.setScalar(1.0+ease*3.8);
              obj.rippleMat.color.copy(_cA);
              obj.rippleMat.opacity=Math.max(0,(1-rT)*0.80*Math.min(1,dv*2));
              obj.ripple.rotation.z=el*1.2;
              obj.ripple2.scale.setScalar(1.0+ease*5.5);
              obj.ripple2Mat.color.lerpColors(_cA,_cB.setHex(0x4488ff),0.4);
              obj.ripple2Mat.opacity=Math.max(0,(1-rT)*0.45*Math.min(1,dv*2));
              obj.ripple2.rotation.z=-el*0.8;
            } else {
              obj.rippleMat.opacity=0; obj.ripple2Mat.opacity=0;
              obj.rippleState.active=false;
            }
          } else {
            obj.rippleMat.opacity=Math.max(0,obj.rippleMat.opacity*0.88);
            obj.ripple2Mat.opacity=Math.max(0,obj.ripple2Mat.opacity*0.88);
          }
        });
      });

      // ── Connection + pulse updates ──────────────────────────────────────
      connObjsRef.current.forEach((conn,ci)=>{
        const{l,i,j,mat,baseColor,normW,positiveW,curve}=conn;
        const fR=ts>=LAYER_DELAYS[l], tR=ts>=LAYER_DELAYS[l+1];
        const fD=fR?normDisp(CA[l]?.[i]??0,fn,l):0;
        const tD=tR?normDisp(CA[l+1]?.[j]??0,fn,l+1):0;
        const avg=(fD+tD)*0.5;

        mat.color.lerpColors(baseColor,positiveW?_green:_red,avg*0.65);
        mat.opacity=0.06+avg*0.52+normW*0.10;

        // Spawn pulse when this layer's delay is reached
        const ps=psRef.current[ci];
        if(prop.active&&!ps.active&&ps.t<0&&ts>=LAYER_DELAYS[l]){
          ps.active=true;
          ps.t=Math.min((ts-LAYER_DELAYS[l])*PULSE_SPEED,0.08);
        }
        
        // Extra pulse spawn on sound spike (Arduino mode)
        if(useArduino && isConnected && soundLevel > SOUND_THRESHOLD && !ps.active && Math.random() > 0.7){
          ps.active=true;
          ps.t=0;
        }

        // Update trail spheres
        const grp=pulseGroupsRef.current[ci];
        if(ps.active){
          ps.t+=dt*PULSE_SPEED;
          const maxT=1.0+TRAIL_T_OFF[TRAIL_COUNT-1];
          if(ps.t>maxT){
            ps.active=false; ps.t=-1;
            grp.forEach(p=>{p.mesh.visible=false;});
          } else {
            grp.forEach(({mesh,mat:pMat},ti)=>{
              const tT=ps.t-TRAIL_T_OFF[ti];
              if(tT<0||tT>1.0){mesh.visible=false;return;}
              curve.getPoint(tT,_v);
              mesh.position.copy(_v);
              mesh.visible=true;
              const arc=Math.sin(tT*Math.PI);
              const hue=Math.max(0.3,0.50-ti*0.03-tT*0.08);
              pMat.color.setHSL(hue,0.85-ti*0.08,0.50+arc*0.32);
              pMat.opacity=arc*TRAIL_OPAC[ti]*0.95;
              const sw=(0.6+arc*0.9)*TRAIL_SCALE[ti]/TRAIL_SCALE[0];
              mesh.scale.setScalar(Math.max(0.05,sw));
            });
          }
        } else {
          grp.forEach(p=>{if(p.mesh.visible)p.mesh.visible=false;});
        }
      });

      // ── VR Controller thumbstick input (Quest 2) ──────────────────────
      const session=renderer.xr.getSession();
      if(session){
        const sources=[...session.inputSources];
        sources.forEach(src=>{
          if(!src.gamepad) return;
          const axes=src.gamepad.axes; // [touchX, touchY, thumbX, thumbY]
          const thumbY=axes[3]??axes[1]??0;
          const hand=src.handedness;
          const vs=vrStateRef.current;
          if(!vs) return;
          if(hand==='left'  && Math.abs(thumbY)>0.12){
            vs.input1=Math.max(0,Math.min(1,vs.input1-thumbY*dt*0.6));
            setInput1(parseFloat(vs.input1.toFixed(3)));
          }
          if(hand==='right' && Math.abs(thumbY)>0.12){
            vs.input2=Math.max(0,Math.min(1,vs.input2-thumbY*dt*0.6));
            setInput2(parseFloat(vs.input2.toFixed(3)));
          }
        });

        // Update floating VR panel to follow camera
        const vp=vrPanelRef.current;
        if(vp && vp.group.visible){
          const cam=renderer.xr.getCamera();
          const fwd=new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion);
          vp.group.position.copy(cam.position).addScaledVector(fwd,1.8);
          vp.group.position.y=cam.position.y-0.3;
          vp.group.quaternion.copy(cam.quaternion);
        }
      }

      // ── Draw VR info panel canvas ───────────────────────────────────────
      const vp=vrPanelRef.current;
      if(vp){
        const CA2=actsRef.current;
        const vs=vrStateRef.current;
        const hasNeuron=!!selectedNeuronRef.current;
        vp.group.visible=hasNeuron||!!CA2;
        if(vp.group.visible){
          const c=vp.ctx, w=512, h=192;
          c.clearRect(0,0,w,h);
          c.fillStyle='rgba(1,9,30,0.92)'; c.fillRect(0,0,w,h);
          c.strokeStyle='#0a2858'; c.lineWidth=2; c.strokeRect(1,1,w-2,h-2);
          c.font='bold 18px monospace'; c.fillStyle='#00c2f4';
          c.fillText('NEURAL VIZ — VR MODE',16,28);
          c.font='13px monospace'; c.fillStyle='#1a6090';
          const i1=vs?.input1??0, i2=vs?.input2??0;
          c.fillText(`Input 1 (L-stick ↕): ${i1.toFixed(3)}`,16,56);
          c.fillText(`Input 2 (R-stick ↕): ${i2.toFixed(3)}`,16,76);
          c.fillStyle='#0a3060';
          c.fillText('Trigger: select neuron   Stick: adjust inputs',16,100);
          if(CA2){
            const out=CA2[CA2.length-1][0];
            const[r2,g2,b2]=actToRGB(out);
            c.fillStyle=`rgb(${Math.round(r2*255)},${Math.round(g2*255)},${Math.round(b2*255)})`;
            c.font='bold 28px monospace';
            c.fillText(`Output: ${out.toFixed(4)}`,16,140);
          }
          const sn=selectedNeuronRef.current;
          if(sn){
            const act=CA2?.[sn.layer]?.[sn.idx]??0;
            c.font='13px monospace'; c.fillStyle='#00e8ff';
            c.fillText(`Selected: ${LAYER_NAMES[sn.layer]} N${sn.idx+1}  act=${act.toFixed(4)}`,16,172);
          }
          vp.tex.needsUpdate=true;
        }
      }

      renderer.render(scene,camera);
    };
    renderer.setAnimationLoop(animate);

    const onResize=()=>{camera.aspect=mount.clientWidth/mount.clientHeight;camera.updateProjectionMatrix();renderer.setSize(mount.clientWidth,mount.clientHeight);};
    window.addEventListener("resize",onResize);

    return()=>{
      renderer.setAnimationLoop(null);
      window.removeEventListener("mousemove",onMM);
      window.removeEventListener("mouseup",onMU);
      window.removeEventListener("resize",onResize);
      canvas.removeEventListener("mousedown",onMD);
      canvas.removeEventListener("wheel",onW);
      canvas.removeEventListener("click",onCK);
      renderer.dispose();
      if(mount.contains(vrBtn)) mount.removeChild(vrBtn);
      if(mount.contains(canvas)) mount.removeChild(canvas);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // ─── FORWARD PASS + TRIGGER PROPAGATION WAVE ─────────────────────────────────
  useEffect(()=>{
    const result=forwardPass([input1,input2],activationFn);
    fnRef.current=activationFn; actsRef.current=result.acts;
    setAllActs(result.acts); setAllRawZ(result.rawZ);
    setOutputValue(result.acts[result.acts.length-1][0]);
    if(!clockRef.current) return;
    const el=clockRef.current.getElapsedTime();
    // Reset ripple triggers
    neuronObjsRef.current.forEach(l=>l.forEach(o=>{o.rippleState.triggered=false;}));
    // Reset pulses
    psRef.current.forEach(ps=>{ps.t=-1;ps.active=false;});
    pulseGroupsRef.current.forEach(grp=>grp.forEach(p=>{p.mesh.visible=false;}));
    // Start wave
    propagRef.current={startTime:el,active:true};
    const totalDur=LAYER_DELAYS[LAYER_SIZES.length-1]+2.0;
    setIsAnimating(true);
    const tid=setTimeout(()=>{setIsAnimating(false);propagRef.current.active=false;},totalDur*1000);
    return()=>clearTimeout(tid);
  },[input1,input2,activationFn]);

  // ─── INSPECTOR ───────────────────────────────────────────────────────────────
  const getInfo=()=>{
    if(!selectedNeuron||!allActs||!allRawZ) return null;
    const{layer,idx}=selectedNeuron;
    const activation=allActs[layer]?.[idx]??0;
    const rawZ=allRawZ[layer]?.[idx]??0;
    const dispVal=normDisp(activation,activationFn,layer);
    if(layer===0) return{name:`Input Neuron ${idx+1}`,activation,dispVal,isInput:true};
    const w=getWeights()[layer-1];
    const weightTerms=Array.from({length:LAYER_SIZES[layer-1]},(_,i)=>({w:w.W[i*LAYER_SIZES[layer]+idx],x:allActs[layer-1][i]}));
    return{name:`${LAYER_NAMES[layer]} · N${idx+1}`,activation,dispVal,z:rawZ,bias:w.b[idx],weightTerms,fnLabel:layer===LAYER_SIZES.length-1?"sigmoid":activationFn,isInput:false};
  };
  const info=getInfo();
  const totalConns=LAYER_SIZES.reduce((a,s,l)=>l>0?a+s*LAYER_SIZES[l-1]:a,0);
  const totalParams=LAYER_SIZES.reduce((a,s,l)=>l>0?a+s*LAYER_SIZES[l-1]+s:a,0);
  const outRGB=actToRGB(outputValue);
  const outCol=`rgb(${Math.round(outRGB[0]*255)},${Math.round(outRGB[1]*255)},${Math.round(outRGB[2]*255)})`;
  const FN={relu:{f:"f(z) = max(0, z)",d:"Zeroes negatives; sparse & fast. Resists vanishing gradients."},
             sigmoid:{f:"f(z) = 1 / (1 + e⁻ᶻ)",d:"Outputs (0,1). Classic gate function, can vanish in deep nets."},
             tanh:{f:"f(z) = tanh(z)",d:"Zero-centered (−1,1). Better gradient flow than sigmoid."}};

  return(
    <div style={{width:"100%",height:"100vh",display:"flex",fontFamily:"'JetBrains Mono',monospace",background:"#010915",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Exo+2:wght@200;300;400;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#010a1e}::-webkit-scrollbar-thumb{background:#0a2858;border-radius:2px}
        .sl{-webkit-appearance:none;width:100%;height:3px;border-radius:2px;outline:none;cursor:pointer;background:linear-gradient(to right,#071626,#0050a0)}
        .sl::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;background:radial-gradient(circle,#50e8ff,#0098d8);border-radius:50%;cursor:pointer;box-shadow:0 0 12px rgba(0,200,255,.75)}
        .sel{background:#020d1e;border:1px solid #0a2848;color:#44a8d8;padding:7px 10px;border-radius:7px;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;cursor:pointer;width:100%}
        .p{background:rgba(1,10,26,.92);border:1px solid rgba(8,44,95,.58);border-radius:10px;padding:14px;backdrop-filter:blur(12px)}
        .pt{font-size:9px;color:#143868;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;font-weight:600}
        @keyframes pg{0%,100%{opacity:.45}50%{opacity:1}}
        @keyframes si{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)}}
        .fb{background:rgba(0,55,115,.11);border:1px solid rgba(0,65,135,.20);border-radius:7px;padding:10px;font-size:10px;line-height:1.88}
        .vb{height:4px;background:#030d1e;border-radius:2px;overflow:hidden;margin-top:5px}
        .ld{width:6px;height:6px;border-radius:50%;background:#00ee72;box-shadow:0 0 9px #00ee72;display:inline-block;animation:pg .85s ease infinite}
        .bdg{display:inline-flex;align-items:center;gap:4px;padding:3px 7px;border-radius:20px;font-size:9px;letter-spacing:1px;border:1px solid}
      `}</style>

      {/* 3D CANVAS */}
      <div ref={mountRef} style={{flex:1,position:"relative",cursor:"crosshair",minWidth:0}}>
        {/* Layer labels */}
        {LAYER_NAMES.map((name,l)=>(
          <div key={l} style={{position:"absolute",bottom:"22px",left:`${9.5+(l/(LAYER_NAMES.length-1))*70}%`,transform:"translateX(-50%)",textAlign:"center",pointerEvents:"none",userSelect:"none"}}>
            <div style={{fontSize:"9px",color:"rgba(22,72,158,.58)",letterSpacing:"1px",marginBottom:"1px"}}>{LAYER_SIZES[l]}{LAYER_SIZES[l]===1?" neuron":" neurons"}</div>
            <div style={{fontSize:"10px",color:"rgba(48,118,210,.72)",letterSpacing:"2.5px",fontWeight:600}}>{name.toUpperCase()}</div>
          </div>
        ))}
        {/* Controls hint */}
        <div style={{position:"absolute",top:"14px",left:"14px",pointerEvents:"none"}}>
          <div style={{fontSize:"10px",color:"rgba(22,68,148,.65)",lineHeight:1.8}}>⟳ Drag orbit · Scroll zoom<br/>Click neuron to inspect</div>
        </div>
        {/* Propagation badge */}
        {isAnimating?(
          <div style={{position:"absolute",top:"14px",right:"14px",display:"flex",alignItems:"center",gap:"8px",pointerEvents:"none"}}>
            <span className="ld"/>
            <span style={{fontSize:"9px",color:"#00e868",letterSpacing:"2.5px",fontWeight:600}}>PROPAGATING</span>
          </div>
        ):(
          <div style={{position:"absolute",top:"14px",right:"14px",display:"flex",alignItems:"center",gap:"7px",pointerEvents:"none",opacity:.5}}>
            <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#1a4880"}}/>
            <span style={{fontSize:"9px",color:"#1a4880",letterSpacing:"2px"}}>IDLE</span>
          </div>
        )}
        {/* Mini architecture dots */}
        <div style={{position:"absolute",top:"12px",left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:"5px",pointerEvents:"none"}}>
          {LAYER_SIZES.map((size,l)=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:"4px"}}>
              <div style={{display:"flex",flexDirection:"column",gap:"2px"}}>
                {Array.from({length:Math.min(size,5)},(_,n)=>{
                  const act=allActs?.[l]?.[n]??0, d=normDisp(act,activationFn,l);
                  const[r,g,b]=actToRGB(d), c=`rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`;
                  return <div key={n} style={{width:"6px",height:"6px",borderRadius:"50%",background:c,boxShadow:`0 0 5px ${c}`}}/>;
                })}
              </div>
              {l<LAYER_SIZES.length-1&&<div style={{fontSize:"9px",color:"#081830"}}>→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{width:"285px",flexShrink:0,padding:"12px 11px",display:"flex",flexDirection:"column",gap:"9px",overflowY:"auto",overflowX:"hidden",background:"rgba(0,5,18,.97)",borderLeft:"1px solid rgba(6,34,80,.55)"}}>

        {/* Header */}
        <div style={{paddingBottom:"10px",borderBottom:"1px solid rgba(8,38,88,.55)"}}>
          <div style={{fontFamily:"'Exo 2',sans-serif",fontWeight:900,fontSize:"14px",letterSpacing:"3.5px",color:"#00c2f4",textTransform:"uppercase",textShadow:"0 0 18px rgba(0,175,245,.55)"}}>Neural Viz</div>
          <div style={{fontFamily:"'Exo 2',sans-serif",fontWeight:200,fontSize:"10px",color:"rgba(32,108,200,.60)",letterSpacing:"2px",marginTop:"2px"}}>Bio-Organic 3D · Signal Propagation</div>
          <div style={{marginTop:"8px",display:"flex",gap:"5px",flexWrap:"wrap"}}>
            {[{c:"#00cc60",t:"+weight"},{c:"#ee3015",t:"−weight"},{c:"#00e8ff",t:"pulse trail"},{c:"#a060ff",t:"ripple"}].map(({c,t})=>(
              <div key={t} className="bdg" style={{color:c,borderColor:`${c}40`,background:`${c}12`}}>
                <div style={{width:"5px",height:"5px",borderRadius:"50%",background:c,boxShadow:`0 0 4px ${c}`}}/>{t}
              </div>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="p">
          <div className="pt">Input Signals {isConnected && <span style={{color:"#00ee72",fontSize:"8px"}}>● ARDUINO CONNECTED</span>}</div>
          
          {/* Arduino Connection */}
          {isSupported && (
            <div style={{marginBottom:"14px",padding:"10px",background:"rgba(0,88,48,.10)",border:"1px solid rgba(0,88,48,.22)",borderRadius:"7px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                <span style={{fontSize:"10px",color:"#1a7050"}}>Arduino Mode</span>
                <label style={{display:"flex",alignItems:"center",gap:"6px",cursor:"pointer"}}>
                  <input type="checkbox" checked={useArduino} onChange={(e)=>setUseArduino(e.target.checked)} style={{cursor:"pointer"}}/>
                  <span style={{fontSize:"9px",color:"#28b870"}}>{useArduino?"ON":"OFF"}</span>
                </label>
              </div>
              {!isConnected ? (
                <button onClick={connect} style={{width:"100%",padding:"8px",background:"#00cc60",border:"none",borderRadius:"5px",color:"#000",fontSize:"10px",fontWeight:700,cursor:"pointer",letterSpacing:"1.5px"}}>
                  CONNECT ARDUINO
                </button>
              ) : (
                <div>
                  <button onClick={disconnect} style={{width:"100%",padding:"8px",background:"#dd3015",border:"none",borderRadius:"5px",color:"#fff",fontSize:"10px",fontWeight:700,cursor:"pointer",letterSpacing:"1.5px",marginBottom:"8px"}}>
                    DISCONNECT
                  </button>
                  <div style={{fontSize:"9px",color:"#1a7050"}}>
                    Raw Value: <span style={{color:"#28b870",fontWeight:700}}>{rawValue}</span>
                  </div>
                </div>
              )}
              {error && <div style={{marginTop:"8px",fontSize:"9px",color:"#dd3015"}}>{error}</div>}
            </div>
          )}
          
          {[{label:"x₁ — Input 1",val:input1,set:setInput1,disabled:useArduino && isConnected},{label:"x₂ — Input 2",val:input2,set:setInput2,disabled:useArduino && isConnected}].map(({label,val,set,disabled},ki)=>{
            const[r,g,b]=actToRGB(val), vc=`rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`;
            return(
              <div key={ki} style={{marginBottom:ki===0?"14px":0,opacity:disabled?0.5:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"7px"}}>
                  <span style={{fontSize:"11px",color:"#327aaa"}}>{label} {disabled && <span style={{fontSize:"8px",color:"#00ee72"}}>ARDUINO</span>}</span>
                  <span style={{fontSize:"12px",color:vc,fontWeight:700,textShadow:`0 0 8px ${vc}60`}}>{val.toFixed(3)}</span>
                </div>
                <input type="range" min="0" max="1" step="0.001" value={val} onChange={e=>set(parseFloat(e.target.value))} className="sl" disabled={disabled}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"8px",color:"rgba(22,58,118,.60)",marginTop:"3px"}}>
                  <span>0.000</span><span>0.500</span><span>1.000</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Activation function */}
        <div className="p">
          <div className="pt">Activation Function</div>
          <select className="sel" value={activationFn} onChange={e=>setActivationFn(e.target.value)}>
            <option value="relu">ReLU</option>
            <option value="sigmoid">Sigmoid</option>
            <option value="tanh">Tanh</option>
          </select>
          <div style={{marginTop:"9px",padding:"7px 9px",background:"rgba(0,55,115,.10)",border:"1px solid rgba(0,60,120,.20)",borderRadius:"6px",fontSize:"11px",color:"#245e8a",textAlign:"center",fontStyle:"italic"}}>
            {FN[activationFn].f}
          </div>
          <div style={{marginTop:"8px",fontSize:"10px",color:"rgba(16,52,105,.78)",lineHeight:1.65}}>{FN[activationFn].d}</div>
        </div>

        {/* Output */}
        <div className="p" style={{textAlign:"center"}}>
          <div className="pt">Network Output</div>
          <div style={{fontSize:"34px",fontWeight:700,fontFamily:"'Exo 2',sans-serif",color:outCol,lineHeight:1.1,textShadow:`0 0 22px ${outCol}88,0 0 48px ${outCol}30`,transition:"color .35s"}}>
            {outputValue.toFixed(4)}
          </div>
          <div className="vb" style={{marginTop:"9px"}}>
            <div style={{height:"100%",borderRadius:"2px",width:`${outputValue*100}%`,background:`linear-gradient(to right,#001535,${outCol})`,transition:"width .45s cubic-bezier(.4,0,.2,1)"}}/>
          </div>
          <div style={{fontSize:"9px",color:"rgba(16,58,122,.70)",marginTop:"6px",letterSpacing:"1.5px"}}>SIGMOID · OUTPUT LAYER · [0 → 1]</div>
        </div>

        {/* Propagation timeline */}
        <div className="p">
          <div className="pt">Propagation Timeline</div>
          {LAYER_NAMES.map((name,l)=>{
            const[r,g,b]=actToRGB(l/(LAYER_NAMES.length-1));
            const lc=`rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`;
            return(
              <div key={l} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:l<LAYER_NAMES.length-1?"8px":0}}>
                <div style={{width:"34px",fontSize:"9px",color:"#1a4880",flexShrink:0}}>{LAYER_DELAYS[l].toFixed(2)}s</div>
                <div style={{flex:1,height:"3px",background:"#050f20",borderRadius:"2px",overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:"2px",background:lc,width:isAnimating?"100%":"0%",transition:isAnimating?`width ${LAYER_DELAYS[l]+0.5}s ease`:"none",opacity:0.65}}/>
                </div>
                <div style={{fontSize:"9px",color:"#244878",minWidth:"56px",textAlign:"right"}}>{name}</div>
              </div>
            );
          })}
        </div>

        {/* Neuron inspector */}
        <div className="p">
          <div className="pt">Neuron Inspector</div>
          {info?(
            <div style={{animation:"si .22s ease"}} key={`${selectedNeuron?.layer}-${selectedNeuron?.idx}`}>
              <div style={{fontSize:"11px",fontWeight:700,color:"#00a8da",marginBottom:"10px"}}>{info.name}</div>
              <div style={{marginBottom:"10px"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"9px",color:"#143862",marginBottom:"3px"}}>
                  <span>ACTIVATION</span><span style={{color:"#36a0d0"}}>{info.activation.toFixed(6)}</span>
                </div>
                <div className="vb">
                  <div style={{height:"100%",borderRadius:"2px",width:`${Math.abs(info.dispVal)*100}%`,background:(()=>{const[r,g,b]=actToRGB(info.dispVal);return`linear-gradient(to right,#000d22,rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)}))`;})(),transition:"width .3s"}}/>
                </div>
              </div>
              {info.isInput?(
                <div className="fb">
                  <div style={{color:"#152838",fontSize:"9px",letterSpacing:"2px",marginBottom:"4px"}}>VALUE</div>
                  <div style={{color:"#36a0d0"}}>x = {info.activation.toFixed(6)}</div>
                  <div style={{color:"#152838",marginTop:"4px"}}>Direct input — no activation applied</div>
                </div>
              ):(
                <>
                  <div className="fb" style={{marginBottom:"7px"}}>
                    <div style={{color:"#142638",fontSize:"9px",letterSpacing:"2px",marginBottom:"6px"}}>WEIGHTED SUM  z = Σ(wᵢ · xᵢ) + b</div>
                    {info.weightTerms.map(({w,x},ti)=>(
                      <div key={ti} style={{color:"#264e70",fontSize:"10px"}}>
                        <span style={{color:w>0?"#20cc60":"#dd3015"}}>{w.toFixed(4)}</span>
                        <span style={{color:"#122030"}}> × </span>
                        <span style={{color:"#3888c0"}}>{x.toFixed(4)}</span>
                        {ti<info.weightTerms.length-1&&<span style={{color:"#122030"}}> +</span>}
                      </div>
                    ))}
                    <div style={{color:"#224468",borderTop:"1px solid rgba(8,34,68,.5)",marginTop:"5px",paddingTop:"4px"}}>
                      + b = <span style={{color:"#3268a8"}}>{info.bias.toFixed(4)}</span>
                    </div>
                    <div style={{color:"#3896c8",fontWeight:700,marginTop:"4px"}}>z = {info.z.toFixed(6)}</div>
                  </div>
                  <div className="fb" style={{background:"rgba(0,88,48,.10)",borderColor:"rgba(0,88,48,.22)"}}>
                    <div style={{color:"#083020",fontSize:"9px",letterSpacing:"2px",marginBottom:"4px"}}>ACTIVATION  a = {info.fnLabel}(z)</div>
                    <div style={{color:"#1a7050"}}>a = {info.fnLabel}({info.z.toFixed(4)})</div>
                    <div style={{color:"#28b870",fontWeight:700,marginTop:"3px"}}>a = {info.activation.toFixed(6)}</div>
                  </div>
                </>
              )}
            </div>
          ):(
            <div style={{textAlign:"center",padding:"16px 8px",color:"rgba(16,52,118,.45)",fontSize:"11px"}}>
              <div style={{fontSize:"22px",marginBottom:"8px",opacity:.18}}>◎</div>
              Click any neuron in the 3D view<br/>to inspect its computation
            </div>
          )}
        </div>

        {/* Color + visual legend */}
        <div className="p">
          <div className="pt">Activation Color Map</div>
          <div style={{display:"flex",gap:"1px",height:"10px",borderRadius:"5px",overflow:"hidden",marginBottom:"5px"}}>
            {Array.from({length:24},(_,i)=>{const[r,g,b]=actToRGB(i/23);return <div key={i} style={{flex:1,background:`rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`}}/>;})}</div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:"8px",color:"rgba(16,52,112,.65)",marginBottom:"10px"}}>
            <span>navy</span><span>blue</span><span>cyan</span><span>yellow</span><span>red</span>
          </div>
          {[{c:"#00cc60",t:"Positive weight — excitatory connection"},{c:"#ee3015",t:"Negative weight — inhibitory connection"},{c:"#00eeff",t:"Signal pulse with 6-sphere trail glow"},{c:"#a060ff",t:"Neuron-fire ripple rings (×2)"},{c:"#44aaff",t:"Scale expansion on activation"}].map(({c,t})=>(
            <div key={t} style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"5px",fontSize:"9px",color:"#163868"}}>
              <div style={{width:"8px",height:"8px",borderRadius:"50%",background:c,flexShrink:0,boxShadow:`0 0 5px ${c}80`}}/>
              {t}
            </div>
          ))}
        </div>

        {/* Architecture stats */}
        <div className="p">
          <div className="pt">Network Architecture</div>
          {LAYER_SIZES.map((size,l)=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"10px",padding:"5px 0",borderBottom:l<LAYER_SIZES.length-1?"1px solid rgba(6,30,72,.42)":"none"}}>
              <span style={{color:"#1a5898"}}>{LAYER_NAMES[l]}</span>
              <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                {Array.from({length:Math.min(size,5)},(_,n)=>{
                  const act=allActs?.[l]?.[n]??0, d=normDisp(act,activationFn,l);
                  const[r,g,b]=actToRGB(d), c=`rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`;
                  return <div key={n} style={{width:"6px",height:"6px",borderRadius:"50%",background:c,boxShadow:`0 0 4px ${c}55`}}/>;
                })}
                <span style={{color:"#2888c0",fontWeight:600,marginLeft:"2px"}}>{size}n</span>
              </div>
            </div>
          ))}
          <div style={{marginTop:"9px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 10px"}}>
            {[["Connections",totalConns],["Parameters",totalParams],["Layout","Organic 3D"],["Hidden fn",activationFn.toUpperCase()],["Output fn","Sigmoid"],["Pulse trail","6 spheres"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:"9px"}}>
                <span style={{color:"#152e50"}}>{k}</span>
                <span style={{color:"#1e70aa"}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

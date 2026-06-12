import { useNavigate } from 'react-router-dom';
import { useNetworkStore } from '../store/networkStore';
import NetworkBuilder from '../components/builder/NetworkBuilder';
import InputPanel from '../components/ui/InputPanel';
import NeuralNetworkViz from '../utils/mm';

function actToRGB(t) {
  t = Math.max(0, Math.min(1, t));
  let r, g, b;
  if      (t < 0.25) { const s=t/0.25;        r=0.02+s*0.04; g=0.05+s*0.38; b=0.18+s*0.62; }
  else if (t < 0.50) { const s=(t-0.25)/0.25; r=0.06+s*0.04; g=0.43+s*0.40; b=0.80-s*0.52; }
  else if (t < 0.75) { const s=(t-0.50)/0.25; r=0.10+s*0.82; g=0.83-s*0.13; b=0.28-s*0.28; }
  else               { const s=(t-0.75)/0.25; r=0.92+s*0.08; g=0.70-s*0.70; b=0; }
  return `rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`;
}

export default function Playground() {
  const nav = useNavigate();
  const { outputValue, isAnimating, selectedNeuron, acts, rawZ, layerSizes, activationFn } = useNetworkStore();
  const outCol = actToRGB(outputValue);

  const LAYER_NAMES = ['Input', ...layerSizes.slice(1, -1).map((_, i) => `Hidden ${i + 1}`), 'Output'];

  const getInspectorInfo = () => {
    if (!selectedNeuron || !acts || !rawZ) return null;
    const { layer, idx } = selectedNeuron;
    const activation = acts[layer]?.[idx] ?? 0;
    const z = rawZ[layer]?.[idx] ?? 0;
    if (layer === 0) return { name: `Input ${idx + 1}`, activation, isInput: true };
    return { name: `${LAYER_NAMES[layer]} · N${idx + 1}`, activation, z, isInput: false };
  };
  const info = getInspectorInfo();

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#010915', fontFamily: "'JetBrains Mono',monospace", overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Exo+2:wght@200;400;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#010a1e}::-webkit-scrollbar-thumb{background:#0a2858;border-radius:2px}
        @keyframes pg{0%,100%{opacity:.45}50%{opacity:1}}
        .p{background:rgba(1,10,26,.92);border:1px solid rgba(8,44,95,.58);border-radius:10px;padding:14px;backdrop-filter:blur(12px)}
        .pt{font-size:9px;color:#143868;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;font-weight:600}
        .ld{width:6px;height:6px;border-radius:50%;background:#00ee72;box-shadow:0 0 9px #00ee72;display:inline-block;animation:pg .85s ease infinite}
        .vb{height:4px;background:#030d1e;border-radius:2px;overflow:hidden;margin-top:5px}
        .fb{background:rgba(0,55,115,.11);border:1px solid rgba(0,65,135,.20);border-radius:7px;padding:10px;font-size:10px;line-height:1.88}
      `}</style>

      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid rgba(8,44,95,.4)', background: 'rgba(1,9,21,.95)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => nav('/')} style={{ background: 'none', border: 'none', color: '#1a5890', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', letterSpacing: '1px' }}>← HOME</button>
          <div style={{ fontFamily: "'Exo 2',sans-serif", fontWeight: 900, fontSize: '14px', color: '#00c2f4', letterSpacing: '3px' }}>NEURALVIZ</div>
          <div style={{ fontSize: '10px', color: 'rgba(32,108,200,.55)', letterSpacing: '2px' }}>Playground</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAnimating
            ? <><span className="ld" /><span style={{ fontSize: '9px', color: '#00e868', letterSpacing: '2px' }}>PROPAGATING</span></>
            : <span style={{ fontSize: '9px', color: '#1a4880', letterSpacing: '2px' }}>IDLE</span>
          }
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT PANEL */}
        <div style={{ width: '240px', flexShrink: 0, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', background: 'rgba(0,5,18,.97)', borderRight: '1px solid rgba(6,34,80,.55)' }}>
          <div className="p">
            <div className="pt">Network Builder</div>
            <NetworkBuilder />
          </div>
        </div>

        {/* 3D CANVAS */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <NeuralNetworkViz />
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width: '270px', flexShrink: 0, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', background: 'rgba(0,5,18,.97)', borderLeft: '1px solid rgba(6,34,80,.55)' }}>

          {/* Inputs */}
          <div className="p">
            <div className="pt">Input Signals</div>
            <InputPanel />
          </div>

          {/* Output */}
          <div className="p" style={{ textAlign: 'center' }}>
            <div className="pt">Network Output</div>
            <div style={{ fontSize: '32px', fontWeight: 700, fontFamily: "'Exo 2',sans-serif", color: outCol, textShadow: `0 0 22px ${outCol}88`, transition: 'color .35s' }}>
              {outputValue.toFixed(4)}
            </div>
            <div className="vb" style={{ marginTop: '9px' }}>
              <div style={{ height: '100%', width: `${outputValue * 100}%`, background: `linear-gradient(to right,#001535,${outCol})`, borderRadius: '2px', transition: 'width .45s cubic-bezier(.4,0,.2,1)' }} />
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(16,58,122,.7)', marginTop: '6px', letterSpacing: '1.5px' }}>SIGMOID · OUTPUT · [0 → 1]</div>
          </div>

          {/* Neuron Inspector */}
          <div className="p">
            <div className="pt">Neuron Inspector</div>
            {info ? (
              <div key={`${selectedNeuron.layer}-${selectedNeuron.idx}`}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#00a8da', marginBottom: '10px' }}>{info.name}</div>
                <div className="vb" style={{ marginBottom: '10px' }}>
                  <div style={{ height: '100%', width: `${Math.abs(info.activation) * 100}%`, background: actToRGB(info.activation), borderRadius: '2px', transition: 'width .3s' }} />
                </div>
                {info.isInput ? (
                  <div className="fb">
                    <div style={{ color: '#36a0d0' }}>x = {info.activation.toFixed(6)}</div>
                    <div style={{ color: '#152838', marginTop: '4px' }}>Direct input — no activation applied</div>
                  </div>
                ) : (
                  <div className="fb">
                    <div style={{ color: '#36a0d0' }}>z = {info.z?.toFixed(6)}</div>
                    <div style={{ color: '#28b870', fontWeight: 700, marginTop: '4px' }}>a = {info.activation.toFixed(6)}</div>
                    <div style={{ color: '#152838', marginTop: '4px', fontSize: '9px' }}>{activationFn}(z)</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 8px', color: 'rgba(16,52,118,.45)', fontSize: '11px' }}>
                <div style={{ fontSize: '22px', marginBottom: '8px', opacity: .18 }}>◎</div>
                Click any neuron to inspect
              </div>
            )}
          </div>

          {/* Architecture summary */}
          <div className="p">
            <div className="pt">Architecture</div>
            <div style={{ fontSize: '10px', color: '#1a5898', letterSpacing: '1px' }}>
              {layerSizes.join(' → ')}
            </div>
            <div style={{ marginTop: '6px', fontSize: '9px', color: 'rgba(16,52,112,.6)' }}>
              {layerSizes.reduce((a, s, l) => l > 0 ? a + s * layerSizes[l - 1] + s : a, 0)} params · {activationFn.toUpperCase()} hidden · Sigmoid output
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

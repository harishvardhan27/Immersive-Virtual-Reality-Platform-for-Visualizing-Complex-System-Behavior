import { useEffect, useRef, useState } from 'react';
import { useNetworkStore } from '../../store/networkStore';
import useSerial from '../../hooks/useSerial';

function actToRGB(t) {
  t = Math.max(0, Math.min(1, t));
  let r, g, b;
  if      (t < 0.25) { const s=t/0.25;        r=0.02+s*0.04; g=0.05+s*0.38; b=0.18+s*0.62; }
  else if (t < 0.50) { const s=(t-0.25)/0.25; r=0.06+s*0.04; g=0.43+s*0.40; b=0.80-s*0.52; }
  else if (t < 0.75) { const s=(t-0.50)/0.25; r=0.10+s*0.82; g=0.83-s*0.13; b=0.28-s*0.28; }
  else               { const s=(t-0.75)/0.25; r=0.92+s*0.08; g=0.70-s*0.70; b=0; }
  return `rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`;
}

const MODES = [
  { id: 'manual', icon: '🎛️', label: 'Manual' },
  { id: 'microphone', icon: '🎙️', label: 'Mic' },
  { id: 'csv', icon: '📂', label: 'CSV' },
  { id: 'arduino', icon: '⚡', label: 'Arduino' },
];

export default function InputPanel() {
  const { inputs, inputMode, layerSizes, setInput, setInputs, setInputMode } = useNetworkStore();
  const { isSupported, isConnected, value: s1, previousValue: s2, rawValue, error, connect, disconnect } = useSerial();
  const micRef = useRef(null);
  const [micActive, setMicActive] = useState(false);
  const [csvError, setCsvError] = useState('');

  // Sync arduino inputs
  useEffect(() => {
    if (inputMode === 'arduino' && isConnected) setInputs([s1, s2]);
  }, [s1, s2, isConnected, inputMode]);

  // Microphone
  useEffect(() => {
    if (inputMode !== 'microphone') { stopMic(); return; }
    startMic();
    return stopMic;
  }, [inputMode]);

  async function startMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      micRef.current = { ctx, stream };
      const tick = () => {
        if (inputMode !== 'microphone') return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
        const bass = data.slice(0, 8).reduce((a, b) => a + b, 0) / 8 / 255;
        setInputs([parseFloat(avg.toFixed(3)), parseFloat(bass.toFixed(3))]);
        requestAnimationFrame(tick);
      };
      tick();
      setMicActive(true);
    } catch { setMicActive(false); }
  }

  function stopMic() {
    if (micRef.current) {
      micRef.current.stream.getTracks().forEach(t => t.stop());
      micRef.current.ctx.close();
      micRef.current = null;
    }
    setMicActive(false);
  }

  function handleCSV(e) {
    setCsvError('');
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.trim().split('\n').filter(Boolean);
      const values = lines[0].split(',').map(Number).filter(v => !isNaN(v));
      const inputCount = layerSizes[0];
      if (values.length < inputCount) { setCsvError(`Need at least ${inputCount} values in first row`); return; }
      setInputs(values.slice(0, inputCount));
    };
    reader.readAsText(file);
  }

  const inputCount = layerSizes[0];

  return (
    <div>
      {/* Mode selector */}
      <div style={{ fontSize: '9px', color: '#143868', letterSpacing: '3px', fontWeight: 600, marginBottom: '10px' }}>INPUT SOURCE</div>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '14px' }}>
        {MODES.map(({ id, icon, label }) => (
          <button key={id} onClick={() => setInputMode(id)}
            style={{ flex: 1, padding: '7px 4px', background: inputMode === id ? 'rgba(0,100,200,.25)' : 'rgba(0,20,50,.5)', border: `1px solid ${inputMode === id ? 'rgba(0,150,255,.5)' : 'rgba(8,44,95,.4)'}`, borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}>
            <div style={{ fontSize: '14px' }}>{icon}</div>
            <div style={{ fontSize: '8px', color: inputMode === id ? '#00c2f4' : '#1a5070', marginTop: '2px', letterSpacing: '0.5px' }}>{label}</div>
          </button>
        ))}
      </div>

      {/* Manual sliders */}
      {inputMode === 'manual' && Array.from({ length: inputCount }, (_, i) => (
        <div key={i} style={{ marginBottom: i < inputCount - 1 ? '14px' : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#327aaa' }}>x{i + 1} — Input {i + 1}</span>
            <span style={{ fontSize: '12px', color: actToRGB(inputs[i] ?? 0), fontWeight: 700 }}>{(inputs[i] ?? 0).toFixed(3)}</span>
          </div>
          <input type="range" min="0" max="1" step="0.001" value={inputs[i] ?? 0}
            onChange={e => setInput(i, parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#00aaff', cursor: 'pointer' }} />
        </div>
      ))}

      {/* Microphone */}
      {inputMode === 'microphone' && (
        <div style={{ padding: '12px', background: 'rgba(0,60,30,.12)', border: '1px solid rgba(0,100,50,.25)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: micActive ? '#00ee72' : '#666', boxShadow: micActive ? '0 0 8px #00ee72' : 'none' }} />
            <span style={{ fontSize: '11px', color: micActive ? '#00ee72' : '#666' }}>{micActive ? 'Listening...' : 'Mic inactive'}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#1a6050' }}>x1: avg frequency · x2: bass level</div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#00aaff' }}>
            {inputs.map((v, i) => <div key={i}>Input {i + 1}: {v.toFixed(3)}</div>)}
          </div>
        </div>
      )}

      {/* CSV */}
      {inputMode === 'csv' && (
        <div style={{ padding: '12px', background: 'rgba(0,40,80,.12)', border: '1px solid rgba(0,60,120,.25)', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: '#1a5070', marginBottom: '10px' }}>Upload a CSV file. First row values are used as inputs.</div>
          <input type="file" accept=".csv,.txt" onChange={handleCSV}
            style={{ fontSize: '11px', color: '#44aaff', width: '100%' }} />
          {csvError && <div style={{ marginTop: '8px', fontSize: '10px', color: '#ee4020' }}>{csvError}</div>}
          {!csvError && inputs.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#1a6090' }}>
              Loaded: {inputs.map((v, i) => `x${i + 1}=${v.toFixed(3)}`).join(' · ')}
            </div>
          )}
        </div>
      )}

      {/* Arduino */}
      {inputMode === 'arduino' && (
        <div style={{ padding: '12px', background: 'rgba(0,60,30,.12)', border: '1px solid rgba(0,100,50,.25)', borderRadius: '8px' }}>
          {!isSupported && <div style={{ fontSize: '10px', color: '#ee4020' }}>Web Serial not supported in this browser.</div>}
          {isSupported && !isConnected && (
            <button onClick={connect} style={{ width: '100%', padding: '9px', background: '#00cc60', border: 'none', borderRadius: '6px', color: '#000', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              CONNECT ARDUINO
            </button>
          )}
          {isSupported && isConnected && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00ee72', boxShadow: '0 0 7px #00ee72' }} />
                <span style={{ fontSize: '10px', color: '#00ee72' }}>Connected · A0={rawValue[0] ?? 0} · A1={rawValue[1] ?? 0}</span>
              </div>
              <button onClick={disconnect} style={{ width: '100%', padding: '7px', background: '#dd3015', border: 'none', borderRadius: '5px', color: '#fff', fontSize: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                DISCONNECT
              </button>
            </>
          )}
          {error && <div style={{ marginTop: '8px', fontSize: '10px', color: '#ee4020' }}>{error}</div>}
        </div>
      )}
    </div>
  );
}

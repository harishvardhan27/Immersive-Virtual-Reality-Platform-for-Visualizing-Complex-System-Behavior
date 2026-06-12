import { useNavigate } from 'react-router-dom';

const features = [
  { icon: '🧠', title: 'Visual Neural Builder', desc: 'Drag and configure layers, neurons, and activations without writing code.' },
  { icon: '⚡', title: 'Live Propagation', desc: 'Watch signals travel forward and backward through the network in real time.' },
  { icon: '🥽', title: 'VR Classroom', desc: 'Step inside the neural network with WebXR on Meta Quest 2.' },
  { icon: '🎙️', title: 'Live Inputs', desc: 'Feed your network with microphone, CSV data, or manual sliders.' },
  { icon: '📊', title: 'Inspect Everything', desc: 'Click any neuron to see weights, biases, z-values and activations.' },
  { icon: '🔗', title: 'Share Simulations', desc: 'Copy a link to share your exact network state with anyone.' },
];

export default function Landing() {
  const nav = useNavigate();
  return (
    <div style={{ background: '#010915', minHeight: '100vh', color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Exo+2:wght@200;400;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#010915}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}
        .btn-primary{background:linear-gradient(135deg,#0066cc,#00aaff);border:none;color:#fff;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:1.5px;transition:all .2s;font-family:'JetBrains Mono',monospace}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,150,255,.4)}
        .btn-ghost{background:transparent;border:1px solid rgba(0,150,255,.3);color:#44aaff;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;letter-spacing:1px;transition:all .2s;font-family:'JetBrains Mono',monospace}
        .btn-ghost:hover{border-color:#00aaff;background:rgba(0,150,255,.08)}
        .card{background:rgba(1,15,38,.8);border:1px solid rgba(8,44,95,.5);border-radius:14px;padding:28px;transition:all .25s}
        .card:hover{border-color:rgba(0,150,255,.35);transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,100,255,.12)}
      `}</style>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 60px', borderBottom: '1px solid rgba(8,44,95,.4)', position: 'sticky', top: 0, background: 'rgba(1,9,21,.95)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <div style={{ fontFamily: "'Exo 2',sans-serif", fontWeight: 900, fontSize: '20px', color: '#00c2f4', letterSpacing: '3px' }}>NEURALVIZ</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-ghost" onClick={() => nav('/playground')} style={{ padding: '9px 22px', fontSize: '13px' }}>Playground</button>
          <button className="btn-primary" onClick={() => nav('/playground')} style={{ padding: '9px 22px', fontSize: '13px' }}>Launch App →</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '100px 20px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(0,100,255,.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(0,100,255,.1)', border: '1px solid rgba(0,150,255,.25)', borderRadius: '20px', fontSize: '11px', color: '#44aaff', letterSpacing: '2px', marginBottom: '28px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ee72', boxShadow: '0 0 8px #00ee72', display: 'inline-block', animation: 'pulse 1.4s ease infinite' }} />
          NOW WITH WEBXR · META QUEST 2
        </div>
        <h1 style={{ fontFamily: "'Exo 2',sans-serif", fontWeight: 900, fontSize: 'clamp(36px,6vw,72px)', lineHeight: 1.1, marginBottom: '24px', background: 'linear-gradient(135deg,#ffffff,#44aaff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          See Neural Networks<br />Come Alive in 3D
        </h1>
        <p style={{ fontSize: '18px', color: 'rgba(100,160,220,.75)', maxWidth: '560px', margin: '0 auto 44px', lineHeight: 1.7 }}>
          Build, train, and visualize neural networks interactively — then step inside them in VR. The most immersive way to learn deep learning.
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => nav('/playground')}>Start Building →</button>
          <button className="btn-ghost" onClick={() => nav('/playground?vr=1')}>🥽 Enter VR</button>
        </div>

        {/* Animated network preview dots */}
        <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', animation: 'float 4s ease infinite' }}>
          {[2, 5, 4, 1].map((n, l) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
              {Array.from({ length: Math.min(n, 5) }, (_, i) => {
                const hue = (l / 3) * 200 + 160;
                return <div key={i} style={{ width: '14px', height: '14px', borderRadius: '50%', background: `hsl(${hue},80%,55%)`, boxShadow: `0 0 12px hsl(${hue},80%,55%)`, animation: `pulse ${1 + i * 0.2}s ease infinite` }} />;
              })}
              {n > 5 && <div style={{ fontSize: '9px', color: 'rgba(100,150,200,.5)' }}>+{n - 5}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '80px 60px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{ fontSize: '10px', color: '#1a4880', letterSpacing: '3px', marginBottom: '12px' }}>PLATFORM FEATURES</div>
          <h2 style={{ fontFamily: "'Exo 2',sans-serif", fontWeight: 700, fontSize: '32px', color: '#cce4ff' }}>Everything you need to understand deep learning</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '20px' }}>
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="card">
              <div style={{ fontSize: '28px', marginBottom: '14px' }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#88ccff', marginBottom: '8px' }}>{title}</div>
              <div style={{ fontSize: '13px', color: 'rgba(80,130,190,.75)', lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '80px 20px 100px', borderTop: '1px solid rgba(8,44,95,.3)' }}>
        <h2 style={{ fontFamily: "'Exo 2',sans-serif", fontWeight: 900, fontSize: '36px', color: '#cce4ff', marginBottom: '16px' }}>Ready to explore?</h2>
        <p style={{ color: 'rgba(80,130,190,.7)', marginBottom: '36px', fontSize: '15px' }}>No signup required. Start building in seconds.</p>
        <button className="btn-primary" onClick={() => nav('/playground')} style={{ fontSize: '16px', padding: '16px 48px' }}>Open Playground →</button>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid rgba(8,44,95,.3)', fontSize: '11px', color: 'rgba(30,70,130,.6)', letterSpacing: '1px' }}>
        NEURALVIZ · Built with Three.js + WebXR
      </footer>
    </div>
  );
}

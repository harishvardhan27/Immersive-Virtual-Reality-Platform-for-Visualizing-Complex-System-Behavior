import { useNetworkStore } from '../../store/networkStore';

const LAYER_NAMES = ['Input', 'Hidden 1', 'Hidden 2', 'Hidden 3', 'Hidden 4', 'Output'];
const ACTIVATIONS = [
  { value: 'relu', label: 'ReLU', formula: 'max(0, z)' },
  { value: 'sigmoid', label: 'Sigmoid', formula: '1/(1+e⁻ᶻ)' },
  { value: 'tanh', label: 'Tanh', formula: 'tanh(z)' },
  { value: 'leaky_relu', label: 'Leaky ReLU', formula: 'z>0?z:0.01z' },
];

export default function NetworkBuilder() {
  const { layerSizes, activationFn, setActivationFn, addLayer, removeLayer, setLayerNeurons, randomizeWeights } = useNetworkStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Architecture */}
      <div style={{ fontSize: '9px', color: '#143868', letterSpacing: '3px', fontWeight: 600, marginBottom: '4px' }}>ARCHITECTURE</div>

      {layerSizes.map((size, l) => {
        const isInput = l === 0;
        const isOutput = l === layerSizes.length - 1;
        const label = isInput ? 'Input' : isOutput ? 'Output' : `Hidden ${l}`;
        return (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(0,20,50,.5)', border: '1px solid rgba(8,44,95,.4)', borderRadius: '7px' }}>
            <div style={{ fontSize: '10px', color: '#1a5898', minWidth: '58px' }}>{label}</div>
            <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
              <button onClick={() => setLayerNeurons(l, size - 1)} disabled={size <= 1}
                style={{ width: '22px', height: '22px', background: 'rgba(0,40,90,.6)', border: '1px solid rgba(8,44,95,.5)', borderRadius: '4px', color: '#44aaff', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>−</button>
              <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: '#00c2f4', fontWeight: 700, lineHeight: '22px' }}>{size}</div>
              <button onClick={() => setLayerNeurons(l, size + 1)} disabled={size >= 10}
                style={{ width: '22px', height: '22px', background: 'rgba(0,40,90,.6)', border: '1px solid rgba(8,44,95,.5)', borderRadius: '4px', color: '#44aaff', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>+</button>
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(22,68,130,.6)', minWidth: '36px', textAlign: 'right' }}>{isInput ? 'input' : isOutput ? 'output' : 'hidden'}</div>
          </div>
        );
      })}

      {/* Add / Remove layer */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
        <button onClick={addLayer} disabled={layerSizes.length >= 6}
          style={{ flex: 1, padding: '7px', background: 'rgba(0,100,60,.15)', border: '1px solid rgba(0,100,60,.3)', borderRadius: '6px', color: '#00cc60', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add Layer
        </button>
        <button onClick={removeLayer} disabled={layerSizes.length <= 3}
          style={{ flex: 1, padding: '7px', background: 'rgba(100,20,0,.15)', border: '1px solid rgba(150,30,0,.3)', borderRadius: '6px', color: '#ee4020', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
          − Remove Layer
        </button>
      </div>

      {/* Activation function */}
      <div style={{ marginTop: '6px' }}>
        <div style={{ fontSize: '9px', color: '#143868', letterSpacing: '3px', fontWeight: 600, marginBottom: '8px' }}>ACTIVATION FUNCTION</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
          {ACTIVATIONS.map(({ value, label, formula }) => (
            <button key={value} onClick={() => setActivationFn(value)}
              style={{ padding: '8px 6px', background: activationFn === value ? 'rgba(0,100,200,.25)' : 'rgba(0,20,50,.5)', border: `1px solid ${activationFn === value ? 'rgba(0,150,255,.5)' : 'rgba(8,44,95,.4)'}`, borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <div style={{ fontSize: '11px', color: activationFn === value ? '#00c2f4' : '#2878a8', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: '9px', color: 'rgba(30,80,140,.6)', marginTop: '2px', fontStyle: 'italic' }}>{formula}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Randomize */}
      <button onClick={randomizeWeights}
        style={{ marginTop: '4px', padding: '8px', background: 'rgba(60,0,120,.15)', border: '1px solid rgba(80,0,160,.3)', borderRadius: '6px', color: '#a060ff', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '1px' }}>
        ⟳ Randomize Weights
      </button>
    </div>
  );
}

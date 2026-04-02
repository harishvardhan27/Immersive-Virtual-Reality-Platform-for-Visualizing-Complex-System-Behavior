import React, { useState, useEffect, useMemo } from 'react';
import NeuralNetwork3D from './components/NeuralNetwork3D';
import InputControls from './components/InputControls';
import ActivationSelector from './components/ActivationSelector';
import { NeuralNetwork } from './utils/networkMath';

function App() {
  const [input1, setInput1] = useState(0.5);
  const [input2, setInput2] = useState(0.5);
  const [activationFunc, setActivationFunc] = useState('sigmoid');
  
  const network = useMemo(() => new NeuralNetwork(), []);
  const [activations, setActivations] = useState([]);

  useEffect(() => {
    const result = network.forward([input1, input2], activationFunc);
    setActivations(result);
  }, [input1, input2, activationFunc, network]);

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h1 style={styles.mainTitle}>🧠 Neural Network Visualizer</h1>
        <p style={styles.subtitle}>Interactive 3D Neural Network</p>
        
        <InputControls
          input1={input1}
          input2={input2}
          onInput1Change={setInput1}
          onInput2Change={setInput2}
        />
        
        <ActivationSelector
          activationFunc={activationFunc}
          onActivationChange={setActivationFunc}
          network={network}
        />

        <div style={styles.info}>
          <h3 style={styles.infoTitle}>Network Architecture</h3>
          <div style={styles.architecture}>
            <div style={styles.archItem}>Input Layer: 2 neurons</div>
            <div style={styles.archItem}>Hidden Layer 1: 5 neurons</div>
            <div style={styles.archItem}>Hidden Layer 2: 4 neurons</div>
            <div style={styles.archItem}>Output Layer: 1 neuron</div>
          </div>
          
          <h3 style={styles.infoTitle}>Output Value</h3>
          <div style={styles.output}>
            {activations.length > 0 && activations[activations.length - 1]
              ? activations[activations.length - 1][0].toFixed(4)
              : '0.0000'}
          </div>

          <h3 style={styles.infoTitle}>Controls</h3>
          <div style={styles.controls}>
            <div>🖱️ Drag to rotate</div>
            <div>🔍 Scroll to zoom</div>
            <div>👆 Right-click to pan</div>
          </div>
        </div>
      </div>

      <div style={styles.canvas}>
        <NeuralNetwork3D network={network} activations={activations} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    background: '#000510',
    fontFamily: 'Arial, sans-serif',
    overflow: 'hidden',
  },
  sidebar: {
    width: '400px',
    padding: '20px',
    background: 'rgba(5, 5, 15, 0.95)',
    overflowY: 'auto',
    borderRight: '1px solid rgba(100, 200, 255, 0.2)',
  },
  mainTitle: {
    color: '#00d4ff',
    margin: '0 0 5px 0',
    fontSize: '24px',
    textAlign: 'center',
    textShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
  },
  subtitle: {
    color: '#888',
    margin: '0 0 25px 0',
    fontSize: '14px',
    textAlign: 'center',
  },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  info: {
    marginTop: '20px',
    background: 'rgba(10, 10, 30, 0.9)',
    padding: '20px',
    borderRadius: '10px',
    border: '1px solid rgba(100, 200, 255, 0.3)',
  },
  infoTitle: {
    color: '#00d4ff',
    fontSize: '14px',
    margin: '0 0 10px 0',
  },
  architecture: {
    color: '#aaa',
    fontSize: '12px',
    marginBottom: '15px',
  },
  archItem: {
    padding: '5px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  output: {
    background: 'rgba(0, 255, 136, 0.1)',
    padding: '15px',
    borderRadius: '5px',
    color: '#00ff88',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '15px',
    fontFamily: 'monospace',
  },
  controls: {
    color: '#888',
    fontSize: '12px',
    lineHeight: '1.8',
  },
};

export default App;

import React from 'react';

export default function ActivationSelector({ activationFunc, onActivationChange, network }) {
  const formulas = {
    relu: 'f(x) = max(0, x)',
    sigmoid: 'f(x) = 1 / (1 + e^(-x))',
    tanh: 'f(x) = tanh(x)',
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Activation Function</h3>
      
      <select
        value={activationFunc}
        onChange={(e) => onActivationChange(e.target.value)}
        style={styles.select}
      >
        <option value="relu">ReLU</option>
        <option value="sigmoid">Sigmoid</option>
        <option value="tanh">Tanh</option>
      </select>

      <div style={styles.formula}>
        <strong>Formula:</strong> {formulas[activationFunc]}
      </div>

      {network && network.activations.length > 0 && (
        <div style={styles.computation}>
          <h4 style={styles.subtitle}>Sample Computation (Hidden Layer 1, Neuron 1):</h4>
          <div style={styles.math}>
            <div>z = w₁×x₁ + w₂×x₂ + b</div>
            <div>z = {network.getWeight(0, 0, 0).toFixed(3)} × {network.getActivation(0, 0).toFixed(3)} + {network.getWeight(0, 1, 0).toFixed(3)} × {network.getActivation(0, 1).toFixed(3)} + {network.biases[0][0].toFixed(3)}</div>
            <div>z = {network.getZValue(0, 0).toFixed(3)}</div>
            <div style={styles.result}>a = {activationFunc}(z) = {network.getActivation(1, 0).toFixed(3)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: 'rgba(10, 10, 30, 0.9)',
    padding: '20px',
    borderRadius: '10px',
    border: '1px solid rgba(100, 200, 255, 0.3)',
  },
  title: {
    color: '#00d4ff',
    margin: '0 0 15px 0',
    fontSize: '18px',
    textAlign: 'center',
  },
  select: {
    width: '100%',
    padding: '10px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    border: '1px solid rgba(100, 200, 255, 0.5)',
    borderRadius: '5px',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '15px',
  },
  formula: {
    background: 'rgba(0, 212, 255, 0.1)',
    padding: '10px',
    borderRadius: '5px',
    color: '#00d4ff',
    fontSize: '13px',
    fontFamily: 'monospace',
    marginBottom: '15px',
  },
  computation: {
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '15px',
    borderRadius: '5px',
  },
  subtitle: {
    color: '#aaa',
    fontSize: '12px',
    margin: '0 0 10px 0',
  },
  math: {
    color: '#ccc',
    fontSize: '12px',
    fontFamily: 'monospace',
    lineHeight: '1.6',
  },
  result: {
    color: '#00ff88',
    fontWeight: 'bold',
    marginTop: '8px',
  },
};

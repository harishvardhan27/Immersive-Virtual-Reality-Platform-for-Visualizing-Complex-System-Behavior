import React from 'react';

export default function InputControls({ input1, input2, onInput1Change, onInput2Change }) {
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Input Controls</h3>
      
      <div style={styles.sliderGroup}>
        <label style={styles.label}>
          Input 1: <span style={styles.value}>{input1.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={input1 * 100}
          onChange={(e) => onInput1Change(e.target.value / 100)}
          style={styles.slider}
        />
      </div>

      <div style={styles.sliderGroup}>
        <label style={styles.label}>
          Input 2: <span style={styles.value}>{input2.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={input2 * 100}
          onChange={(e) => onInput2Change(e.target.value / 100)}
          style={styles.slider}
        />
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'rgba(10, 10, 30, 0.9)',
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '20px',
    border: '1px solid rgba(100, 200, 255, 0.3)',
  },
  title: {
    color: '#00d4ff',
    margin: '0 0 15px 0',
    fontSize: '18px',
    textAlign: 'center',
  },
  sliderGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    color: '#aaa',
    marginBottom: '8px',
    fontSize: '14px',
  },
  value: {
    color: '#00d4ff',
    fontWeight: 'bold',
    float: 'right',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '5px',
    background: 'linear-gradient(to right, #1a1a3e, #00d4ff)',
    outline: 'none',
    cursor: 'pointer',
  },
};

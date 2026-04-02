import * as tf from '@tensorflow/tfjs';

export const activationFunctions = {
  relu: (x) => Math.max(0, x),
  sigmoid: (x) => 1 / (1 + Math.exp(-x)),
  tanh: (x) => Math.tanh(x)
};

export class NeuralNetwork {
  constructor() {
    this.layers = [2, 5, 4, 1];
    this.weights = [];
    this.biases = [];
    this.activations = [];
    this.zValues = [];
    this.initializeWeights();
  }

  initializeWeights() {
    for (let i = 0; i < this.layers.length - 1; i++) {
      const w = [];
      for (let j = 0; j < this.layers[i]; j++) {
        const row = [];
        for (let k = 0; k < this.layers[i + 1]; k++) {
          row.push(Math.random() * 2 - 1);
        }
        w.push(row);
      }
      this.weights.push(w);
      
      const b = [];
      for (let j = 0; j < this.layers[i + 1]; j++) {
        b.push(Math.random() * 0.5 - 0.25);
      }
      this.biases.push(b);
    }
  }

  forward(inputs, activationFunc = 'sigmoid') {
    this.activations = [inputs];
    this.zValues = [];
    
    let currentActivation = inputs;
    
    for (let i = 0; i < this.weights.length; i++) {
      const z = [];
      const nextActivation = [];
      
      for (let j = 0; j < this.layers[i + 1]; j++) {
        let sum = this.biases[i][j];
        for (let k = 0; k < this.layers[i]; k++) {
          sum += currentActivation[k] * this.weights[i][k][j];
        }
        z.push(sum);
        nextActivation.push(activationFunctions[activationFunc](sum));
      }
      
      this.zValues.push(z);
      this.activations.push(nextActivation);
      currentActivation = nextActivation;
    }
    
    return this.activations;
  }

  getWeight(fromLayer, fromNeuron, toNeuron) {
    return this.weights[fromLayer][fromNeuron][toNeuron];
  }

  getActivation(layer, neuron) {
    return this.activations[layer] ? this.activations[layer][neuron] : 0;
  }

  getZValue(layer, neuron) {
    return this.zValues[layer] ? this.zValues[layer][neuron] : 0;
  }
}

import { create } from 'zustand';

function boxMuller(mean = 0, std = 1) {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function buildWeights(layers) {
  return layers.slice(0, -1).map((inp, l) => {
    const out = layers[l + 1];
    return {
      W: Array.from({ length: inp * out }, () => boxMuller(0, 0.88)),
      b: Array.from({ length: out }, () => boxMuller(0, 0.30)),
      inp, out
    };
  });
}

const sigmoid = x => 1 / (1 + Math.exp(-x));
function applyActivation(x, fn) {
  if (fn === 'relu') return Math.max(0, x);
  if (fn === 'tanh') return Math.tanh(x);
  if (fn === 'leaky_relu') return x > 0 ? x : 0.01 * x;
  return sigmoid(x);
}

function forwardPass(inputs, weights, layerSizes, activationFn) {
  const acts = [[...inputs]], rawZ = [[...inputs]];
  let curr = [...inputs];
  weights.forEach(({ W, b, inp, out }, l) => {
    const z = [], a = [];
    for (let j = 0; j < out; j++) {
      let s = b[j];
      for (let i = 0; i < inp; i++) s += curr[i] * W[i * out + j];
      z.push(s);
      a.push(l === weights.length - 1 ? sigmoid(s) : applyActivation(s, activationFn));
    }
    rawZ.push(z); acts.push(a); curr = a;
  });
  return { acts, rawZ };
}

export const useNetworkStore = create((set, get) => ({
  // Architecture
  layerSizes: [2, 5, 4, 1],
  activationFn: 'relu',
  weights: buildWeights([2, 5, 4, 1]),

  // Inputs
  inputs: [0.65, 0.35],
  inputMode: 'manual', // 'manual' | 'microphone' | 'csv' | 'arduino'

  // Forward pass results
  acts: null,
  rawZ: null,
  outputValue: 0,

  // UI state
  selectedNeuron: null,
  isAnimating: false,

  setActivationFn: (fn) => {
    set({ activationFn: fn });
    get().runForward();
  },

  setInput: (idx, val) => {
    const inputs = [...get().inputs];
    inputs[idx] = val;
    set({ inputs });
    get().runForward();
  },

  setInputs: (inputs) => {
    set({ inputs });
    get().runForward();
  },

  setInputMode: (mode) => set({ inputMode: mode }),

  setSelectedNeuron: (n) => set({ selectedNeuron: n }),

  setIsAnimating: (v) => set({ isAnimating: v }),

  addLayer: () => {
    const { layerSizes } = get();
    if (layerSizes.length >= 6) return;
    const newSizes = [...layerSizes.slice(0, -1), 4, layerSizes[layerSizes.length - 1]];
    const weights = buildWeights(newSizes);
    set({ layerSizes: newSizes, weights });
    get().runForward();
  },

  removeLayer: () => {
    const { layerSizes } = get();
    if (layerSizes.length <= 3) return;
    const newSizes = [...layerSizes.slice(0, -2), layerSizes[layerSizes.length - 1]];
    const weights = buildWeights(newSizes);
    set({ layerSizes: newSizes, weights });
    get().runForward();
  },

  setLayerNeurons: (layerIdx, count) => {
    const { layerSizes } = get();
    const newSizes = [...layerSizes];
    newSizes[layerIdx] = Math.max(1, Math.min(10, count));
    const weights = buildWeights(newSizes);
    set({ layerSizes: newSizes, weights });
    get().runForward();
  },

  randomizeWeights: () => {
    const weights = buildWeights(get().layerSizes);
    set({ weights });
    get().runForward();
  },

  runForward: () => {
    const { inputs, weights, layerSizes, activationFn } = get();
    const { acts, rawZ } = forwardPass(inputs, weights, layerSizes, activationFn);
    const outputValue = acts[acts.length - 1][0];
    set({ acts, rawZ, outputValue });
  },
}));

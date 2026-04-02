import * as THREE from 'three';

export function getActivationColor(activation) {
  if (activation < 0.25) {
    // Dark blue to light blue
    const t = activation / 0.25;
    return new THREE.Color().lerpColors(
      new THREE.Color(0x001144),
      new THREE.Color(0x0088ff),
      t
    );
  } else if (activation < 0.6) {
    // Light blue to yellow
    const t = (activation - 0.25) / 0.35;
    return new THREE.Color().lerpColors(
      new THREE.Color(0x0088ff),
      new THREE.Color(0xffff00),
      t
    );
  } else {
    // Yellow to red
    const t = (activation - 0.6) / 0.4;
    return new THREE.Color().lerpColors(
      new THREE.Color(0xffff00),
      new THREE.Color(0xff0000),
      t
    );
  }
}

export function getWeightThickness(weight) {
  return Math.abs(weight) * 0.05 + 0.01;
}

export function getWeightColor(weight) {
  if (weight > 0) {
    return new THREE.Color(0x00ff88);
  } else {
    return new THREE.Color(0xff4444);
  }
}

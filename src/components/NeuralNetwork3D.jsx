import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { getActivationColor, getWeightThickness, getWeightColor } from '../utils/colorMapping';

function Neuron({ position, activation, label }) {
  const meshRef = useRef();
  const glowRef = useRef();
  
  useFrame(() => {
    if (meshRef.current) {
      const color = getActivationColor(activation);
      meshRef.current.material.color = color;
      meshRef.current.material.emissiveIntensity = 0.5 + activation * 1.5;
      
      const scale = 1 + activation * 0.3;
      meshRef.current.scale.set(scale, scale, scale);
    }
    
    if (glowRef.current) {
      glowRef.current.material.opacity = activation * 0.4;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial
          color="#0088ff"
          emissive="#0088ff"
          emissiveIntensity={0.5}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.2}
        />
      </mesh>
      
      <Text
        position={[0, 0.4, 0]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      
      <Text
        position={[0, -0.4, 0]}
        fontSize={0.12}
        color="#00d4ff"
        anchorX="center"
        anchorY="middle"
      >
        {activation.toFixed(2)}
      </Text>
    </group>
  );
}

function Connection({ start, end, weight, active }) {
  const lineRef = useRef();
  
  const points = useMemo(() => {
    return [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  }, [start, end]);

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  useFrame(() => {
    if (lineRef.current) {
      const color = getWeightColor(weight);
      lineRef.current.material.color = color;
      lineRef.current.material.opacity = active ? 0.6 : 0.3;
    }
  });

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        color={getWeightColor(weight)}
        linewidth={getWeightThickness(weight) * 100}
        transparent
        opacity={0.3}
      />
    </line>
  );
}

function SignalPulse({ start, end, progress }) {
  const position = useMemo(() => {
    return [
      start[0] + (end[0] - start[0]) * progress,
      start[1] + (end[1] - start[1]) * progress,
      start[2] + (end[2] - start[2]) * progress,
    ];
  }, [start, end, progress]);

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
    </mesh>
  );
}

function NetworkScene({ network, activations, showPulses }) {
  const [pulses, setPulses] = useState([]);
  
  const layerPositions = useMemo(() => {
    return [
      { x: -6, neurons: 2 },
      { x: -2, neurons: 5 },
      { x: 2, neurons: 4 },
      { x: 6, neurons: 1 },
    ];
  }, []);

  const neuronPositions = useMemo(() => {
    const positions = [];
    layerPositions.forEach((layer, layerIdx) => {
      const layerPos = [];
      for (let i = 0; i < layer.neurons; i++) {
        const y = (i - (layer.neurons - 1) / 2) * 1.2;
        layerPos.push([layer.x, y, 0]);
      }
      positions.push(layerPos);
    });
    return positions;
  }, [layerPositions]);

  const connections = useMemo(() => {
    const conns = [];
    for (let l = 0; l < neuronPositions.length - 1; l++) {
      for (let i = 0; i < neuronPositions[l].length; i++) {
        for (let j = 0; j < neuronPositions[l + 1].length; j++) {
          conns.push({
            start: neuronPositions[l][i],
            end: neuronPositions[l + 1][j],
            weight: network.getWeight(l, i, j),
            fromLayer: l,
            fromNeuron: i,
            toNeuron: j,
          });
        }
      }
    }
    return conns;
  }, [neuronPositions, network]);

  useEffect(() => {
    if (showPulses) {
      const newPulses = [];
      connections.forEach((conn, idx) => {
        const fromActivation = activations[conn.fromLayer][conn.fromNeuron];
        if (fromActivation > 0.3 && Math.random() > 0.7) {
          newPulses.push({
            id: Date.now() + idx,
            start: conn.start,
            end: conn.end,
            progress: 0,
          });
        }
      });
      setPulses(newPulses);
    }
  }, [showPulses, connections, activations]);

  useFrame(() => {
    setPulses((prev) =>
      prev
        .map((p) => ({ ...p, progress: p.progress + 0.02 }))
        .filter((p) => p.progress < 1)
    );
  });

  return (
    <>
      {connections.map((conn, idx) => (
        <Connection
          key={idx}
          start={conn.start}
          end={conn.end}
          weight={conn.weight}
          active={activations[conn.fromLayer][conn.fromNeuron] > 0.3}
        />
      ))}

      {neuronPositions.map((layer, layerIdx) =>
        layer.map((pos, neuronIdx) => (
          <Neuron
            key={`${layerIdx}-${neuronIdx}`}
            position={pos}
            activation={activations[layerIdx] ? activations[layerIdx][neuronIdx] : 0}
            label={
              layerIdx === 0
                ? `I${neuronIdx + 1}`
                : layerIdx === neuronPositions.length - 1
                ? 'O'
                : `H${layerIdx}-${neuronIdx + 1}`
            }
          />
        ))
      )}

      {pulses.map((pulse) => (
        <SignalPulse
          key={pulse.id}
          start={pulse.start}
          end={pulse.end}
          progress={pulse.progress}
        />
      ))}
    </>
  );
}

export default function NeuralNetwork3D({ network, activations }) {
  const [showPulses, setShowPulses] = useState(false);

  useEffect(() => {
    setShowPulses(true);
    const timer = setTimeout(() => setShowPulses(false), 100);
    return () => clearTimeout(timer);
  }, [activations]);

  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 50 }}
      style={{ background: '#000510' }}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      <NetworkScene
        network={network}
        activations={activations}
        showPulses={showPulses}
      />
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
      />
    </Canvas>
  );
}

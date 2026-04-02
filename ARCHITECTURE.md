# System Architecture Diagram

## Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NEURAL NETWORK VISUALIZER                     │
│                     3D Real-Time Brain Simulation                    │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   MANUAL MODE        │   OR    │   ARDUINO MODE       │
│                      │         │                      │
│  ┌────────────┐      │         │  ┌────────────┐     │
│  │  Slider 1  │──────┼─────────┼──│ Sound      │     │
│  │  (0-1)     │      │         │  │ Sensor     │     │
│  └────────────┘      │         │  └─────┬──────┘     │
│                      │         │        │            │
│  ┌────────────┐      │         │  ┌─────▼──────┐     │
│  │  Slider 2  │──────┼─────────┼──│ Arduino    │     │
│  │  (0-1)     │      │         │  │ A0 Pin     │     │
│  └────────────┘      │         │  └─────┬──────┘     │
│                      │         │        │            │
└──────────┬───────────┘         │  ┌─────▼──────┐     │
           │                     │  │ Serial     │     │
           │                     │  │ 9600 baud  │     │
           │                     │  └─────┬──────┘     │
           │                     │        │            │
           │                     │  ┌─────▼──────┐     │
           │                     │  │ Web Serial │     │
           │                     │  │ API        │     │
           │                     │  └─────┬──────┘     │
           │                     │        │            │
           └─────────────────────┴────────┘            │
                                 │                     │
                                 ▼                     │
                    ┌────────────────────────┐         │
                    │   INPUT NORMALIZATION  │         │
                    │   (0-1023 → 0-1)       │         │
                    └────────────┬───────────┘         │
                                 │                     │
                                 ▼                     │
                    ┌────────────────────────┐         │
                    │   NEURAL NETWORK       │         │
                    │   Forward Propagation  │         │
                    │                        │         │
                    │   Input Layer (2)      │         │
                    │        ↓               │         │
                    │   Hidden 1 (5)         │         │
                    │        ↓               │         │
                    │   Hidden 2 (4)         │         │
                    │        ↓               │         │
                    │   Output (1)           │         │
                    └────────────┬───────────┘         │
                                 │                     │
                                 ▼                     │
                    ┌────────────────────────┐         │
                    │   ACTIVATION VALUES    │         │
                    │   [0.0 - 1.0]          │         │
                    └────────────┬───────────┘         │
                                 │                     │
                                 ▼                     │
                    ┌────────────────────────┐         │
                    │   VISUAL EFFECTS       │         │
                    │                        │         │
                    │   • Color Mapping      │         │
                    │   • Scale Expansion    │         │
                    │   • Glow Intensity     │         │
                    │   • Pulse Spawning     │         │
                    │   • Ripple Effects     │         │
                    └────────────┬───────────┘         │
                                 │                     │
                                 ▼                     │
                    ┌────────────────────────┐         │
                    │   THREE.JS RENDERER    │         │
                    │   60 FPS Animation     │         │
                    └────────────┬───────────┘         │
                                 │                     │
                                 ▼                     │
                    ┌────────────────────────┐         │
                    │   BROWSER CANVAS       │         │
                    │   WebGL Rendering      │         │
                    └────────────────────────┘         │
                                                        │
└───────────────────────────────────────────────────────┘
```

## Layer-by-Layer Visualization

```
TIME: 0.00s                    TIME: 0.75s                    TIME: 1.50s                    TIME: 2.25s
┌──────────┐                   ┌──────────┐                   ┌──────────┐                   ┌──────────┐
│ INPUT    │                   │ INPUT    │                   │ INPUT    │                   │ INPUT    │
│ LAYER    │                   │ LAYER    │                   │ LAYER    │                   │ LAYER    │
│          │                   │          │                   │          │                   │          │
│  ●  ●   │ ──────────────▶   │  ●  ●   │ ──────────────▶   │  ●  ●   │ ──────────────▶   │  ●  ●   │
│ (FIRE!)  │                   │ (FIRE!)  │                   │ (FIRE!)  │                   │ (FIRE!)  │
└──────────┘                   └──────────┘                   └──────────┘                   └──────────┘
                                     │                              │                              │
                                     │ Pulses                       │ Pulses                       │ Pulses
                                     │ Travel                       │ Travel                       │ Travel
                                     ▼                              ▼                              ▼
                               ┌──────────┐                   ┌──────────┐                   ┌──────────┐
                               │ HIDDEN 1 │                   │ HIDDEN 1 │                   │ HIDDEN 1 │
                               │          │                   │          │                   │          │
                               │ ● ● ● ● │                   │ ● ● ● ● │                   │ ● ● ● ● │
                               │   (FIRE!)│ ──────────────▶   │ (FIRE!)  │ ──────────────▶   │ (FIRE!)  │
                               └──────────┘                   └──────────┘                   └──────────┘
                                                                    │                              │
                                                                    │ Pulses                       │ Pulses
                                                                    │ Travel                       │ Travel
                                                                    ▼                              ▼
                                                              ┌──────────┐                   ┌──────────┐
                                                              │ HIDDEN 2 │                   │ HIDDEN 2 │
                                                              │          │                   │          │
                                                              │ ● ● ● ● │                   │ ● ● ● ● │
                                                              │  (FIRE!) │ ──────────────▶   │ (FIRE!)  │
                                                              └──────────┘                   └──────────┘
                                                                                                   │
                                                                                                   │ Pulses
                                                                                                   │ Travel
                                                                                                   ▼
                                                                                             ┌──────────┐
                                                                                             │ OUTPUT   │
                                                                                             │          │
                                                                                             │    ●     │
                                                                                             │  (FIRE!) │
                                                                                             └──────────┘
```

## Neuron Activation States

```
ACTIVATION LEVEL          COLOR           VISUAL EFFECTS
─────────────────────────────────────────────────────────────
0.00 - 0.25              Navy Blue       • Minimal glow
  ●                      #001144         • Scale: 1.0
  Idle                                   • Dim emissive

0.25 - 0.50              Light Blue      • Moderate glow
  ●                      #0088ff         • Scale: 1.1
  Low                                    • Medium emissive

0.50 - 0.75              Cyan            • Strong glow
  ●                      #00ffff         • Scale: 1.2
  Medium                                 • Bright emissive

0.75 - 0.90              Yellow          • Intense glow
  ●                      #ffff00         • Scale: 1.3
  High                                   • Very bright

0.90 - 1.00              Red             • Maximum glow
  ●                      #ff0000         • Scale: 1.4
  Very High                              • Ripple rings!
```

## Connection Types

```
POSITIVE WEIGHT (Excitatory)
─────────────────────────────
  ●─────────────────●
  Green Line
  Strengthens signal
  Weight > 0


NEGATIVE WEIGHT (Inhibitory)
─────────────────────────────
  ●─────────────────●
  Red Line
  Weakens signal
  Weight < 0


PULSE TRAIL (Signal)
─────────────────────────────
  ●───⚪⚪⚪⚪⚪⚪───●
  6 spheres
  Travels along connection
  Speed: 0.95 units/sec
```

## Arduino Data Flow

```
┌─────────────┐
│ SOUND WAVE  │  🔊 Clap / Music / Voice
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ MICROPHONE  │  Converts sound → voltage
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ AMPLIFIER   │  Boosts signal
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ ARDUINO A0  │  Reads analog value (0-1023)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ MAP         │  Scale to 0-500
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SERIAL TX   │  Send via USB (9600 baud)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ WEB SERIAL  │  Browser receives data
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ NORMALIZE   │  Divide by 500 → (0-1)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ INPUT 1     │  Current sound level
└─────────────┘

┌─────────────┐
│ INPUT 2     │  Previous sound level
└─────────────┘
```

## File Structure

```
neural-viz/
│
├── 📄 start.bat                    ← Double-click to run!
├── 📄 QUICKSTART.md                ← Read this first
├── 📄 EXECUTION_GUIDE.md           ← Detailed instructions
├── 📄 ARCHITECTURE.md              ← This file
│
├── 📄 package.json                 ← Dependencies
├── 📄 vite.config.js               ← Build config
├── 📄 index.html                   ← Entry point
│
├── 🔌 arduino_sound_sensor.ino     ← Upload to Arduino
│
└── 📁 src/
    ├── 📄 main.jsx                 ← React entry
    ├── 📄 App.jsx                  ← Main app component
    ├── 📄 index.css                ← Global styles
    │
    ├── 📁 hooks/
    │   └── 📄 useSerial.jsx        ← Arduino connection hook
    │
    ├── 📁 utils/
    │   └── 📄 mm.jsx               ← Main visualization component
    │                                  (2000+ lines of Three.js magic!)
    └── 📁 components/
        ├── 📄 NeuralNetwork3D.jsx  ← (Not used in mm.jsx version)
        ├── 📄 InputControls.jsx    ← (Not used in mm.jsx version)
        └── 📄 ActivationSelector.jsx ← (Not used in mm.jsx version)
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND STACK                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  React 18.2.0          ← UI Framework                   │
│  Three.js 0.160.0      ← 3D Graphics Engine             │
│  Vite 5.0.0            ← Build Tool & Dev Server        │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                    HARDWARE STACK                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Arduino Uno/Nano      ← Microcontroller                │
│  Sound Sensor          ← Analog Input Device            │
│  USB Serial            ← Communication Protocol         │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                    BROWSER APIs                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Web Serial API        ← Hardware Communication         │
│  WebGL                 ← GPU-Accelerated Rendering      │
│  requestAnimationFrame ← 60 FPS Animation Loop          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Performance Metrics

```
┌──────────────────────────────────────┐
│ RENDERING PERFORMANCE                │
├──────────────────────────────────────┤
│ Frame Rate:        60 FPS            │
│ Neurons:           12 total          │
│ Connections:       38 total          │
│ Pulse Spheres:     228 (38 × 6)     │
│ Draw Calls:        ~300/frame        │
│ Memory Usage:      ~150 MB           │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ NETWORK PERFORMANCE                  │
├──────────────────────────────────────┤
│ Forward Pass:      <1ms              │
│ Activation Calc:   <0.1ms/neuron    │
│ Total Latency:     <5ms              │
│ Update Rate:       60 Hz             │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ SERIAL COMMUNICATION                 │
├──────────────────────────────────────┤
│ Baud Rate:         9600              │
│ Sample Rate:       50 Hz             │
│ Data Format:       ASCII numbers     │
│ Latency:           ~20ms             │
└──────────────────────────────────────┘
```

---

**This architecture enables real-time visualization of neural network behavior driven by physical sensor input!**

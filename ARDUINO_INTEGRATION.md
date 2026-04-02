# Neural Network 3D Visualizer with Arduino Integration

A stunning 3D neural network visualization that responds to real-world sensor data from Arduino.

## Features

✨ **Advanced 3D Visualization**
- Brain-like organic neuron layout using Fibonacci spiral distribution
- 6-sphere pulse trails traveling along connections
- Ripple effects when neurons fire
- Dynamic color mapping (navy → blue → cyan → yellow → red)
- Scale expansion on activation (1 + activation * 0.4)
- Emissive glow intensity based on activation

🎮 **Interactive Controls**
- Manual input sliders OR Arduino sensor input
- Real-time activation function switching (ReLU, Sigmoid, Tanh)
- Click neurons to inspect their computation
- Orbit camera controls (drag, zoom, pan)

🔌 **Arduino Integration**
- Web Serial API connection to Arduino
- Real-time sound sensor data input
- Automatic neuron firing based on sound levels
- Extra pulse spawning on sound spikes (threshold: 0.6)
- Visual feedback with connection status

## Hardware Setup

### Required Components
- Arduino Uno/Nano
- Sound sensor module (analog)
- USB cable
- Optional: LED for visual feedback

### Wiring
```
Sound Sensor VCC  →  Arduino 5V
Sound Sensor GND  →  Arduino GND
Sound Sensor OUT  →  Arduino A0
LED (optional)    →  Arduino Pin 13
```

## Arduino Code

Upload `arduino_sound_sensor.ino` to your Arduino:

```cpp
const int SOUND_PIN = A0;
const int SAMPLE_RATE = 50; // Hz

void setup() {
  Serial.begin(9600);
  pinMode(SOUND_PIN, INPUT);
}

void loop() {
  int soundLevel = analogRead(SOUND_PIN);
  soundLevel = map(soundLevel, 0, 1023, 0, 500);
  Serial.println(soundLevel);
  delay(20);
}
```

## Installation

```bash
cd neural-viz
npm install
npm run dev
```

## Usage

### Manual Mode
1. Open http://localhost:5173
2. Use the sliders to control Input 1 and Input 2
3. Watch neurons fire and signals propagate

### Arduino Mode
1. Upload Arduino code to your board
2. Open the web app in Chrome/Edge (Web Serial API required)
3. Toggle "Arduino Mode" to ON
4. Click "CONNECT ARDUINO"
5. Select your Arduino port
6. Make sounds near the sensor
7. Watch the neural network react in real-time!

## How It Works

### Signal Flow
```
Sound Sensor → Arduino → Serial → Web Serial API → Neural Network
     ↓
  Input 1 = current sound level (normalized 0-1)
  Input 2 = previous sound level (normalized 0-1)
     ↓
  Forward Propagation through layers
     ↓
  Visual Updates:
  - Neuron color changes
  - Scale expansion
  - Glow intensity increase
  - Pulse spawning along connections
  - Ripple effects
```

### Neuron Activation Visual Effects

**Low Activation (0.0 - 0.25)**
- Color: Dark blue → Light blue
- Glow: Minimal
- Scale: 1.0

**Medium Activation (0.25 - 0.5)**
- Color: Light blue → Cyan
- Glow: Moderate
- Scale: 1.0 - 1.2

**High Activation (0.5 - 0.75)**
- Color: Cyan → Yellow
- Glow: Strong
- Scale: 1.2 - 1.3

**Very High Activation (0.75 - 1.0)**
- Color: Yellow → Red
- Glow: Intense
- Scale: 1.3 - 1.4
- Ripple rings triggered

### Sound Spike Detection

When sound level > 0.6 (threshold):
- Extra pulses spawn randomly along connections
- Increased neuron firing rate
- More visible signal propagation
- Enhanced visual feedback

## Network Architecture

```
Input Layer:    2 neurons  (sound level, previous sound level)
Hidden Layer 1: 5 neurons  (organic cluster)
Hidden Layer 2: 4 neurons  (organic cluster)
Output Layer:   1 neuron   (final activation)

Total Connections: 38
Total Parameters: 51
```

## Propagation Timeline

- **0.00s** - Input layer activates
- **0.75s** - Hidden layer 1 activates
- **1.50s** - Hidden layer 2 activates
- **2.25s** - Output layer activates

## Browser Compatibility

**Supported:**
- Chrome 89+
- Edge 89+
- Opera 75+

**Not Supported:**
- Firefox (no Web Serial API)
- Safari (no Web Serial API)

## Troubleshooting

**Arduino not connecting:**
- Check USB cable connection
- Verify correct baud rate (9600)
- Try different USB port
- Check browser console for errors

**No sensor readings:**
- Verify wiring connections
- Check sensor power (5V)
- Test sensor with Arduino Serial Monitor first
- Adjust calibration in Arduino code

**Neurons not firing:**
- Check Arduino Mode is ON
- Verify connection status shows green dot
- Make louder sounds near sensor
- Lower SOUND_THRESHOLD in code

## Advanced Configuration

### Adjust Sensitivity
In `mm.jsx`:
```javascript
const SOUND_THRESHOLD = 0.6; // Lower = more sensitive
```

### Change Pulse Speed
```javascript
const PULSE_SPEED = 0.95; // Higher = faster pulses
```

### Modify Layer Delays
```javascript
const LAYER_DELAYS = [0, 0.75, 1.50, 2.25]; // seconds
```

## Technologies

- **React** - UI framework
- **Three.js** - 3D rendering
- **Web Serial API** - Arduino communication
- **TensorFlow.js** - Neural network math
- **Vite** - Build tool

## License

MIT

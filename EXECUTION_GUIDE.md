# Complete Execution Guide - Neural Network 3D Visualizer

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- [ ] Node.js installed (v16 or higher)
- [ ] npm installed (comes with Node.js)
- [ ] Chrome or Edge browser (for Web Serial API)
- [ ] Arduino Uno/Nano (optional, for sensor input)
- [ ] Sound sensor module (optional)
- [ ] USB cable for Arduino (optional)

---

## 🚀 Part 1: Running Without Arduino (Manual Mode)

### Step 1: Open Terminal/Command Prompt

**Windows:**
- Press `Win + R`
- Type `cmd` and press Enter

**Mac/Linux:**
- Press `Cmd + Space` (Mac) or `Ctrl + Alt + T` (Linux)
- Type `terminal` and press Enter

### Step 2: Navigate to Project Directory

```bash
cd e:\projects\oculus\neural-viz
```

### Step 3: Install Dependencies

```bash
npm install
```

**Expected output:**
```
added 234 packages in 45s
```

**If you see errors:**
- Delete `node_modules` folder and `package-lock.json`
- Run `npm install` again

### Step 4: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
  VITE v5.0.0  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### Step 5: Open in Browser

1. Open **Chrome** or **Edge** browser
2. Go to: `http://localhost:5173`
3. You should see the 3D neural network visualization

### Step 6: Test Manual Controls

1. **Move Input Sliders:**
   - Drag "Input 1" slider left/right
   - Drag "Input 2" slider left/right
   - Watch neurons change color and fire

2. **Change Activation Function:**
   - Click dropdown menu
   - Select ReLU, Sigmoid, or Tanh
   - Observe different activation patterns

3. **Inspect Neurons:**
   - Click any neuron sphere in 3D view
   - See computation details in right panel

4. **Camera Controls:**
   - **Rotate:** Click and drag
   - **Zoom:** Scroll mouse wheel
   - **Pan:** Right-click and drag

---

## 🔌 Part 2: Arduino Integration (Sensor Mode)

### Step 1: Hardware Setup

#### Components Needed:
- Arduino Uno or Nano
- Sound sensor module (KY-037 or similar)
- 3 jumper wires
- USB cable

#### Wiring Diagram:
```
Sound Sensor          Arduino
─────────────────────────────
VCC (Power)    →     5V
GND (Ground)   →     GND
OUT (Signal)   →     A0
```

**Visual Guide:**
```
    [Sound Sensor]
         |
    VCC  GND  OUT
     |    |    |
     |    |    |
    [Arduino Board]
     5V  GND  A0
```

### Step 2: Install Arduino IDE

1. Download from: https://www.arduino.cc/en/software
2. Install Arduino IDE
3. Open Arduino IDE

### Step 3: Upload Arduino Code

1. **Open the Arduino sketch:**
   - File → Open
   - Navigate to: `e:\projects\oculus\neural-viz\arduino_sound_sensor.ino`

2. **Select Board:**
   - Tools → Board → Arduino Uno (or your board)

3. **Select Port:**
   - Tools → Port → COM3 (or your port)
   - On Mac/Linux: `/dev/ttyUSB0` or `/dev/cu.usbserial`

4. **Upload Code:**
   - Click Upload button (→) or press `Ctrl+U`
   - Wait for "Done uploading" message

5. **Test Serial Output:**
   - Tools → Serial Monitor
   - Set baud rate to **9600**
   - You should see numbers scrolling:
   ```
   125
   130
   145
   200
   180
   ...
   ```

### Step 4: Connect Arduino to Web App

1. **Ensure Arduino is plugged in via USB**

2. **Close Arduino Serial Monitor** (important!)
   - The port must be free for Web Serial API

3. **Open the web app** (should already be running)
   - Go to: `http://localhost:5173`

4. **Enable Arduino Mode:**
   - Find "Arduino Mode" section in right panel
   - Toggle switch to **ON**

5. **Click "CONNECT ARDUINO" button**

6. **Select Port:**
   - Browser will show port selection dialog
   - Choose your Arduino port (e.g., COM3)
   - Click "Connect"

7. **Verify Connection:**
   - You should see: "● ARDUINO CONNECTED" (green dot)
   - Raw sensor value displayed
   - Input sliders become disabled (grayed out)

### Step 5: Test Sensor Input

1. **Make sounds near the sensor:**
   - Clap your hands
   - Snap fingers
   - Play music
   - Talk loudly

2. **Observe the visualization:**
   - Input 1 value changes with sound level
   - Input 2 shows previous sound level
   - Neurons fire based on sound intensity
   - Pulses travel along connections
   - Loud sounds trigger extra pulses

3. **Watch for effects:**
   - **Quiet:** Dark blue neurons, minimal activity
   - **Medium sound:** Cyan/yellow neurons, moderate pulses
   - **Loud sound:** Red neurons, intense firing, ripple effects

---

## 🎯 Part 3: Understanding the Visualization

### What You're Seeing

**Neurons (Spheres):**
- **Color:** Indicates activation level
  - Navy blue = Low (0.0 - 0.25)
  - Light blue = Medium-low (0.25 - 0.5)
  - Cyan = Medium (0.5 - 0.75)
  - Yellow = High (0.75 - 0.9)
  - Red = Very high (0.9 - 1.0)

- **Size:** Scales with activation (1.0 to 1.4x)
- **Glow:** Brightness increases with activation
- **Rings:** Rotate faster when active

**Connections (Tubes):**
- **Green:** Positive weights (excitatory)
- **Red:** Negative weights (inhibitory)
- **Thickness:** Weight strength
- **Brightness:** Active when signals pass

**Pulses (Moving Spheres):**
- **White/Cyan:** Signal traveling
- **6-sphere trail:** Creates motion blur effect
- **Speed:** Configurable (default 0.95)

**Ripples (Expanding Rings):**
- Appear when neuron first activates
- Expand outward and fade
- Indicate neuron "firing"

### Signal Flow Timeline

```
0.00s → Input neurons activate
         ↓
0.75s → Hidden Layer 1 activates
         ↓
1.50s → Hidden Layer 2 activates
         ↓
2.25s → Output neuron activates
```

---

## 🛠️ Troubleshooting

### Problem: npm install fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rmdir /s node_modules
del package-lock.json

# Reinstall
npm install
```

### Problem: Port already in use

**Solution:**
```bash
# Kill process on port 5173
netstat -ano | findstr :5173
taskkill /PID <PID_NUMBER> /F

# Or use different port
npm run dev -- --port 3000
```

### Problem: Arduino not detected

**Solution:**
1. Check USB cable (must support data, not just power)
2. Install Arduino drivers
3. Try different USB port
4. Restart computer
5. Check Device Manager (Windows) for COM ports

### Problem: Web Serial API not working

**Solution:**
1. Use Chrome or Edge (not Firefox/Safari)
2. Enable flag: `chrome://flags/#enable-web-serial`
3. Restart browser
4. Check HTTPS (localhost is allowed)

### Problem: No sensor readings

**Solution:**
1. Verify wiring (VCC, GND, OUT)
2. Check sensor LED (should light up)
3. Test with Arduino Serial Monitor first
4. Adjust sensor potentiometer (if available)
5. Check 5V power supply

### Problem: Neurons not responding to sound

**Solution:**
1. Verify Arduino Mode is ON
2. Check connection status (green dot)
3. Make louder sounds
4. Lower threshold in code:
   ```javascript
   const SOUND_THRESHOLD = 0.4; // was 0.6
   ```

### Problem: Visualization is laggy

**Solution:**
1. Close other browser tabs
2. Reduce neuron count in code
3. Disable browser extensions
4. Update graphics drivers
5. Use dedicated GPU (if available)

---

## 📊 Testing Checklist

### Manual Mode Tests
- [ ] Sliders move smoothly
- [ ] Neurons change color
- [ ] Pulses travel along connections
- [ ] Activation function switching works
- [ ] Neuron inspection shows values
- [ ] Camera controls work (rotate, zoom, pan)
- [ ] Output value updates

### Arduino Mode Tests
- [ ] Arduino connects successfully
- [ ] Raw sensor value displays
- [ ] Input values update from sensor
- [ ] Sliders become disabled
- [ ] Neurons respond to sound
- [ ] Extra pulses spawn on loud sounds
- [ ] Disconnect button works

---

## 🎨 Customization Options

### Change Network Size

Edit `mm.jsx`:
```javascript
const LAYER_SIZES = [2, 8, 6, 1]; // Increase hidden layers
```

### Adjust Sensitivity

```javascript
const SOUND_THRESHOLD = 0.5; // Lower = more sensitive
```

### Change Colors

```javascript
function actToRGB(t) {
  // Modify color gradient here
  // Current: navy → blue → cyan → yellow → red
}
```

### Modify Pulse Speed

```javascript
const PULSE_SPEED = 1.5; // Faster pulses
```

### Change Propagation Delays

```javascript
const LAYER_DELAYS = [0, 0.5, 1.0, 1.5]; // Faster propagation
```

---

## 📱 Quick Start Commands

```bash
# Navigate to project
cd e:\projects\oculus\neural-viz

# Install dependencies (first time only)
npm install

# Start development server
npm run dev

# Open browser
# Go to: http://localhost:5173

# Stop server
# Press Ctrl+C in terminal
```

---

## 🎓 Learning Resources

**Understanding Neural Networks:**
- Input layer receives external data
- Hidden layers process information
- Output layer produces result
- Weights determine connection strength
- Activation functions introduce non-linearity

**Web Serial API:**
- Allows browser to communicate with hardware
- Requires user permission
- Only works on HTTPS or localhost
- Supported in Chrome/Edge

**Three.js Concepts:**
- Scene: Container for 3D objects
- Camera: Viewpoint
- Renderer: Draws to canvas
- Mesh: 3D object (geometry + material)
- Animation loop: Updates every frame

---

## 🆘 Getting Help

If you encounter issues:

1. **Check browser console:**
   - Press F12
   - Look for error messages in Console tab

2. **Check terminal output:**
   - Look for errors in terminal where `npm run dev` is running

3. **Verify file structure:**
   ```
   neural-viz/
   ├── src/
   │   ├── hooks/
   │   │   └── useSerial.jsx
   │   ├── utils/
   │   │   └── mm.jsx
   │   ├── App.jsx
   │   └── main.jsx
   ├── arduino_sound_sensor.ino
   └── package.json
   ```

4. **Test step by step:**
   - First test without Arduino
   - Then test Arduino separately
   - Finally combine both

---

## ✅ Success Indicators

You know it's working when:
- ✓ Browser shows 3D neural network
- ✓ Neurons glow and change color
- ✓ Pulses travel along connections
- ✓ Sliders control neuron activation
- ✓ Arduino connects (green dot)
- ✓ Sound triggers neuron firing
- ✓ Output value changes smoothly

---

## 🎉 Next Steps

Once everything works:
1. Experiment with different sounds
2. Try different activation functions
3. Modify network architecture
4. Add more sensors (temperature, light, etc.)
5. Record videos of the visualization
6. Share with others!

---

**Need more help?** Check the browser console (F12) for detailed error messages.

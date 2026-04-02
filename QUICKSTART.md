# 🚀 QUICK START - Neural Network Visualizer

## Option 1: Double-Click Method (Easiest)

1. **Double-click** `start.bat` in the `neural-viz` folder
2. Wait for browser to open automatically
3. Start using the visualization!

---

## Option 2: Manual Method

### Step 1: Open Terminal
```bash
cd e:\projects\oculus\neural-viz
```

### Step 2: Install & Run
```bash
npm install
npm run dev
```

### Step 3: Open Browser
Go to: **http://localhost:5173**

---

## 🎮 Using the App

### Manual Mode (No Arduino)
1. Move the **Input 1** and **Input 2** sliders
2. Watch neurons fire and change color
3. Click neurons to inspect their values

### Arduino Mode (With Sensor)
1. Connect Arduino via USB
2. Toggle **Arduino Mode** to ON
3. Click **CONNECT ARDUINO**
4. Select your Arduino port
5. Make sounds near the sensor
6. Watch neurons react to sound!

---

## 🎨 What You'll See

**Neuron Colors:**
- 🔵 Navy Blue = Low activation (quiet)
- 🔵 Light Blue = Medium-low
- 🔵 Cyan = Medium
- 🟡 Yellow = High
- 🔴 Red = Very high (loud sound!)

**Effects:**
- ⚡ White pulses = Signals traveling
- 💫 Ripples = Neuron firing
- 🟢 Green lines = Positive connections
- 🔴 Red lines = Negative connections

---

## 🛠️ Arduino Setup (Optional)

### Wiring:
```
Sound Sensor → Arduino
VCC → 5V
GND → GND
OUT → A0
```

### Upload Code:
1. Open Arduino IDE
2. Open `arduino_sound_sensor.ino`
3. Select Board: Arduino Uno
4. Select Port: COM3 (or your port)
5. Click Upload (→)

---

## ⚡ Keyboard Shortcuts

- **Drag** = Rotate camera
- **Scroll** = Zoom in/out
- **Right-click + Drag** = Pan
- **Click neuron** = Inspect details
- **Ctrl+C** (in terminal) = Stop server

---

## ❓ Troubleshooting

**Problem:** npm install fails
**Solution:** Delete `node_modules` folder and try again

**Problem:** Port already in use
**Solution:** Close other terminals or use: `npm run dev -- --port 3000`

**Problem:** Arduino not connecting
**Solution:** 
1. Close Arduino Serial Monitor
2. Use Chrome or Edge browser
3. Check USB cable

**Problem:** No sound response
**Solution:**
1. Verify Arduino Mode is ON
2. Check green "CONNECTED" indicator
3. Make louder sounds

---

## 📊 System Requirements

- **Node.js** 16+ (check: `node --version`)
- **Browser:** Chrome or Edge (for Arduino mode)
- **Arduino:** Uno/Nano (optional)
- **RAM:** 4GB minimum
- **GPU:** Any modern GPU

---

## 🎯 Quick Test

1. ✅ Run `npm run dev`
2. ✅ Open http://localhost:5173
3. ✅ Move sliders → Neurons should change color
4. ✅ Click a neuron → Details should appear
5. ✅ Drag screen → Camera should rotate

**All working?** You're ready to go! 🎉

---

## 📁 Project Structure

```
neural-viz/
├── start.bat              ← Double-click this!
├── arduino_sound_sensor.ino  ← Upload to Arduino
├── EXECUTION_GUIDE.md     ← Detailed instructions
├── src/
│   ├── hooks/
│   │   └── useSerial.jsx  ← Arduino connection
│   ├── utils/
│   │   └── mm.jsx         ← Main visualization
│   └── App.jsx
└── package.json
```

---

## 🎓 What's Happening?

1. **Input Layer** receives data (sliders or Arduino)
2. **Hidden Layers** process the information
3. **Output Layer** produces final result
4. **Visualization** shows this process in real-time!

**With Arduino:**
- Sound → Sensor → Arduino → Serial → Browser → Neural Network → Visual Effects

---

## 🔗 Useful Links

- **Full Guide:** See `EXECUTION_GUIDE.md`
- **Arduino Code:** See `arduino_sound_sensor.ino`
- **Node.js Download:** https://nodejs.org
- **Arduino IDE:** https://www.arduino.cc/en/software

---

## 💡 Pro Tips

1. **Loud sounds** trigger more dramatic effects
2. **Click neurons** to see their math
3. **Change activation function** to see different behaviors
4. **Zoom in close** to see pulse trails
5. **Try music** for rhythmic patterns

---

**Ready?** Double-click `start.bat` and enjoy! 🚀

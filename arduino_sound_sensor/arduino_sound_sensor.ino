/*
  Sound Sensor Neural Network Interface
  
  Connects a KY-037 sound sensor to Arduino and sends readings via Serial
  for the Neural Network Visualizer
  
  Hardware:
  - Arduino Uno/Nano
  - KY-037 sound sensor module
  - LED on pin 13 for visual feedback
  
  Wiring:
  - Sound sensor VCC -> 5V
  - Sound sensor GND -> GND  
  - Sound sensor A0 -> Arduino A0 (analog)
  - Sound sensor D0 -> Arduino Pin 7 (digital)
  - LED (built-in) -> Pin 13
*/

int digitalPin = 7;   // KY-037 digital interface
int analogPin = A0;   // KY-037 analog interface
int ledPin = 13;      // Arduino LED pin
int digitalVal;       // digital readings
int analogVal;        // analog readings

void setup()
{
  pinMode(digitalPin, INPUT);
  pinMode(analogPin, INPUT);
  pinMode(ledPin, OUTPUT);      
  Serial.begin(9600);
}

void loop()
{
  // Read the digital interface
  digitalVal = digitalRead(digitalPin);
 
  if(digitalVal == HIGH)
  {
    digitalWrite(ledPin, HIGH); // Turn ON Arduino's LED
  }
  else
  {
    digitalWrite(ledPin, LOW);  // Turn OFF Arduino's LED
  }

  // Read analog interface
  analogVal = analogRead(analogPin);
  
  // Print analog value to serial (0-1023 range)
  Serial.println(analogVal);  
  
  // Delay to allow neural network propagation to complete
  // Total propagation time: 2.25s (input->hidden1->hidden2->output)
  // Adding 1s buffer for visual effect
  delay(3500);  // 3.5 seconds between readings
}

/*
  Expected Serial Output (every 3.5 seconds):
  125
  (wait 3.5s)
  130
  (wait 3.5s)
  145
  (wait 3.5s)
  ...
  
  The Neural Network Visualizer will:
  1. Read these values via Web Serial API
  2. Normalize them (0-1023 -> 0-1)
  3. Feed into neural network as input1
  4. Use previous value as input2
  5. Trigger neuron firing based on sound level
  
  Propagation Timeline:
  0.00s - Input layer activates
  0.75s - Hidden layer 1 activates
  1.50s - Hidden layer 2 activates
  2.25s - Output layer activates
  3.50s - Ready for next reading
*/

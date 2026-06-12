/*
  Dual Sound Sensor Neural Network Interface

  Hardware:
  - Arduino Uno/Nano
  - W104 sound sensor 1 -> A0
  - W104 sound sensor 2 -> A1
  - LED on pin 13 for visual feedback

  Serial Output format: "val1,val2\n"  (0-1023 each)
*/

int analogPin1 = A0;
int analogPin2 = A1;
int ledPin     = 13;

void setup() {
  pinMode(analogPin1, INPUT);
  pinMode(analogPin2, INPUT);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int val1 = analogRead(analogPin1);
  int val2 = analogRead(analogPin2);

  // Visual feedback — LED on if either sensor is loud
  digitalWrite(ledPin, (val1 > 512 || val2 > 512) ? HIGH : LOW);

  // Send both values as CSV
  Serial.print(val1);
  Serial.print(",");
  Serial.println(val2);

  delay(3500);
}

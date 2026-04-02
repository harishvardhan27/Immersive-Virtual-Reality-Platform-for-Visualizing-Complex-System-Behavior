import { useState, useEffect, useRef, useCallback } from 'react';

export default function useSerial() {
  const [isConnected, setIsConnected] = useState(false);
  const [value, setValue] = useState(0);
  const [previousValue, setPreviousValue] = useState(0);
  const [error, setError] = useState(null);
  const [port, setPort] = useState(null);
  const readerRef = useRef(null);
  const writerRef = useRef(null);

  // Check if Web Serial API is supported
  const isSupported = 'serial' in navigator;

  const connect = useCallback(async () => {
    if (!isSupported) {
      setError('Web Serial API not supported in this browser');
      return;
    }

    try {
      // Request a port and open a connection
      const selectedPort = await navigator.serial.requestPort();
      await selectedPort.open({ baudRate: 9600 });

      setPort(selectedPort);
      setIsConnected(true);
      setError(null);

      // Set up reader
      const reader = selectedPort.readable.getReader();
      readerRef.current = reader;

      // Read data continuously
      const readLoop = async () => {
        try {
          while (true) {
            const { value: chunk, done } = await reader.read();
            if (done) break;

            // Convert Uint8Array to string
            const text = new TextDecoder().decode(chunk);
            const lines = text.split('\n');

            lines.forEach(line => {
              const trimmed = line.trim();
              if (trimmed && !isNaN(trimmed)) {
                const newValue = parseFloat(trimmed);
                setPreviousValue(value); // Store current value as previous
                setValue(newValue);      // Update to new value
              }
            });
          }
        } catch (error) {
          console.error('Serial read error:', error);
          setError('Error reading from serial port');
        }
      };

      readLoop();

    } catch (error) {
      console.error('Serial connection error:', error);
      setError('Failed to connect to serial port');
    }
  }, [isSupported]);

  const disconnect = useCallback(async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }
      if (port) {
        await port.close();
        setPort(null);
      }
      setIsConnected(false);
      setValue(0);
      setPreviousValue(0);
    } catch (error) {
      console.error('Disconnect error:', error);
      setError('Error disconnecting from serial port');
    }
  }, [port]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [isConnected, disconnect]);

  // Normalize sensor value (0-1023 typical Arduino range to 0-1)
  const normalizedValue = Math.min(Math.max(value / 1023, 0), 1);
  const normalizedPrevious = Math.min(Math.max(previousValue / 1023, 0), 1);

  console.log('Arduino Raw Value:', value, 'Normalized:', normalizedValue.toFixed(3));

  return {
    isSupported,
    isConnected,
    value: normalizedValue,
    previousValue: normalizedPrevious,
    rawValue: value,
    rawPreviousValue: previousValue,
    error,
    connect,
    disconnect
  };
}
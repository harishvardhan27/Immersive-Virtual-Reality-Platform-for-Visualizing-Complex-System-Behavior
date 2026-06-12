import { useState, useEffect, useRef, useCallback } from 'react';

export default function useSerial() {
  const [isConnected, setIsConnected] = useState(false);
  const [value, setValue] = useState(0);         // sensor 1 (A0)
  const [previousValue, setPreviousValue] = useState(0); // sensor 2 (A1)
  const [error, setError] = useState(null);
  const [port, setPort] = useState(null);
  const readerRef = useRef(null);
  const bufferRef = useRef('');

  const isSupported = 'serial' in navigator;

  const connect = useCallback(async () => {
    if (!isSupported) { setError('Web Serial API not supported'); return; }
    try {
      const selectedPort = await navigator.serial.requestPort();
      await selectedPort.open({ baudRate: 9600 });
      setPort(selectedPort);
      setIsConnected(true);
      setError(null);

      const reader = selectedPort.readable.getReader();
      readerRef.current = reader;

      const readLoop = async () => {
        try {
          while (true) {
            const { value: chunk, done } = await reader.read();
            if (done) break;
            bufferRef.current += new TextDecoder().decode(chunk);
            const lines = bufferRef.current.split('\n');
            bufferRef.current = lines.pop(); // keep incomplete line in buffer
            lines.forEach(line => {
              const trimmed = line.trim();
              if (!trimmed) return;
              const parts = trimmed.split(',');
              if (parts.length === 2) {
                const v1 = parseFloat(parts[0]);
                const v2 = parseFloat(parts[1]);
                if (!isNaN(v1) && !isNaN(v2)) {
                  setValue(v1);
                  setPreviousValue(v2);
                }
              }
            });
          }
        } catch (err) {
          setError('Error reading from serial port');
        }
      };
      readLoop();
    } catch (err) {
      setError('Failed to connect to serial port');
    }
  }, [isSupported]);

  const disconnect = useCallback(async () => {
    try {
      if (readerRef.current) { await readerRef.current.cancel(); readerRef.current = null; }
      if (port) { await port.close(); setPort(null); }
      setIsConnected(false);
      setValue(0);
      setPreviousValue(0);
      bufferRef.current = '';
    } catch (err) {
      setError('Error disconnecting');
    }
  }, [port]);

  useEffect(() => {
    return () => { if (isConnected) disconnect(); };
  }, [isConnected, disconnect]);

  const normalizedValue    = Math.min(Math.max(value / 1023, 0), 1);
  const normalizedPrevious = Math.min(Math.max(previousValue / 1023, 0), 1);

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

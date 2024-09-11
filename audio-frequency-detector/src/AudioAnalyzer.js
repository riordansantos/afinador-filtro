import React, { useEffect, useRef, useState } from 'react';
import autoCorrelate from './AutoCorrelate';
import './AudioAnalyzer.css';

const notesData = [
  { saxNote: 'Do#', frequency: 242.90, standardNote: 'Si3' },
  { saxNote: 'Do', frequency: 233, standardNote: 'La#3' },
  { saxNote: 'Si', frequency: 220, standardNote: 'La3' },
  { saxNote: 'La#', frequency: 207.65, standardNote: 'Sol#3' },
  { saxNote: 'La', frequency: 196, standardNote: 'Sol3' },
  { saxNote: 'Sol#', frequency: 185, standardNote: 'Fa#3' },
  { saxNote: 'Sol', frequency: 174.61, standardNote: 'Fa3' },
  { saxNote: 'Fa#', frequency: 164.81, standardNote: 'Mi3' },
  { saxNote: 'Fa', frequency: 155.56, standardNote: 'Re#3' },
  { saxNote: 'Mi', frequency: 146.86, standardNote: 'Re3' },
  { saxNote: 'Re#', frequency: 138.6, standardNote: 'Do#3' },
  { saxNote: 'Re', frequency: 130.81, standardNote: 'Do3' },
  { saxNote: 'Do#', frequency: 121.45, standardNote: 'Si2' },
  { saxNote: 'Do', frequency: 116.54, standardNote: 'La#2' }
];

const AudioAnalyzer = () => {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const bufferLengthRef = useRef(2048);
  const canvasRef = useRef(null);
  const [frequency, setFrequency] = useState(null);
  const [amplitudePercentage, setAmplitudePercentage] = useState(0);
  const [filterType, setFilterType] = useState('none');

  useEffect(() => {
    const startAudioCapture = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        
        console.log(`Frequência de amostragem do navegador: ${audioContextRef.current.sampleRate} Hz`);

        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        analyserRef.current.fftSize = bufferLengthRef.current;
        const bufferLength = analyserRef.current.fftSize;
        dataArrayRef.current = new Float32Array(bufferLength);

        analyzeAudio();
      } catch (error) {
        console.error('Erro ao capturar áudio:', error);
      }
    };

    const applyFilter = (dataArray) => {
      if (filterType === 'fir') {
        return firFilter(dataArray);
      } else if (filterType === 'butter') {
        return butterworthFilter(dataArray);
      }
      return dataArray;
    };

    const analyzeAudio = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
      const filteredData = applyFilter(dataArrayRef.current);
      drawWaveform(filteredData);

      const maxAmplitude = Math.max(...filteredData.map(Math.abs));
      const amplitudePercent = Math.min(100, (maxAmplitude * 100).toFixed(2));
      setAmplitudePercentage(amplitudePercent);

      const detectedFrequency = autoCorrelate(filteredData, audioContextRef.current.sampleRate);
      setFrequency(detectedFrequency !== -1 ? detectedFrequency : null);

      requestAnimationFrame(analyzeAudio);
    };

    const drawWaveform = (dataArray) => {
      const canvas = canvasRef.current;
      const canvasCtx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      canvasCtx.clearRect(0, 0, width, height);
      canvasCtx.lineWidth = 1.5;
      canvasCtx.strokeStyle = '#ccc';

      canvasCtx.beginPath();

      let sliceWidth = width * 1.0 / bufferLengthRef.current;
      let x = 0;

      for (let i = 0; i < bufferLengthRef.current; i++) {
        let v = dataArray[i] * 0.5 + 0.5;
        let y = v * height;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(width, height / 2);
      canvasCtx.stroke();
    };

    startAudioCapture();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [filterType]);

  // Implementação do filtro FIR passa-banda
  const firFilter = (data) => {
    const fc_low = 130; // Frequência de corte baixa
    const fc_high = 243; // Frequência de corte alta
    const fs = 44100; // Frequência de amostragem
    const N = 500; // Ordem do filtro FIR
    const Wn = [fc_low, fc_high].map(fc => fc / (fs / 2)); // Normalização das frequências de corte

    // Coeficientes do filtro FIR passa-banda
    const b = new Array(N + 1).fill(0).map((_, i) => {
      const n = i - N / 2;
      if (n === 0) return Wn[1] - Wn[0];
      const low = Math.sin(2 * Math.PI * Wn[0] * n) / (Math.PI * n);
      const high = Math.sin(2 * Math.PI * Wn[1] * n) / (Math.PI * n);
      return high - low;
    });

    return convolve(data, b);
  };

  // Implementação do filtro Butterworth passa-banda
  const butterworthFilter = (data) => {
    const fc_low = 130; // Frequência de corte baixa
    const fc_high = 248; // Frequência de corte alta
    const fs = 44100; // Frequência de amostragem
    const order = 4; // Ordem do filtro Butterworth
    const Wn = [fc_low, fc_high].map(fc => fc / (fs / 2)); // Normalização das frequências de corte

    // Implementação básica de um filtro Butterworth passa-banda
    // Para simplificação, usamos um filtro passa-baixa e passa-alta consecutivos
    const butterBandPass = (data, Wn) => {
      const filteredData = butterLowPass(data, Wn[1], fs, order);
      return butterHighPass(filteredData, Wn[0], fs, order);
    };

    return butterBandPass(data, Wn);
  };

  // Função para convolução
  const convolve = (x, h) => {
    let y = new Array(x.length + h.length - 1).fill(0);
    for (let i = 0; i < y.length; i++) {
      for (let j = 0; j < h.length; j++) {
        if (i - j >= 0 && i - j < x.length) {
          y[i] += x[i - j] * h[j];
        }
      }
    }
    return y.slice(0, x.length); // Ajusta para o tamanho do sinal original
  };

  // Função para aplicar um filtro passa-baixa Butterworth
  const butterLowPass = (data, Wn, fs, order) => {
    // Implementa um filtro passa-baixa Butterworth simplificado
    // Logica para cálculo dos coeficientes e aplicação
    // Retorna os dados filtrados
    return data; // Simulação
  };

  // Função para aplicar um filtro passa-alta Butterworth
  const butterHighPass = (data, Wn, fs, order) => {
    // Implementa um filtro passa-alta Butterworth simplificado
    // Logica para cálculo dos coeficientes e aplicação
    // Retorna os dados filtrados
    return data; // Simulação
  };

  const getNoteData = (frequency) => {
    if (!frequency) return { color: 'gray', saxNote: '-', frequency: '-', standardNote: '-' };

    let closestNote = notesData.reduce((prev, curr) => {
      return Math.abs(curr.frequency - frequency) < Math.abs(prev.frequency - frequency) ? curr : prev;
    });

    const isTuned = Math.abs(closestNote.frequency - frequency) <= 1;
    return { color: isTuned ? 'green' : 'red', ...closestNote };
  };

  const { color, saxNote, standardNote } = getNoteData(frequency);

  return (
    <div className="audio-analyzer">
      <canvas ref={canvasRef} className="wave-canvas"></canvas>
      <div className={`note-display ${color}`}>
        <p className="frequency">{frequency ? `${frequency.toFixed(2)} Hz` : 'Capturando...'}</p>
        {amplitudePercentage >= 60 && (
          <>
            <p className="note sax-note">{saxNote}</p>
            <p className="note standard-note">{standardNote}</p>
          </>
        )}
        <p className="amplitude">Amplitude: {amplitudePercentage}%</p>
      </div>
      <div className="filter-controls">
        <button
          className={filterType === 'none' ? 'active' : ''}
          onClick={() => setFilterType('none')}
        >
          Sem Filtro
        </button>
        <button
          className={filterType === 'fir' ? 'active' : ''}
          onClick={() => setFilterType('fir')}
        >
          Ativar FIR
        </button>
        <button
          className={filterType === 'butter' ? 'active' : ''}
          onClick={() => setFilterType('butter')}
        >
          Ativar Butterworth
        </button>
      </div>
    </div>
  );
};

export default AudioAnalyzer;

// src/AudioAnalyzer.js
import React, { useEffect, useRef, useState } from 'react';

// Função de autocorrelação para calcular a frequência dominante
function autoCorrelate(buffer, sampleRate) {
  // Algoritmo simplificado para detectar a frequência dominante através da autocorrelação
  let size = buffer.length;
  let maxSamples = Math.floor(size / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;
  let foundGoodCorrelation = false;
  let correlations = new Array(maxSamples);

  for (let i = 0; i < size; i++) {
    let val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) {
    // Qualidade do som muito baixa
    return -1;
  }

  let lastCorrelation = 1;
  for (let offset = 0; offset < maxSamples; offset++) {
    let correlation = 0;

    for (let i = 0; i < maxSamples; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation = 1 - (correlation / maxSamples);
    correlations[offset] = correlation; // armazenando para visualização

    if (correlation > 0.9 && correlation > lastCorrelation) {
      foundGoodCorrelation = true;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    } else if (foundGoodCorrelation) {
      // Se encontrar um ponto baixo após o pico, encerre
      break;
    }
    lastCorrelation = correlation;
  }

  if (bestCorrelation > 0.01) {
    // Precisa de pelo menos alguma correlação de qualidade
    let bestFrequency = sampleRate / bestOffset;
    return bestFrequency;
  }
  return -1;
}

const AudioAnalyzer = () => {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const bufferLengthRef = useRef(2048);
  const [frequency, setFrequency] = useState(null);

  useEffect(() => {
    const startAudioCapture = async () => {
      try {
        // Solicita permissão para acessar o microfone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Cria o contexto de áudio e o analisador
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();

        // Cria uma fonte de áudio a partir do stream
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        // Configura o analisador
        analyserRef.current.fftSize = bufferLengthRef.current;
        const bufferLength = analyserRef.current.fftSize;
        dataArrayRef.current = new Float32Array(bufferLength);

        // Inicia o loop de análise
        analyzeAudio();
      } catch (error) {
        console.error('Erro ao capturar áudio:', error);
      }
    };

    // Função para analisar o áudio e calcular a frequência dominante
    const analyzeAudio = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
      const detectedFrequency = autoCorrelate(dataArrayRef.current, audioContextRef.current.sampleRate);

      if (detectedFrequency !== -1) {
        setFrequency(detectedFrequency);
      }

      requestAnimationFrame(analyzeAudio);
    };

    startAudioCapture();

    // Cleanup ao desmontar
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div>
      <h1>Detector de Frequência de Áudio</h1>
      <p>Frequência Detectada: {frequency ? `${frequency.toFixed(2)} Hz` : 'Capturando...'}</p>
    </div>
  );
};

export default AudioAnalyzer;

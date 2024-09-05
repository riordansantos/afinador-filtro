// src/hooks/useAudio.js
import { useCallback, useEffect, useState } from 'react';
import getDevices from './getDevices';
import getStream from './getStream';

function useAudio(contextOptions) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const [audioContext] = useState(new AudioContext(contextOptions));
  const [analyzerNode] = useState(audioContext.createAnalyser());
  const [streamAudioSource, setStreamAudioSource] = useState(null);
  const [frequency, setFrequency] = useState(null);
  const [devices, setDevices] = useState([]);

  const startAudioContext = useCallback(() => {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }, [audioContext]);

  // Função para calcular a frequência dominante
  const getDominantFrequency = useCallback(() => {
    const bufferLength = analyzerNode.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyzerNode.getFloatFrequencyData(dataArray);

    let maxIndex = 0;
    let maxValue = -Infinity;

    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }

    const nyquist = audioContext.sampleRate / 2;
    const dominantFrequency = (maxIndex * nyquist) / bufferLength;

    return dominantFrequency;
  }, [analyzerNode, audioContext]);

  const createStream = useCallback(async (constraints) => {
    try {
      const stream = await getStream(constraints);
      const streamSource = audioContext.createMediaStreamSource(stream);
      setStreamAudioSource(streamSource);
      streamSource.connect(analyzerNode);

      const analyze = () => {
        const frequencyValue = getDominantFrequency();
        setFrequency(frequencyValue);
        requestAnimationFrame(analyze);
      };
      analyze();
    } catch (error) {
      console.error('Erro ao iniciar a captura de áudio:', error);
    }
  }, [analyzerNode, audioContext, getDominantFrequency]);

  const destroyStream = useCallback(() => {
    if (streamAudioSource) {
      streamAudioSource.disconnect();
      streamAudioSource.mediaStream.getAudioTracks().forEach(track => track.stop());
      setStreamAudioSource(null);
    }
  }, [streamAudioSource]);

  const fetchDevices = useCallback(async () => {
    const devicesList = await getDevices();
    setDevices(devicesList);
  }, []);

  useEffect(() => {
    fetchDevices();
    analyzerNode.fftSize = 2048;
  }, [analyzerNode, fetchDevices]);

  return {
    createStream,
    destroyStream,
    frequency,
    status: audioContext.state,
    devices,
    startAudioContext, // Função para iniciar o contexto de áudio
  };
}

export default useAudio;

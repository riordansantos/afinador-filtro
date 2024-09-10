export default function autoCorrelate(buffer, sampleRate) {
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
  
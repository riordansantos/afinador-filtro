// src/hooks/getStream.js
const getStream = async (constraints) => {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints || { audio: true });
    } catch (error) {
      console.error('Erro ao capturar o stream de áudio:', error);
      throw error;
    }
  };
  
  export default getStream;
  
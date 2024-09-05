// src/hooks/getDevices.js
const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Erro ao listar dispositivos de áudio:', error);
      return [];
    }
  };
  
  export default getDevices;
  
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'youtube-consultant-secret-key'; // In a real app, this would be more secure

export const cryptoService = {
  encrypt: (text: string) => {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  },
  decrypt: (ciphertext: string) => {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      return '';
    }
  },
  saveApiKey: (key: string) => {
    const encrypted = CryptoJS.AES.encrypt(key, SECRET_KEY).toString();
    localStorage.setItem('yt_api_key', encrypted);
  },
  getApiKey: () => {
    const encrypted = localStorage.getItem('yt_api_key');
    if (!encrypted) return '';
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      return '';
    }
  },
  removeApiKey: () => {
    localStorage.removeItem('yt_api_key');
  }
};

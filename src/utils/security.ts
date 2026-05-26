import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || 'default-fallback-key-change-this';

export const SecurityUtils = {
  encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  },

  decrypt(ciphertext: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      if (!originalText) throw new Error('Decryption failed: Empty result');
      return originalText;
    } catch (error) {
      console.error('Decryption Error:', error);
      return ciphertext; // Fallback to raw if decryption fails (for migration period)
    }
  }
};

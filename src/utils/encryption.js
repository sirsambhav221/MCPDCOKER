const CryptoJS = require('crypto-js');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'abcdefghijklmnopqrstuvwxyz123456';

const encrypt = (text) => {
    try {
        const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error.message);
        throw new Error('Failed to encrypt data');
    }
};

const decrypt = (encryptedText) => {
    try {
        const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('Decryption error:', error.message);
        throw new Error('Failed to decrypt data');
    }
};

const generateEncryptionKey = () => {
    return CryptoJS.lib.WordArray.random(32).toString();
};

module.exports = {
    encrypt,
    decrypt,
    generateEncryptionKey
};

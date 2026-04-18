/**
 * Utility for encrypting/decrypting data in localStorage
 * Uses simple XOR cipher with a static key for basic obfuscation
 * Note: This is NOT cryptographically secure - for production use proper encryption libraries
 */

const STORAGE_KEY_PREFIX = 'app:';
const ENCRYPTION_KEY = 'computer-networking-2-secret-key'; // In production, this should be more secure

/**
 * Simple XOR cipher for basic obfuscation
 */
function xorCipher(text, key) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

/**
 * Convert string to hex for safe storage
 */
function toHex(str) {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += ('0' + str.charCodeAt(i).toString(16)).slice(-2);
  }
  return hex;
}

/**
 * Convert hex string back to regular string
 */
function fromHex(hex) {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

/**
 * Encrypt data and store in localStorage
 */
export function setSecureData(key, data) {
  try {
    const jsonStr = JSON.stringify(data);
    const encrypted = xorCipher(jsonStr, ENCRYPTION_KEY);
    const hex = toHex(encrypted);
    localStorage.setItem(STORAGE_KEY_PREFIX + key, hex);
    return true;
  } catch (error) {
    console.error('Error storing secure data:', error);
    return false;
  }
}

/**
 * Retrieve and decrypt data from localStorage
 */
export function getSecureData(key) {
  try {
    const hex = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!hex) return null;

    const encrypted = fromHex(hex);
    const jsonStr = xorCipher(encrypted, ENCRYPTION_KEY);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error retrieving secure data:', error);
    return null;
  }
}

/**
 * Remove data from localStorage
 */
export function removeSecureData(key) {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + key);
    return true;
  } catch (error) {
    console.error('Error removing secure data:', error);
    return false;
  }
}

/**
 * Clear all app data from localStorage
 */
export function clearAllSecureData() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.error('Error clearing secure data:', error);
    return false;
  }
}

/**
 * Store user profile data
 */
export function setUserProfile(userId, userData) {
  return setSecureData(`user:${userId}`, {
    userId: userData.userId,
    username: userData.username,
    email: userData.email,
    imageUrl: userData.imageUrl,
    storedAt: new Date().toISOString(),
  });
}

/**
 * Get user profile data
 */
export function getUserProfile(userId) {
  return getSecureData(`user:${userId}`);
}

/**
 * Store authentication session
 */
export function setAuthSession(userId, tokens) {
  return setSecureData('auth:session', {
    userId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    storedAt: new Date().toISOString(),
  });
}

/**
 * Get authentication session
 */
export function getAuthSession() {
  return getSecureData('auth:session');
}

/**
 * Remove authentication session
 */
export function clearAuthSession() {
  return removeSecureData('auth:session');
}


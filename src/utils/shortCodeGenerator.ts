import crypto from 'crypto';

const ALPHANUMERIC_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const RESERVED_WORDS = new Set([
  'api',
  's',
  'r',
  'admin',
  'dashboard',
  'users',
  'login',
  'signup',
  'signin',
  'project',
  'file',
  'reviews',
  'ping',
  'auth',
  'static',
  'assets',
  'favicon.ico',
  'robots.txt',
]);

/**
 * Generate a random alphanumeric short code of specified length (default: 6)
 */
export const generateRandomCode = (length: number = 6): string => {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC_CHARS[bytes[i] % ALPHANUMERIC_CHARS.length];
  }
  return result;
};

/**
 * Validate URL format (must start with http:// or https://)
 */
export const isValidUrl = (urlStr: string): boolean => {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

/**
 * Check if short code is reserved
 */
export const isReservedWord = (code: string): boolean => {
  return RESERVED_WORDS.has(code.toLowerCase().trim());
};

/**
 * Check if custom short code satisfies length and character requirements
 */
export const isValidCustomCode = (code: string): boolean => {
  const pattern = /^[a-zA-Z0-9_-]{3,30}$/;
  return pattern.test(code);
};

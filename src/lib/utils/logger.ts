// Simple environment-aware logger
const isDev = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

// Core areas of your app that need logging
export const AREAS = {
  AUTH: 'auth',
  PRESENCE: 'presence',
  SOCKET: 'socket',
  CHAT: 'chat',
  STORE: 'store',
  GENERAL: 'app',
};

// Configure which areas to log
const enabledAreas: Record<string, boolean> = {
  [AREAS.AUTH]: isDev,
  [AREAS.PRESENCE]: false, // Too noisy, disable by default
  [AREAS.SOCKET]: true,
  [AREAS.CHAT]: isDev,
  [AREAS.STORE]: false, // Too noisy
  [AREAS.GENERAL]: true,
};

export const log = {
  debug: <T extends unknown[]>(area: string, message: string, ...data: T) => {
    if (isDev && enabledAreas[area] !== false && !isTest) {
      console.log(`[${area}] ${message}`, ...data);
    }
    return data; // Return the data for potential chaining
  },

  info: <T extends unknown[]>(area: string, message: string, ...data: T) => {
    if (enabledAreas[area] !== false && !isTest) {
      console.info(`[${area}] ${message}`, ...data);
    }
    return data;
  },

  warn: <T extends unknown[]>(area: string, message: string, ...data: T) => {
    if (!isTest) {
      console.warn(`[${area}] ${message}`, ...data);
    }
    return data;
  },

  error: <T extends unknown[]>(area: string, message: string, ...data: T) => {
    console.error(`[${area}] ${message}`, ...data);
    return data;
  },
};

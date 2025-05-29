const recentCalls: { [key: string]: number } = {};
const FETCH_COOLDOWN = 3000;

/**
 * Throttle function to prevent frequent API calls
 * Returns true if the operation should proceed, false if it should be throttled
 */
export const shouldProceed = (key: string): boolean => {
  const now = Date.now();
  const lastCall = recentCalls[key] || 0;

  if (now - lastCall < FETCH_COOLDOWN) {
    console.log(`Throttling ${key} - called too frequently`);
    return false;
  }

  recentCalls[key] = now;
  return true;
};

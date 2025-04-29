// Utility to measure performance of functions

// Map to store start times
const timers = new Map<string, number>();

/**
 * Start timing a specific operation
 * @param label Unique identifier for the timer
 */
export function startTimer(label: string): void {
  timers.set(label, performance.now());
}

/**
 * End timing an operation and log the result
 * @param label The label used when starting the timer
 * @param logToConsole Whether to log to console (default: true)
 * @returns The elapsed time in milliseconds
 */
export function endTimer(label: string, logToConsole = true): number {
  const startTime = timers.get(label);
  if (startTime === undefined) {
    console.warn(`Timer "${label}" was never started`);
    return 0;
  }

  const endTime = performance.now();
  const elapsed = endTime - startTime;

  // Remove the timer
  timers.delete(label);

  if (logToConsole) {
    console.log(`⏱️ ${label}: ${elapsed.toFixed(2)}ms`);
  }

  return elapsed;
}

/**
 * Wrapped function that measures execution time
 * @param fn Function to measure
 * @param label Optional custom label (defaults to function name)
 * @returns A wrapped function that logs performance
 */
export function measured<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
  label?: string
): (...args: Args) => Return {
  return (...args: Args) => {
    const fnName = label || fn.name || 'anonymous function';
    startTimer(fnName);
    try {
      const result = fn(...args);

      // Handle promises
      if (result instanceof Promise) {
        return result
          .then((value) => {
            endTimer(fnName);
            return value;
          })
          .catch((error) => {
            endTimer(fnName);
            throw error;
          }) as unknown as Return;
      }

      endTimer(fnName);
      return result;
    } catch (error) {
      endTimer(fnName);
      throw error;
    }
  };
}

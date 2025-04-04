'use client';

import { useEffect, useRef } from 'react';

// Simple flag to prevent nested console error handling
let isHandlingError = false;

export function ErrorLogger() {
  // Track if we've already set up error logging
  const isInitialized = useRef(false);

  // Store original methods outside of component to avoid recreation
  const originalConsoleError = useRef(console.error);
  const originalConsoleWarn = useRef(console.warn);

  useEffect(() => {
    // Only set up once
    if (isInitialized.current) return;

    // Mark as initialized
    isInitialized.current = true;

    // Very simple override that just passes through to original methods
    console.error = function errorOverride(...args) {
      // Prevent recursive calls
      if (isHandlingError) return;

      try {
        isHandlingError = true;
        originalConsoleError.current.apply(console, args);
      } finally {
        isHandlingError = false;
      }
    };

    console.warn = function warnOverride(...args) {
      originalConsoleWarn.current.apply(console, args);
    };

    // Clean up on unmount
    return () => {
      console.error = originalConsoleError.current;
      console.warn = originalConsoleWarn.current;
      isInitialized.current = false;
    };
  }, []);

  return null;
}

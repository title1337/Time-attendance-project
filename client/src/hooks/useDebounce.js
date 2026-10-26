import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing a value (Best Practice ES6 Hook)
 * @template T
 * @param {T} value Value to debounce
 * @param {number} delay Delay in milliseconds (default: 400ms)
 * @returns {T} Debounced value
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

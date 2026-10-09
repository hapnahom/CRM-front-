import { useState, useEffect } from 'react';

function useDebounce(value: any, delay: number): boolean {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isDebounced, setIsDebounced] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebounced(true);
    }, delay);

    return () => {
      clearTimeout(handler);
      setIsDebounced(false);
    };
  }, [value, delay]);

  return isDebounced && debouncedValue === value;
}

export default useDebounce;

import { useRef, useEffect, useState, RefObject } from 'react';

/**
 * useTextFitFontSize
 * @param text - The text to check for overflow
 * @param defaultClass - The default font size class (e.g., 'text-3xl')
 * @param shrinkClass - The font size class to use if the text overflows (e.g., 'text-2xl')
 * @returns { ref, fontSizeClass }
 */
export function useTextFitFontSize<T extends HTMLElement = HTMLElement>(
  text: string,
  defaultClass: string = 'text-3xl',
  shrinkClass: string = 'text-2xl',
): { ref: RefObject<T>; fontSizeClass: string } {
  const ref = useRef<T>(null);
  const [fontSizeClass, setFontSizeClass] = useState(defaultClass);

  useEffect(() => {
    const checkOverflow = () => {
      if (ref.current) {
        if (ref.current.scrollWidth > ref.current.clientWidth) {
          setFontSizeClass(shrinkClass);
        } else {
          setFontSizeClass(defaultClass);
        }
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text, defaultClass, shrinkClass]);

  return { ref, fontSizeClass };
}

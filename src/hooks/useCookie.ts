import { useCallback, useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';

/**
 * Maintains the current parsed value of a local string cookie.
 * Essentially acts as a durable useState
 * that can only handle strings.
 * If the cookie is initially unset,
 * then it falls back to the default value.
 *
 * @param key The key of the cookie
 * @param defaultValue The default value for the cookie
 * @returns The current value of the cookie
 */
export default function useCookie(
  key: string,
  defaultValue: string | (() => string)
): [string, (next: string) => void] {
  const toLoadRef = useRef<string | null>(null);
  const [value, setValue] = useState(() => {
    // Initialize the state
    const initialValue = Cookies.get(key);
    if (initialValue === undefined) {
      // If the cookie is set,
      // flag the useEffect to load once it runs

      // Support lazy default values
      let actualDefaultValue;
      if (typeof defaultValue === 'function') {
        actualDefaultValue = defaultValue();
      } else {
        actualDefaultValue = defaultValue;
      }

      toLoadRef.current = actualDefaultValue;
      return actualDefaultValue;
    }

    return initialValue;
  });

  // Load the initial default value if the cookie was initially unset.
  // This only runs once, and exists in order
  // to avoid side effects in the state initializer.
  useEffect(() => {
    if (toLoadRef.current !== null) {
      Cookies.set(key, value);
      toLoadRef.current = null;
    }
  }, []);

  // Memoize a setter that also persists the change to the cookie
  const setCookieValue = useCallback(
    (next: string) => {
      setValue(next);
      Cookies.set(key, next);
      if (toLoadRef.current !== null) {
        // Don't overwrite this set later
        toLoadRef.current = null;
      }
    },
    [key, setValue]
  );

  return [value, setCookieValue];
}

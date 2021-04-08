import { useCallback, useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';

/**
 * Simple utility hook that allows a consumer to manually force a re-render
 */
function useForceRender(): () => void {
  const [, setForceRenderState] = useState(0);
  const forceRenderNext = useRef(1);
  const forceRender = useCallback(() => {
    const next = forceRenderNext.current;
    setForceRenderState(next);
    forceRenderNext.current += 1;
  }, [setForceRenderState, forceRenderNext]);

  return forceRender;
}

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
  // Load the latest value from the cookies every time.
  // Then, in the setter, we force updates manually
  let value = Cookies.get(key);

  // If the value is uninitialized,
  // then fall back to the default value,
  // and flag the cookie for a later persistent update inside useEffect
  const persistentUpdates = useRef<Record<string, string>>({});
  if (value === undefined) {
    // Support lazy default values
    if (typeof defaultValue === 'function') {
      value = defaultValue();
    } else {
      value = defaultValue;
    }
    persistentUpdates.current[key] = value;
  }

  // Consume any later persistent updates.
  // This is useful to avoid side effects inside of the main hook body.
  // This is run after every render.
  useEffect(() => {
    const entries = Object.entries(persistentUpdates.current);
    if (entries.length > 0) {
      entries.forEach(([cookieKey, cookieValue]) => {
        Cookies.set(cookieKey, cookieValue);
      });
      persistentUpdates.current = {};
    }
  }, []);

  // Memoize a setter that persists the change to the cookie
  // and forces a re-render manually if the value changed.
  const forceRender = useForceRender();
  const lastValue = useRef(value);
  lastValue.current = value;
  const setCookieValue = useCallback(
    (next: string) => {
      if (lastValue.current !== next) {
        Cookies.set(key, next);
        if (
          Object.prototype.hasOwnProperty.call(persistentUpdates.current, key)
        ) {
          // Don't overwrite this set later
          delete persistentUpdates.current[key];
        }
        forceRender();
      }
    },
    [key]
  );

  return [value, setCookieValue];
}

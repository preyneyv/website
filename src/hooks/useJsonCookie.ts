import { useCallback, useMemo } from 'react';
import useCookie from './useCookie';

/**
 * Maintains the current parsed value of a JSON-encoded local cookie.
 * Essentially acts as a durable useState
 * that can handle objects.
 * Merges the stored representation with the default value.
 *
 * @param key The key of the cookie
 * @param defaultValue The default value for the cookie
 * @returns The current value of the cookie, parsed from JSON
 */
export default function useJsonCookie<T extends object>(
  key: string,
  defaultValue: T
): [T, (patch: Partial<T>) => void] {
  // Get the current value of the stringified cookie,
  // falling back to the (lazily) stringified default value if unset.
  const [rawValue, setRawValue] = useCookie(key, () =>
    JSON.stringify(defaultValue)
  );

  // Memoize the parsing and merging
  const value = useMemo(() => {
    const parsedValue = JSON.parse(rawValue) as Partial<T>;
    return {
      ...defaultValue,
      ...parsedValue
    };
  }, [rawValue, defaultValue]);

  // Return a callback that merges and sets the stringified value
  const patchValue = useCallback(
    (patch: Partial<T>) => {
      const rawVal = JSON.stringify({
        ...value,
        ...patch
      });
      setRawValue(rawVal);
    },
    [value, setRawValue]
  );

  return [value, patchValue];
}

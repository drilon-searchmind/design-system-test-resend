"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

const listeners = new Set();

function subscribe(cb) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function emit() {
  for (const l of listeners) l();
}

function readRaw(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * localStorage-backed state that is hydration-safe: the server (and first hydration
 * render) uses `defaultValue`, then switches to the stored value without a mismatch.
 * Pass a `key` with a version suffix (e.g. "crm:tasks:view:v1"). A null key = plain state.
 *
 * @template T
 * @param {string | null} key
 * @param {T | (() => T)} defaultValue
 * @param {{ validate?: (value: unknown) => T | null }} [options] return null to reject a stored value
 * @returns {[T, (next: T) => void]}
 */
export function usePersistedState(key, defaultValue, options = {}) {
  const { validate } = options;
  const [memory, setMemory] = useState(defaultValue);

  const raw = useSyncExternalStore(
    subscribe,
    () => (key ? readRaw(key) : null),
    () => null,
  );

  const stored = useMemo(() => {
    if (raw == null) return undefined;
    try {
      const parsed = JSON.parse(raw);
      const ok = validate ? validate(parsed) : /** @type {T} */ (parsed);
      return ok == null ? undefined : ok;
    } catch {
      return undefined;
    }
  }, [raw, validate]);

  const value = key && stored !== undefined ? stored : memory;

  const set = useCallback(
    (next) => {
      setMemory(next);
      if (!key) return;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* private mode / quota: keep in-memory value */
      }
      emit();
    },
    [key],
  );

  return [value, set];
}

/**
 * Storage that cannot throw.
 *
 * `localStorage` is unavailable or hostile in more situations than people
 * expect: Safari private browsing used to throw on write, some enterprise
 * policies block it, storage quotas fill up, and an iframe with restrictive
 * sandboxing has no origin to store against. Every one of those must leave the
 * product usable — a learner in private browsing should still be able to take
 * the course, just without their progress surviving a tab close.
 *
 * So nothing here throws, and every read is validated rather than trusted. A
 * key that holds something other than what we wrote (older schema, another
 * app on the same origin, a user poking at devtools) is treated as absent.
 */

const PREFIX = "stockschool:";

export type StorageKind = "local" | "session";

function storageFor(kind: StorageKind): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const store = kind === "local" ? window.localStorage : window.sessionStorage;
    // Touch it: in some browsers merely accessing the property is fine while
    // any operation throws.
    const probe = `${PREFIX}__probe__`;
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

/** True when persistent storage is actually usable in this browser. */
export function isStorageAvailable(kind: StorageKind = "local"): boolean {
  return storageFor(kind) !== null;
}

/**
 * Read and validate a stored value.
 *
 * `validate` is required rather than optional on purpose: blind-casting parsed
 * JSON is how a stale schema turns into a runtime crash three components deep.
 * If validation fails we return the fallback *and* clear the bad key, so the
 * next read is clean.
 */
export function readStored<T>(
  key: string,
  validate: (value: unknown) => T | null,
  fallback: T,
  kind: StorageKind = "local",
): T {
  const store = storageFor(kind);
  if (!store) return fallback;

  try {
    const raw = store.getItem(PREFIX + key);
    if (raw === null) return fallback;

    const parsed: unknown = JSON.parse(raw);
    const validated = validate(parsed);
    if (validated === null) {
      store.removeItem(PREFIX + key);
      return fallback;
    }
    return validated;
  } catch {
    // Unparseable JSON. Remove it so we stop paying the cost of failing.
    try {
      store.removeItem(PREFIX + key);
    } catch {
      /* nothing further we can do */
    }
    return fallback;
  }
}

/** Write a value. Returns false when storage refused it. */
export function writeStored(
  key: string,
  value: unknown,
  kind: StorageKind = "local",
): boolean {
  const store = storageFor(kind);
  if (!store) return false;

  try {
    store.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    // Almost always QuotaExceededError. Progress payloads are small, so this
    // is unlikely — but if it happens the app must carry on in memory.
    return false;
  }
}

export function removeStored(key: string, kind: StorageKind = "local"): void {
  const store = storageFor(kind);
  if (!store) return;
  try {
    store.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Storage keys, in one place so nothing collides or drifts. */
export const STORAGE_KEYS = {
  progress: "progress:v1",
  simulation: "simulation:v1",
  reflections: "reflections:v1",
} as const;

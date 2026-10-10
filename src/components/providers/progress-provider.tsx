"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  beginLesson as beginLessonPure,
  completeLesson as completeLessonPure,
  emptyProgress,
  parseProgressStore,
  recordMission as recordMissionPure,
  recordQuizScore as recordQuizScorePure,
  type ProgressStore,
} from "@/lib/learning/progress";
import { STORAGE_KEYS, readStored, removeStored, writeStored } from "@/lib/storage/local";

/**
 * Learner progress, shared across the app.
 *
 * Design notes, because the choices here are load-bearing:
 *
 * 1. **It starts empty and hydrates after mount.** Reading localStorage during
 *    the first render would produce different markup on the server and the
 *    client, which React punishes with a hydration error. So the first paint
 *    is always "empty progress", and `hydrated` tells consumers to hold off on
 *    rendering anything that would look wrong for one frame.
 *
 * 2. **localStorage is the source of truth; the server is a mirror.** A learner
 *    with no database configured must still get a complete product, and the
 *    PRD forbids a login wall. So we persist locally, always, and *additionally*
 *    sync to `/api/progress` when a session exists. The sync never blocks a
 *    mutation and never surfaces an error into the UI — a failed sync shows the
 *    learner nothing, because from their side nothing failed.
 *
 * 3. **Mutations go through the pure functions in `lib/learning/progress`.**
 *    The same code computes state in the browser, on the server, and in tests.
 *    This provider is only a storage and notification shell.
 */

type ProgressContextValue = {
  store: ProgressStore;
  /** False until localStorage has been read. Gate progress-dependent UI on this. */
  hydrated: boolean;
  beginLesson: (slug: string, sectionId: string | null) => void;
  recordQuizScore: (slug: string, scorePct: number) => void;
  recordMission: (slug: string, missionId: string, completed: boolean) => void;
  completeLesson: (slug: string) => void;
  resetProgress: () => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<ProgressStore>(emptyProgress);
  const [hydrated, setHydrated] = useState(false);
  const storeRef = useRef(store);
  storeRef.current = store;

  // Hydrate once, after mount.
  useEffect(() => {
    setStore(readStored(STORAGE_KEYS.progress, parseProgressStore, emptyProgress()));
    setHydrated(true);
  }, []);

  // Persist on every change, and mirror to the server if there is a session.
  useEffect(() => {
    if (!hydrated) return;
    writeStored(STORAGE_KEYS.progress, store);
    void syncToServer(store);
  }, [store, hydrated]);

  const beginLesson = useCallback((slug: string, sectionId: string | null) => {
    setStore((current) => beginLessonPure(current, slug, sectionId));
  }, []);

  const recordQuizScore = useCallback((slug: string, scorePct: number) => {
    setStore((current) => recordQuizScorePure(current, slug, scorePct));
  }, []);

  const recordMission = useCallback(
    (slug: string, missionId: string, completed: boolean) => {
      setStore((current) => recordMissionPure(current, slug, missionId, completed));
    },
    [],
  );

  const completeLesson = useCallback((slug: string) => {
    setStore((current) => completeLessonPure(current, slug));
  }, []);

  const resetProgress = useCallback(() => {
    setStore(emptyProgress());
    // Forgetting is an explicit act, so it gets an explicit verb. The sync
    // effect below only ever *adds* progress — a stale device must not be able
    // to delete a newer one's history — which means clearing has to be asked
    // for by name. Fired and forgotten: local state is already gone, and a
    // failed delete leaves a server copy that the next sync will not resurrect.
    removeStored(STORAGE_KEYS.progress);
    void fetch("/api/progress", { method: "DELETE", signal: AbortSignal.timeout(4000) }).catch(
      () => {},
    );
  }, []);

  // Keep tabs in sync: completing a lesson in one tab should update the path
  // shown in another. `storage` events only fire in *other* tabs, which is
  // exactly the case we care about here.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== `stockschool:${STORAGE_KEYS.progress}`) return;
      if (event.newValue === null) {
        setStore(emptyProgress());
        return;
      }
      try {
        const parsed = parseProgressStore(JSON.parse(event.newValue));
        if (parsed) setStore(parsed);
      } catch {
        /* another tab wrote something unreadable; keep what we have */
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      store,
      hydrated,
      beginLesson,
      recordQuizScore,
      recordMission,
      completeLesson,
      resetProgress,
    }),
    [store, hydrated, beginLesson, recordQuizScore, recordMission, completeLesson, resetProgress],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgress must be used inside <ProgressProvider>");
  }
  return context;
}

/**
 * Mirror progress to the server.
 *
 * Deliberately silent. There is no error state to show: if the request fails,
 * localStorage still holds the truth and the learner notices nothing. The one
 * thing we must not do is retry in a loop — a down database would otherwise
 * generate a request per keystroke.
 *
 * Note the verb: POST *adds*. The server merges what it receives and refuses to
 * move anything backwards, so this request can never destroy a copy that a
 * newer device wrote. Deleting is `resetProgress`'s DELETE, above.
 */
let lastSyncedAt = 0;
let syncInFlight = false;

async function syncToServer(store: ProgressStore): Promise<void> {
  if (syncInFlight) return;

  const now = Date.now();
  // Progress changes are bursty (a quiz submission touches several records).
  // One request every few seconds is plenty to keep a server copy warm.
  if (now - lastSyncedAt < 3000) return;

  syncInFlight = true;
  lastSyncedAt = now;

  try {
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(store),
      // Never let a slow sync hold a page transition open.
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* the local copy is authoritative; a failed mirror is not the learner's problem */
  } finally {
    syncInFlight = false;
  }
}

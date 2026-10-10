"use client";

import { useEffect, useRef, useState } from "react";
import { Check, PenLine } from "lucide-react";
import { STORAGE_KEYS, readStored, writeStored } from "@/lib/storage/local";
import { cn } from "@/lib/utils";

/**
 * The reflection prompt.
 *
 * A short piece of writing at the end of a lesson is the cheapest retention
 * mechanism there is, and it costs us nothing to run: no grading, no submission,
 * no server round trip. What the learner writes never leaves their device.
 *
 * That last point is not a footnote — it is the design. The textarea writes to
 * `localStorage` under a key that is never sent anywhere, not even to the
 * progress mirror, because `/api/progress` receives quiz scores and mission
 * flags and has no business holding somebody's notes about their own finances.
 * The copy in the frame says so plainly, so nobody has to guess.
 *
 * Saving is debounced rather than per-keystroke: a long paragraph would
 * otherwise serialise the whole store on every character.
 */

type ReflectionStore = Record<string, string>;

function validateReflections(value: unknown): ReflectionStore | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const out: ReflectionStore = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

const EMPTY: ReflectionStore = {};

export function ReflectionBlock({
  lessonSlug,
  sectionId,
  prompt,
  placeholder,
}: {
  lessonSlug: string;
  sectionId: string;
  prompt: string;
  placeholder?: string;
}) {
  const storageKey = `${lessonSlug}:${sectionId}`;

  const [text, setText] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // Renders on the server as "empty prompt", then fills in after mount. Reading
  // storage during the first render would produce different markup on each side.
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const store = readStored(STORAGE_KEYS.reflections, validateReflections, EMPTY);
    setText(store[storageKey] ?? "");
    setMounted(true);
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      const store = readStored(STORAGE_KEYS.reflections, validateReflections, EMPTY);
      const next: ReflectionStore = { ...store };

      if (text.trim() === "") {
        delete next[storageKey];
      } else {
        next[storageKey] = text;
      }

      writeStored(STORAGE_KEYS.reflections, next);
      setSavedAt(Date.now());
    }, 500);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, mounted, storageKey]);

  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  return (
    <div className="not-prose">
      <div className="rounded-2xl border border-line bg-surface">
        <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
          <PenLine className="h-4 w-4 text-teal" aria-hidden />
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.13em] text-teal-strong">
            Reflect
          </span>
          <span className="ml-auto font-mono text-[0.75rem] text-ink-subtle tabular-nums">
            {mounted && savedAt !== null ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3 w-3" aria-hidden />
                Saved on this device
              </span>
            ) : (
              <span>{words > 0 ? `${words} words` : " "}</span>
            )}
          </span>
        </header>

        <div className="px-5 py-6 sm:px-6">
          <label
            htmlFor={`reflection-${sectionId}`}
            className="block font-display text-[1.0625rem] font-medium leading-snug tracking-[-0.01em] text-ink"
          >
            {prompt}
          </label>

          <textarea
            id={`reflection-${sectionId}`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={placeholder ?? "In your own words…"}
            rows={5}
            className={cn(
              "mt-4 w-full resize-y rounded-xl border border-line-strong bg-surface px-4 py-3",
              "text-[0.9375rem] leading-relaxed text-ink placeholder:text-ink-subtle",
              "focus-visible:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/45",
            )}
          />

          <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-subtle">
            There is no answer to check and nothing is submitted. Your notes stay in this browser —
            they are not sent to the server, and clearing site data removes them.
          </p>
        </div>
      </div>
    </div>
  );
}

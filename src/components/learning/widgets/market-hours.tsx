"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Slider, Stage, WidgetNote } from "./parts";
import type { WidgetProps } from "./types";

/**
 * A 24-hour clock, redrawn in *your* timezone.
 *
 * Every chart of market hours on the internet is drawn in New York time, which
 * is precisely the information someone in Lagos, Lisbon or Lahore cannot use.
 * This one asks the browser where it is and re-plots the session bands into
 * local coordinates, so "the market opens at 9:30" becomes "the market opens at
 * 2:30 in the afternoon, where you are."
 *
 * The day is rendered as a single 0–24 track rather than as a calendar week,
 * because the point being made is about a *day*: the equity market sleeps, and
 * the token's pool does not.
 *
 * All time-dependent rendering happens after mount. Server-rendered HTML cannot
 * know the reader's clock, and guessing produces a hydration mismatch on the
 * one piece of the page whose entire job is to be locally correct.
 */

const NY = "America/New_York";

/** Session boundaries in New York minutes since midnight. */
const ET = {
  pre: 4 * 60,
  open: 9 * 60 + 30,
  close: 16 * 60,
  post: 20 * 60,
} as const;

/**
 * A timezone's UTC offset, in minutes, at a given instant.
 *
 * The only reliable way to get this without a timezone library: format the
 * instant in the target zone, read the wall-clock fields back, and compare them
 * with the same instant in UTC. Doing it per-instant means DST is handled by the
 * platform rather than by a table we would have to maintain.
 */
function offsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const field: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") field[part.type] = Number(part.value);
  }

  const asUtc = Date.UTC(
    field.year ?? 1970,
    (field.month ?? 1) - 1,
    field.day ?? 1,
    (field.hour ?? 0) % 24,
    field.minute ?? 0,
    field.second ?? 0,
  );

  const trueUtc = Math.floor(at.getTime() / 1000) * 1000;
  return (asUtc - trueUtc) / 60000;
}

const mod = (n: number, m = 1440) => ((n % m) + m) % m;

function clockLabel(minutes: number): string {
  const total = mod(Math.round(minutes));
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")}${h24 < 12 ? "am" : "pm"}`;
}

/** Split a session into 0–2 segments so a band crossing midnight still draws. */
function segments(startLocal: number, endLocal: number): Array<[number, number]> {
  const s = mod(startLocal);
  const e = mod(endLocal);
  if (e > s) return [[s, e]];
  return [
    [s, 1440],
    [0, e],
  ];
}

type Snapshot = {
  localTz: string;
  etMinutes: number;
  localMinutes: number;
  delta: number;
  isWeekend: boolean;
  weekday: string;
  localClock: string;
  etClock: string;
};

function snapshot(previewMinutes: number): Snapshot {
  const now = new Date();
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const delta = offsetMinutes(localTz, now) - offsetMinutes(NY, now);

  const etFields = new Intl.DateTimeFormat("en-US", {
    timeZone: NY,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  }).formatToParts(now);

  const get = (type: string) => etFields.find((p) => p.type === type)?.value ?? "";

  const etMinutes = mod(Number(get("hour")) % 24 * 60 + Number(get("minute")) + previewMinutes);
  const localMinutes = mod(etMinutes + delta);
  const weekday = get("weekday");

  return {
    localTz,
    etMinutes,
    localMinutes,
    delta,
    isWeekend: weekday === "Sat" || weekday === "Sun",
    weekday,
    localClock: clockLabel(localMinutes),
    etClock: clockLabel(etMinutes),
  };
}

export function MarketHours(_props: WidgetProps) {
  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState(0);

  useEffect(() => setMounted(true), []);

  const snap = useMemo(() => (mounted ? snapshot(preview) : null), [mounted, preview]);

  if (!snap) {
    return (
      <Stage tone="grid" className="px-6 py-14 text-center">
        <p className="text-[0.875rem] text-ink-muted">Reading your local clock…</p>
      </Stage>
    );
  }

  const status = sessionStatus(snap.etMinutes, snap.isWeekend);

  const regular = segments(ET.open + snap.delta, ET.close + snap.delta);
  const pre = segments(ET.pre + snap.delta, ET.open + snap.delta);
  const post = segments(ET.close + snap.delta, ET.post + snap.delta);

  const localOpen = mod(ET.open + snap.delta);
  const localClose = mod(ET.close + snap.delta);

  return (
    <div className="space-y-5">
      <Stage tone="grid" className="p-5 sm:p-7">
        {/* --- Status line -------------------------------------------------- */}
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-[0.6875rem] uppercase tracking-[0.13em] text-ink-subtle">
              New York Stock Exchange
            </p>
            <p className="mt-1 font-display text-[1.375rem] font-semibold tracking-[-0.015em] text-ink">
              {status.label}
            </p>
          </div>
          <Badge tone={status.tone}>
            <span
              aria-hidden
              className={
                status.tone === "positive"
                  ? "h-1.5 w-1.5 rounded-full bg-success animate-pulse-ring"
                  : "h-1.5 w-1.5 rounded-full bg-current opacity-60"
              }
            />
            {snap.weekday} · {snap.etClock} in New York
          </Badge>
        </div>

        {/* --- The 24-hour track -------------------------------------------- */}
        <div className="mt-8">
          <div className="relative h-16 w-full overflow-hidden rounded-lg border border-line bg-surface">
            {/* The closed backdrop, so "everything else" is visible rather than
                just implied by absence. */}
            <div
              className="absolute inset-0"
              style={{ background: "var(--color-surface-sunken)" }}
            />

            {pre.map(([a, b]) => (
              <Band key={`pre-${a}`} from={a} to={b} paint="var(--color-sky)" />
            ))}
            {post.map(([a, b]) => (
              <Band key={`post-${a}`} from={a} to={b} paint="var(--color-sky)" />
            ))}
            {regular.map(([a, b]) => (
              <Band key={`reg-${a}`} from={a} to={b} paint="var(--color-teal-soft)" border />
            ))}

            {/* Hour gridlines every three hours, in local time. */}
            {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => (
              <div
                key={hour}
                aria-hidden
                className="absolute top-0 h-full w-px"
                style={{ left: `${(hour / 24) * 100}%`, background: "var(--color-line)" }}
              />
            ))}

            {/* Now. */}
            <div
              className="absolute top-0 h-full w-px"
              style={{ left: `${(snap.localMinutes / 1440) * 100}%` }}
            >
              <div
                className="absolute -left-1 -top-1 h-2 w-2 rounded-full"
                style={{ background: "var(--color-teal)" }}
              />
              <div className="h-full w-px" style={{ background: "var(--color-teal)" }} />
            </div>
          </div>

          {/* Local-time ruler. */}
          <div className="relative mt-1.5 h-4">
            {[0, 6, 12, 18, 24].map((hour) => (
              <span
                key={hour}
                className="absolute font-mono text-[0.6875rem] tabular-nums text-ink-subtle"
                style={{
                  left: `${(hour / 24) * 100}%`,
                  transform:
                    hour === 0 ? "none" : hour === 24 ? "translateX(-100%)" : "translateX(-50%)",
                }}
              >
                {hour === 24 ? "24h" : clockLabel(hour * 60)}
              </span>
            ))}
          </div>
        </div>

        {/* --- Legend ------------------------------------------------------- */}
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          <LegendItem paint="var(--color-sky)" label="Extended hours (pre & post)" />
          <LegendItem paint="var(--color-teal-soft)" label="Regular session" border />
          <LegendItem paint="var(--color-surface-sunken)" label="Market closed" />
        </ul>

        <p className="mt-5 max-w-prose text-[0.9375rem] leading-relaxed text-ink-muted">
          {snap.isWeekend
            ? `It is ${snap.weekday} in New York, so the equity market is shut for the whole day — the bands above show what a weekday looks like in your local time. The token's pool, meanwhile, has no weekend.`
            : `In your timezone the regular session runs from ${clockLabel(localOpen)} to ${clockLabel(localClose)} — same market, same shares, different clock. Outside those hours the pool still trades, which is exactly when its price and the reference price have the most room to drift apart.`}
        </p>
      </Stage>

      {/* --- Readouts ------------------------------------------------------- */}
      <div className="grid gap-x-6 gap-y-4 rounded-xl border border-line bg-surface px-5 py-4 sm:grid-cols-4">
        <Field label="Your clock" value={snap.localClock} hint={snap.localTz} />
        <Field label="New York" value={snap.etClock} hint="Eastern Time" />
        <Field
          label="Offset"
          value={`${snap.delta >= 0 ? "+" : "−"}${Math.abs(Math.round(snap.delta / 60))}h`}
          hint="Relative to New York"
        />
        <Field label="Session now" value={status.short} />
      </div>

      {/* --- Scrubber ------------------------------------------------------- */}
      <div className="rounded-xl border border-line bg-surface-muted px-5 py-4">
        <Slider
          id="mh-preview"
          label="Preview another hour"
          min={0}
          max={1439}
          step={5}
          value={preview}
          onChange={setPreview}
          display={preview === 0 ? "now" : `now ${preview > 0 ? "+" : "−"}${Math.abs(preview)} min`}
          hint="Drag to walk the marker through the day and watch the session change underneath it."
        />
      </div>

      <WidgetNote tone="caution">
        Hours are the standard US equity sessions and ignore exchange holidays, half-days and
        unscheduled closures. They also say nothing about whether any particular token is tradable
        at that moment — that depends on the issuer and the pool, not on the exchange calendar.
      </WidgetNote>
    </div>
  );
}

// -----------------------------------------------------------------------------

function Band({
  from,
  to,
  paint,
  border,
}: {
  from: number;
  to: number;
  paint: string;
  border?: boolean;
}) {
  const left = (from / 1440) * 100;
  const width = ((to - from) / 1440) * 100;
  return (
    <div
      aria-hidden
      className="absolute top-0 h-full"
      style={{
        left: `${left}%`,
        width: `${width}%`,
        background: paint,
        boxShadow: border ? "inset 1px 0 0 var(--color-teal-line), inset -1px 0 0 var(--color-teal-line)" : undefined,
      }}
    />
  );
}

function LegendItem({ paint, label, border }: { paint: string; label: string; border?: boolean }) {
  return (
    <li className="flex items-center gap-2 text-[0.75rem] text-ink-muted">
      <span
        aria-hidden
        className="h-3 w-5 shrink-0 rounded-[3px]"
        style={{
          background: paint,
          boxShadow: border ? "inset 0 0 0 1px var(--color-teal-line)" : "inset 0 0 0 1px var(--color-line)",
        }}
      />
      {label}
    </li>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">{label}</p>
      <p className="mt-1 font-mono text-[0.9375rem] tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[0.75rem] text-ink-subtle">{hint}</p>}
    </div>
  );
}

function sessionStatus(
  etMinutes: number,
  isWeekend: boolean,
): { label: string; short: string; tone: "positive" | "caution" | "neutral" } {
  if (isWeekend) return { label: "Closed for the weekend", short: "Weekend", tone: "neutral" };

  const m = etMinutes;
  if (m >= ET.open && m < ET.close) {
    return { label: "The market is open", short: "Regular", tone: "positive" };
  }
  if (m >= ET.pre && m < ET.open) {
    return { label: "Pre-market is running", short: "Pre-market", tone: "caution" };
  }
  if (m >= ET.close && m < ET.post) {
    return { label: "Post-market is running", short: "Post-market", tone: "caution" };
  }
  return { label: "The market is closed", short: "Closed", tone: "neutral" };
}

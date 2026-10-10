"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Copy-to-clipboard for on-chain identifiers.
 *
 * Contract addresses and transaction hashes are the one thing in this product a
 * learner genuinely needs to move elsewhere — into a block explorer, a note, a
 * message. Selecting a 42-character hex string by hand is miserable, so every
 * one of them gets a copy button.
 *
 * The clipboard API can reject: the document may not be focused, or the
 * permission may be denied. When it does we fall back to a manual selection of
 * the text so the learner can still copy it themselves, rather than silently
 * doing nothing.
 */
export function CopyButton({
  value,
  label,
  className,
  size = "md",
}: {
  value: string;
  /** What the thing is, for the accessible name: "Copy contract address". */
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | null>(null);
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(async () => {
    setFailed(false);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Older browsers, and any context where the async clipboard API is
        // unavailable but execCommand still works.
        if (!selectText(nodeRef.current, value)) throw new Error("no clipboard");
      }
      setCopied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Leave the text selected so a manual Ctrl/Cmd+C works.
      selectText(nodeRef.current, value);
      setFailed(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFailed(false), 3000);
    }
  }, [value]);

  const Icon = copied ? Check : Copy;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {/* The visible value lives with the caller; this hidden node exists so the
          fallback path has something real to select. */}
      <span ref={nodeRef} className="sr-only" aria-hidden>
        {value}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        className={cn(
          "inline-flex items-center justify-center rounded-md border border-line text-ink-muted",
          "transition-colors duration-150 hover:border-line-strong hover:text-ink",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/45",
          size === "sm" ? "h-6 w-6" : "h-8 w-8",
          copied && "border-teal-line text-teal-strong",
          failed && "border-danger/40 text-danger",
        )}
      >
        <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
      </button>
      {/* Announced, but not shown — the icon already changed for sighted users. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : failed ? "Copy failed — the text is selected" : ""}
      </span>
    </span>
  );
}

/** Best-effort text selection, used both as a fallback and on failure. */
function selectText(node: HTMLElement | null, value: string): boolean {
  if (!node) return false;

  try {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    return selection.toString().trim().length > 0;
  } catch {
    // Some environments block programmatic selection entirely. There is
    // nothing more we can do, and the value is visible on screen regardless.
    void value;
    return false;
  }
}

/**
 * A monospace identifier with a copy button — the standard way this product
 * shows an address or a hash.
 */
export function AddressChip({
  value,
  label,
  display,
  className,
  href,
}: {
  value: string;
  label: string;
  /** Shortened form to show, e.g. 0x1234…abcd. Falls back to the full value. */
  display?: string;
  className?: string;
  /** Explorer URL. When present the identifier becomes a link. */
  href?: string | null;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-surface-muted px-2.5 py-1.5",
        className,
      )}
    >
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={value}
          className="truncate font-mono text-[0.75rem] tracking-[0.01em] text-teal-strong underline decoration-teal-line underline-offset-2 hover:decoration-teal"
        >
          {display ?? value}
        </a>
      ) : (
        <span title={value} className="truncate font-mono text-[0.75rem] tracking-[0.01em]">
          {display ?? value}
        </span>
      )}
      <CopyButton value={value} label={label} size="sm" />
    </span>
  );
}

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Buttons.
 *
 * Three decisions worth stating:
 *
 * 1. There is a real `focus-visible` ring on every variant. The canvas is warm
 *    off-white and the accent is a deep teal, so a default browser outline is
 *    both ugly and easy to miss — we draw our own.
 * 2. `as="link"` renders a Next `<Link>`. Navigation should be a link, not a
 *    button that calls router.push, so middle-click and open-in-new-tab work.
 * 3. The disabled state keeps full opacity of the label rather than fading the
 *    whole control to 40%. Faded text on a warm canvas reads as "broken", and
 *    a disabled control still needs to be legible to explain itself.
 * 4. Filled variants use `text-ink-inverse`, never `text-white`. In light mode
 *    the two are nearly the same off-white, so the difference looks like
 *    nothing — but dark mode lifts `--color-teal` to a bright #3fb3a2, where
 *    white type reads at 2.6:1 and fails AA outright. `ink-inverse` flips to a
 *    near-black there and the pair clears 7:1. A hard-coded `white` cannot make
 *    that flip, which is the whole reason the token exists.
 */

type Variant = "primary" | "secondary" | "ghost" | "quiet";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-teal text-ink-inverse shadow-[0_1px_2px_rgba(27,33,29,0.16)] hover:bg-teal-strong active:translate-y-px",
  secondary:
    "bg-surface text-ink border border-line-strong hover:border-ink hover:bg-surface-muted active:translate-y-px",
  ghost:
    "bg-transparent text-ink-muted hover:text-ink hover:bg-ink/[0.04] active:translate-y-px",
  quiet:
    "bg-teal-soft text-teal-strong hover:bg-teal-soft/70 active:translate-y-px",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.8125rem] gap-1.5 rounded-lg",
  md: "h-11 px-5 text-sm gap-2 rounded-xl",
  lg: "h-13 px-7 text-[0.9375rem] gap-2.5 rounded-xl",
};

const BASE =
  "inline-flex items-center justify-center font-medium tracking-[-0.01em] " +
  "transition-[background-color,border-color,color,transform] duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/45 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas " +
  "disabled:pointer-events-none disabled:opacity-55 disabled:shadow-none";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

type ButtonProps = CommonProps &
  Omit<ComponentProps<"button">, "className" | "children"> & { as?: "button" };

type LinkProps = CommonProps &
  Omit<ComponentProps<typeof Link>, "className" | "children"> & { as: "link" };

export function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", size = "md", className, children } = props;
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);

  if (props.as === "link") {
    const { as: _as, variant: _v, size: _s, className: _c, children: _ch, ...rest } = props;
    return (
      <Link className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const { as: _as, variant: _v, size: _s, className: _c, children: _ch, ...rest } = props;
  // Default to type="button": a bare <button> inside a form submits it, which
  // is almost never what a quiz control wants.
  return (
    <button type={rest.type ?? "button"} className={classes} {...rest}>
      {children}
    </button>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { lessons, totalEstimatedMinutes } from "@/content/lessons";
import { toPathLesson } from "@/lib/learning/progress";
import { LearningPath } from "@/components/learning/learning-path";

export const metadata: Metadata = {
  title: "The course",
  description:
    "Eight short lessons on tokenized stocks: what a share is, what a token is, why two prices exist, and how to read a contract on BNB Smart Chain yourself.",
};

/**
 * The course index.
 *
 * This page has one job and it is not "list eight things". It is to get someone
 * who has never opened a block explorer to start lesson 01. So the header does
 * the persuading — what this is, how long it takes, and what it deliberately is
 * not — and everything actionable sits in the path component below, which is
 * client-side because that is where progress lives.
 *
 * The lessons are trimmed to `PathLesson` here rather than passed whole. That is
 * not premature optimisation: a full `Lesson` carries every paragraph, quiz and
 * figure config in the curriculum, and rendering eight cards would otherwise
 * ship the entire course to the browser as client data.
 */

export default function LearnPage() {
  const items = lessons.map(toPathLesson);

  return (
    <div className="container-page py-14 sm:py-20">
      <header className="mx-auto max-w-3xl">
        <p className="eyebrow">The course</p>

        <h1 className="mt-4 text-display text-ink">
          Eight lessons, in the order they make sense of each other.
        </h1>

        <p className="mt-6 max-w-prose text-lg leading-relaxed text-ink-muted">
          Start with what a share actually is — which is stranger than most people expect — and
          finish able to open a token contract on BNB Smart Chain and read its name, its supply and
          its decimals for yourself. Every lesson uses real assets, and none of them tells you what
          to buy.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[0.75rem] text-ink-subtle">
          <span>{lessons.length} lessons</span>
          <span>≈ {Math.round(totalEstimatedMinutes / 5) * 5} minutes end to end</span>
          <span>No account, no wallet, nothing to install</span>
        </div>

        <div className="mt-10 rule-fade" />
      </header>

      <div className="mx-auto mt-10 max-w-3xl">
        <LearningPath items={items} />
      </div>

      <div className="mx-auto mt-16 max-w-3xl">
        <div className="grid gap-5 rounded-2xl border border-line bg-surface-muted px-6 py-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-7 sm:px-8">
          <p className="eyebrow sm:pt-1">Read this first</p>
          <div>
            <p className="max-w-prose text-[0.9375rem] leading-relaxed text-ink">
              StockSchool is an educational project. It does not give investment advice, it does not
              recommend any asset, and nothing you do here touches a real market. The figures are
              illustrations of a mechanism; the assets on the Explore page are real, and are shown
              so you can check the mechanism against them.
            </p>
            <Link
              href="/explore"
              className="mt-4 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-teal-strong underline-offset-4 hover:underline"
            >
              Or skip ahead and look at real assets
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

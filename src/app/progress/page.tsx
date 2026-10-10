import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressDashboard } from "@/components/learning/progress-dashboard";
import { lessons } from "@/content/lessons";
import { toPathLesson } from "@/lib/learning/progress";

/**
 * Progress — the record, not the plan.
 *
 * `/learn` is where a learner decides what to do next; this page is where they
 * find out what they have done. Splitting them matters more than it sounds.
 * A single page carrying both would have to be a sales page and a receipt at
 * once, and the receipt always loses — the continue card gets the top of the
 * screen, the actual record gets pushed below the fold, and the numbers a
 * learner came here to check end up somewhere they have to scroll to find.
 *
 * So this page has no streak, no badge, no "come back tomorrow", and no
 * celebration animation. Those are retention mechanics, and a course that
 * teaches someone to be sceptical of a yield figure has no business using them
 * on its own completion counter. It states the numbers and where they came
 * from, and then offers to delete them.
 *
 * The lessons are trimmed to `PathLesson` before crossing the boundary. That is
 * load-bearing rather than tidy: a full `Lesson` carries every paragraph, quiz
 * and figure config in the curriculum, and the table below renders eight rows of
 * titles, numbers and counts. Passing the curriculum itself would ship the whole
 * course to the browser to draw a table.
 *
 * `robots: index: false` for the same reason a bank statement is not a search
 * result: the content is one person's record, and there is nothing here for
 * anyone else to find.
 */

export const metadata: Metadata = {
  title: "Your progress",
  description:
    "What you have completed, your best quiz scores and the missions you have passed — stored in your own browser, deletable at any time.",
  robots: { index: false, follow: true },
};

export default function ProgressPage() {
  const items = lessons.map(toPathLesson);

  return (
    <div className="container-page py-14 sm:py-20">
      <PageHeader
        eyebrow="Progress"
        title={
          <>
            Everything you have finished, and{" "}
            <em className="font-normal italic text-teal-strong">nothing you have not</em>.
          </>
        }
        lede={
          <>
            This page keeps one kind of number: what you have actually done. No streaks, no badges,
            no reminder to come back — a course that asks you to be sceptical of a yield figure
            should not use those tricks on its own completion counter.
          </>
        }
        divider={false}
      />

      <div className="mt-12">
        <ProgressDashboard items={items} />
      </div>

      <div className="mt-12 flex flex-wrap gap-3 border-t border-line pt-8">
        <Link
          href="/learn"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-5 text-[0.875rem] font-medium text-ink-inverse transition-opacity hover:opacity-90"
        >
          Back to the course
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
        <Link
          href="/simulate"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-line px-5 text-[0.875rem] font-medium text-ink transition-colors hover:border-line-strong"
        >
          Practise in the simulator
        </Link>
        <Link
          href="/onchain"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-line px-5 text-[0.875rem] font-medium text-ink transition-colors hover:border-line-strong"
        >
          Read a contract yourself
        </Link>
      </div>
    </div>
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { emptyProgress, parseProgressStore } from "@/lib/learning/progress";
import { resolveSession, withSession } from "@/server/session-cookie";
import {
  forgetProgress,
  loadProgress,
  saveProgress,
} from "@/server/services/progress-repository";

/**
 * The progress mirror.
 *
 * Three verbs, and the split between them is the design:
 *
 *   GET     read back what the server holds for this session
 *   POST    add to it — monotonic, never deletes
 *   DELETE  forget it, on an explicit reset
 *
 * The browser's `localStorage` copy is authoritative for rendering; this
 * endpoint exists so that progress survives a cleared browser and so there is a
 * real persistence story to demo. Every response therefore reports what happened
 * to the *mirror* rather than pretending the write was the point: a client that
 * receives `{ persisted: false }` should show nothing, because from the
 * learner's side nothing was lost.
 *
 * The session cookie is minted here on first contact rather than by middleware,
 * which keeps a Set-Cookie off every static page for the majority of visitors
 * who never answer a quiz. No login wall, no email, no wallet — a random handle
 * and a row in Postgres, exactly as `prisma/schema.prisma` describes.
 */

// Prisma needs the Node runtime; the edge runtime cannot open a TCP connection
// to Postgres. Declared explicitly so a future refactor cannot silently move it.
export const runtime = "nodejs";

// Never cached: this is per-session state behind a cookie.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = resolveSession(request);
  const remote = await loadProgress(session.key);

  if (remote === null) {
    // Either no database or an unreadable one. Say so plainly instead of
    // returning an empty store, which would look like "you have no progress".
    return withSession(
      NextResponse.json(
        {
          persisted: false,
          reason: "unavailable",
          message: "Progress cannot be read from the server right now.",
          progress: emptyProgress(),
        },
        { status: 200 },
      ),
      session,
    );
  }

  return withSession(
    NextResponse.json({
      persisted: remote !== null,
      progress: remote ?? emptyProgress(),
    }),
    session,
  );
}

export async function POST(request: NextRequest) {
  const session = resolveSession(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withSession(
      NextResponse.json({ persisted: false, reason: "malformed" }, { status: 400 }),
      session,
    );
  }

  // Parsed with the same function the browser uses on its own localStorage, so
  // a payload cannot be acceptable to one side and not the other. This is a
  // shape check, not a trust boundary — the store holds nothing but slugs and
  // scores, and anything unrecognised is dropped rather than stored.
  const store = parseProgressStore(body);
  if (!store) {
    return withSession(
      NextResponse.json({ persisted: false, reason: "malformed" }, { status: 400 }),
      session,
    );
  }

  const outcome = await saveProgress(session.key, store);

  return withSession(
    NextResponse.json(
      outcome.ok
        ? {
            persisted: true,
            lessons: outcome.lessons,
            missions: outcome.missions,
            newLearner: outcome.newLearner,
          }
        : { persisted: false, reason: outcome.reason, message: outcome.message },
      // A missing database is a configuration state, not a client error. The
      // sync is fire-and-forget; a 5xx here would only pollute the console.
      { status: 200 },
    ),
    session,
  );
}

export async function DELETE(request: NextRequest) {
  const session = resolveSession(request);
  const outcome = await forgetProgress(session.key);

  return withSession(
    NextResponse.json(
      outcome.ok
        ? { forgotten: true, lessons: outcome.lessons, missions: outcome.missions }
        : { forgotten: false, reason: outcome.reason, message: outcome.message },
      { status: 200 },
    ),
    session,
  );
}

// -----------------------------------------------------------------------------

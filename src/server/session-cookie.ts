import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  generateSessionKey,
  isValidSessionKey,
  sessionCookieOptions,
} from "@/lib/session";

/**
 * The cookie plumbing for anonymous sessions.
 *
 * `src/lib/session.ts` owns the key format and the cookie's attributes — both
 * pure, both testable without a request. This module is the part that only makes
 * sense inside a route handler: reading the cookie off a request and attaching a
 * new one to a response.
 *
 * Minting happens here rather than in middleware, deliberately. A Set-Cookie on
 * every page view would hand a cookie to the majority of visitors who read one
 * lesson and leave, and the session only earns its keep once there is progress
 * worth mirroring. The cost is that a learner's first request has no session —
 * which is exactly when they have nothing to store.
 */

export type Session = {
  key: string;
  /** True when this request had no usable cookie and we generated one. */
  isNew: boolean;
};

/**
 * Read the session cookie, or mint a replacement.
 *
 * A value that fails `isValidSessionKey` is treated as absent rather than
 * rejected with an error. A hand-edited cookie is not an attack worth a 400, and
 * the person on the other end of it still deserves a working page.
 */
export function resolveSession(request: NextRequest): Session {
  const existing = request.cookies.get(SESSION_COOKIE)?.value;
  if (isValidSessionKey(existing)) return { key: existing, isNew: false };
  return { key: generateSessionKey(), isNew: true };
}

/** Attach the cookie when — and only when — we just created the session. */
export function withSession(response: NextResponse, session: Session): NextResponse {
  if (session.isNew) {
    response.cookies.set(SESSION_COOKIE, session.key, sessionCookieOptions());
  }
  return response;
}

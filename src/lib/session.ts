/**
 * Anonymous learner identity.
 *
 * The PRD is emphatic that nobody should have to create an account to learn
 * something, and `prisma/schema.prisma` designs around that: a `User` row is
 * created on first visit, keyed by an opaque token in an httpOnly cookie, with
 * `email` left null. Attaching a real identity later means setting that column —
 * no data migration, no second table.
 *
 * What the key is *not*: an authentication credential. It is a random 256-bit
 * handle on one learner's progress, and it is the only thing standing between
 * two people's quiz scores. That is a low-stakes secret, but it is still a
 * secret, so the cookie is httpOnly and `sameSite=lax`, and the token is
 * generated from a CSPRNG rather than anything derivable from the browser.
 *
 * Nothing about a wallet, a private key or a seed phrase is ever stored here,
 * and nothing in this product ever asks for one.
 */

export const SESSION_COOKIE = "ss_learner";

/** 180 days. Long enough that a returning learner is still themselves. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

const KEY_PREFIX = "ss_";
/** 32 bytes → 43 base64url characters, unpadded. */
const KEY_BYTES = 32;
const KEY_PATTERN = /^ss_[A-Za-z0-9_-]{43}$/;

/**
 * A fresh session key.
 *
 * `crypto.getRandomValues` is used rather than `Math.random` because the key
 * gates access to a learner's stored progress: guessable would mean another
 * person's history is readable by iterating a range.
 */
export function generateSessionKey(): string {
  return KEY_PREFIX + base64Url(randomBytes(KEY_BYTES));
}

/**
 * Strict validation, used on every read.
 *
 * A cookie is attacker-controlled input like any other. Rejecting anything that
 * is not exactly our format means a malformed or hand-crafted value is replaced
 * with a new session rather than being passed to a database lookup.
 */
export function isValidSessionKey(value: unknown): value is string {
  return typeof value === "string" && KEY_PATTERN.test(value);
}

/** Cookie attributes, in the shape `NextResponse.cookies.set` accepts. */
export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    // Secure cookies on plain http://localhost are silently dropped by some
    // browsers, so this tracks the actual scheme rather than being always-on.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

// -----------------------------------------------------------------------------

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * base64url, without Buffer.
 *
 * `btoa` is available in Node 18+, in the edge runtime and in every browser, so
 * this works wherever the app might run — which matters because a session helper
 * is exactly the kind of module that gets pulled into an unexpected runtime.
 */
function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

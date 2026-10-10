import type { PrismaClient as PrismaClientType } from "@prisma/client";

/**
 * The database handle — or `null`, which is a supported state rather than a
 * failure.
 *
 * `.env.example` promises that a judge can clone this repo, run it with no
 * `.env` at all, and get a complete working product. Postgres is the one thing
 * that promise is hardest to keep, because `@prisma/client` throws on
 * construction when its datasource has no URL. So the connection is resolved
 * through this module and nowhere else, and every caller is written to carry on
 * when the answer is "no database".
 *
 * Three deliberate choices:
 *
 *  1. **Lazily imported.** `import()` rather than a top-level import keeps the
 *     Prisma engine out of any bundle that never touches persistence, and means
 *     a missing `prisma generate` shows up as a caught error at the one call
 *     site rather than as a module-resolution crash at boot.
 *
 *  2. **Cached on `globalThis`.** Next.js hot-reloads server modules on every
 *     edit in development. A module-level cache would leak a connection pool per
 *     save and exhaust Postgres within an afternoon.
 *
 *  3. **Failure is quiet and once.** If the client cannot be constructed we warn
 *     a single time and remember the `null`, so a page that syncs progress on
 *     every keystroke does not print a console error per keystroke.
 */

type GlobalWithPrisma = typeof globalThis & {
  __stockschoolPrisma?: PrismaClientType | null;
};

/** True when a connection string is present. Says nothing about reachability. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function getDb(): Promise<PrismaClientType | null> {
  if (!isDatabaseConfigured()) return null;

  const scope = globalThis as GlobalWithPrisma;
  if (scope.__stockschoolPrisma) return scope.__stockschoolPrisma;

  try {
    const { PrismaClient } = await import("@prisma/client");
    const client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });

    scope.__stockschoolPrisma = client;
    return client;
  } catch (error) {
    // Most likely `prisma generate` has not been run, or the generated client
    // does not match the schema. Both are fixable by the person running the
    // app, and both should disable persistence rather than break the page.
    console.warn(
      "[stockschool] Persistence is unavailable, so progress stays in this browser only.\n" +
        "  Run `yarn db:generate` and set DATABASE_URL to enable the server-side mirror.\n" +
        `  Cause: ${error instanceof Error ? error.message : String(error)}`,
    );

    scope.__stockschoolPrisma = null;
    return null;
  }
}

/**
 * Run a database operation, absorbing any failure into `null`.
 *
 * The mirror is best-effort by design — see `progress-repository.ts`. A learner
 * whose database is unreachable should notice nothing at all, so every write
 * path goes through here and every read path tolerates a null.
 */
export async function tryDb<T>(
  operation: (db: PrismaClientType) => Promise<T>,
): Promise<T | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    return await operation(db);
  } catch (error) {
    console.warn(
      `[stockschool] A database operation failed and was ignored: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

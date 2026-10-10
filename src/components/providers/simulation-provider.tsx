"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createPortfolio,
  executeBuy,
  executeSell,
  type OrderRequest,
  type OrderResult,
  type Portfolio,
} from "@/lib/simulation/engine";
import { parsePortfolio } from "@/lib/simulation/persistence";
import { STORAGE_KEYS, readStored, removeStored, writeStored } from "@/lib/storage/local";

/**
 * The simulated portfolio, shared across the app.
 *
 * **Local only, and that is a decision rather than an omission.** The database
 * schema has `SimulationPortfolio` and friends, and they are there for a future
 * signed-in experience — but the thing this product actually promises a beginner
 * is that they can practise without an account and without risk. Putting a
 * simulated portfolio behind a login would make the safest feature in the app the
 * one with the highest barrier, which is backwards. So the portfolio lives in
 * `localStorage` and the learner owns it outright.
 *
 * The structural difference from `ProgressProvider` matters: progress has a
 * server mirror because losing a completed lesson is a real loss, and the merge
 * is monotonic so a mirror can never do harm. A simulated portfolio has no
 * equivalent safe merge — two devices editing the same trades produce a history
 * that cannot be reconciled by taking a maximum — so there is no mirror at all,
 * rather than a mirror that would silently pick a winner.
 *
 * `buy` and `sell` return their result *synchronously*. That is why the portfolio
 * is also held in a ref: a rejected order has to hand the caller an `OrderError`
 * in the same tick it was called, and `setState` cannot do that. Without the ref,
 * the trade form would have to guess whether an order succeeded and reconcile a
 * frame later, which is precisely the sort of flicker this design avoids.
 */

type SimulationContextValue = {
  portfolio: Portfolio;
  /** False until storage has been read. Gate portfolio-dependent UI on this. */
  hydrated: boolean;
  /** Place a simulated buy. Returns the error to show, or the new state. */
  buy: (order: OrderRequest) => OrderResult;
  /** Place a simulated sell. */
  sell: (order: OrderRequest) => OrderResult;
  /** Clear the portfolio back to the starting balance. */
  reset: () => void;
};

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [portfolio, setPortfolio] = useState<Portfolio>(() => createPortfolio());
  const [hydrated, setHydrated] = useState(false);

  // The synchronous view of state that `buy` and `sell` validate against.
  const portfolioRef = useRef(portfolio);
  portfolioRef.current = portfolio;

  useEffect(() => {
    setPortfolio(readStored(STORAGE_KEYS.simulation, parsePortfolio, createPortfolio()));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStored(STORAGE_KEYS.simulation, portfolio);
  }, [portfolio, hydrated]);

  /**
   * Commit a result.
   *
   * The ref is written *before* React re-renders, so two orders placed in the
   * same batch validate against the second one's true predecessor rather than
   * both validating against the same stale balance.
   */
  const commit = useCallback((next: Portfolio) => {
    portfolioRef.current = next;
    setPortfolio(next);
  }, []);

  const buy = useCallback(
    (order: OrderRequest): OrderResult => {
      const result = executeBuy(portfolioRef.current, order);
      if (result.ok) commit(result.portfolio);
      return result;
    },
    [commit],
  );

  const sell = useCallback(
    (order: OrderRequest): OrderResult => {
      const result = executeSell(portfolioRef.current, order);
      if (result.ok) commit(result.portfolio);
      return result;
    },
    [commit],
  );

  const reset = useCallback(() => {
    commit(createPortfolio());
    removeStored(STORAGE_KEYS.simulation);
  }, [commit]);

  const value = useMemo<SimulationContextValue>(
    () => ({ portfolio, hydrated, buy, sell, reset }),
    [portfolio, hydrated, buy, sell, reset],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationContextValue {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error("useSimulation must be used inside <SimulationProvider>");
  }
  return context;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// The account used to sign operations. It lives in memory only: never in
// localStorage, sessionStorage, cookies, URLs or logs (see ADR 0009 and 0010).
export interface ActiveAccount {
  accountId: string;
  privateKey: string;
}

interface ActiveAccountContextValue {
  account: ActiveAccount | null;
  activate: (account: ActiveAccount) => void;
  forget: () => void;
}

export const INACTIVITY_LIMIT_MINUTES = 5;

const ActiveAccountContext = createContext<ActiveAccountContextValue | null>(
  null,
);

export function ActiveAccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<ActiveAccount | null>(null);

  const activate = useCallback((next: ActiveAccount) => setAccount(next), []);
  const forget = useCallback(() => setAccount(null), []);

  // Forget the account after a period without any click or key press.
  useEffect(() => {
    if (!account) return;

    const limit = INACTIVITY_LIMIT_MINUTES * 60 * 1000;
    let timer = setTimeout(forget, limit);

    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(forget, limit);
    };

    window.addEventListener("pointerdown", restart);
    window.addEventListener("keydown", restart);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", restart);
      window.removeEventListener("keydown", restart);
    };
  }, [account, forget]);

  const value = useMemo(
    () => ({ account, activate, forget }),
    [account, activate, forget],
  );

  return (
    <ActiveAccountContext.Provider value={value}>
      {children}
    </ActiveAccountContext.Provider>
  );
}

export function useActiveAccount(): ActiveAccountContextValue {
  const context = useContext(ActiveAccountContext);
  if (!context) {
    throw new Error(
      "useActiveAccount must be used inside ActiveAccountProvider.",
    );
  }
  return context;
}

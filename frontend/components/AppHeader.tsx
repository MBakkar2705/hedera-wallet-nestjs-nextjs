"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActiveAccountBar } from "./ActiveAccountBar";
import { BrandMark } from "./BrandMark";

const links = [
  { href: "/accounts", label: "Accounts" },
  { href: "/transfer", label: "Transfer" },
  { href: "/tokens", label: "Tokens" },
  { href: "/topics", label: "Topics" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold tracking-tight"
          >
            <BrandMark />
            Hedera Minimalist Wallet
          </Link>
          <span className="rounded-full bg-warn-wash px-2.5 py-0.5 text-xs font-medium text-warn">
            Testnet
          </span>
        </div>

        <ActiveAccountBar />

        <nav
          aria-label="Sections"
          className="flex w-full flex-wrap gap-1 text-sm"
        >
          {links.map((link) => {
            const current = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  current
                    ? "bg-surface-muted text-brand"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

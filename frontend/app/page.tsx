import Link from "next/link";
import { WalletGlyph } from "@/components/BrandMark";

const sections = [
  {
    href: "/accounts",
    title: "Accounts",
    text: "Create an account, look up an account, choose the account that signs.",
    first: true,
  },
  {
    href: "/transfer",
    title: "Transfer HBAR",
    text: "Send HBAR from the active account to another account.",
  },
  {
    href: "/tokens",
    title: "Tokens",
    text: "Create a token, associate an account with it, send tokens.",
  },
  {
    href: "/topics",
    title: "Topics",
    text: "Create a topic, publish messages and read them back.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-10">
      <section className="relative overflow-hidden rounded-3xl bg-brand px-8 py-12 text-white sm:px-12 sm:py-16">
        <WalletGlyph className="pointer-events-none absolute -right-10 -top-12 size-96 text-white/10" />
        <div className="relative flex max-w-xl flex-col gap-4">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Hedera Minimalist Wallet
          </h1>
          <p className="text-lg text-white/90">
            Create accounts, send HBAR and tokens, and publish messages on the
            Hedera testnet.
          </p>
          <p className="text-sm text-white/80">
            Testnet only: no real funds. Keys stay in the memory of the page.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <p className="text-muted">
          Anything that signs a transaction uses the active account, which you
          choose on the Accounts page.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="flex h-full flex-col gap-1.5 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="text-lg font-semibold tracking-tight">
                  {section.title}
                </span>
                <span className="text-sm text-muted">{section.text}</span>
                {section.first && (
                  <span className="mt-1 text-sm font-medium text-brand">
                    Start here
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

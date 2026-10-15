import type { Metadata } from "next";
import { connection } from "next/server";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ActiveAccountProvider } from "@/lib/active-account";
import { AppHeader } from "@/components/AppHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hedera Minimalist Wallet",
  description: "Hedera testnet demo wallet",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The Content Security Policy (proxy.ts) has a new nonce for each request.
  // A page built once cannot carry it, so the pages are rendered for each
  // request.
  await connection();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ActiveAccountProvider>
          <AppHeader />
          {children}
          <footer className="mx-auto w-full max-w-4xl px-6 py-8 text-sm text-muted">
            Built on the Hedera testnet. An independent demo, not an official
            Hedera product.
          </footer>
        </ActiveAccountProvider>
      </body>
    </html>
  );
}

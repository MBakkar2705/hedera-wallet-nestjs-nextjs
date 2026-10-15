import { request } from "./api";

// Shapes of the backend responses (see accounts.service.ts and the README).
// TypeScript does not check them at runtime: they describe what we expect.
export interface CreatedAccount {
  accountId: string;
  publicKey: string;
  privateKey: string;
  initialBalance: number;
}

export interface AccountBalance {
  // Exact decimal strings (an HBAR amount can exceed what a JS number holds).
  hbar: string;
  tinybars: string;
}

export interface AccountToken {
  tokenId: string;
  symbol: string;
  // In the smallest unit of the token, as a string.
  balance: string;
}

export interface AccountKey {
  // "ED25519" or "secp256k1".
  type: string;
  // The public key as raw hexadecimal (not DER).
  publicKey: string;
}

export interface AccountInfo {
  accountId: string;
  // Already formatted by the backend: the amount followed by the HBAR symbol.
  // Kept by the backend for compatibility; "balance" is the structured form.
  hbarBalance: string;
  // Token IDs, kept for compatibility; "tokens" carries more.
  tokenAssociations: string[];
  balance: AccountBalance;
  tokens: AccountToken[];
  // null when the key of the account is not a single key (a list of keys,
  // a threshold key or a contract key).
  key: AccountKey | null;
}

// Hedera account IDs look like 0.0.123456.
export const ACCOUNT_ID_PATTERN = /^\d+\.\d+\.\d+$/;

export function createAccount(initialBalance: number): Promise<CreatedAccount> {
  return request<CreatedAccount>("/accounts", {
    method: "POST",
    body: JSON.stringify({ initialBalance }),
  });
}

export function getAccount(accountId: string): Promise<AccountInfo> {
  return request<AccountInfo>(`/accounts/${encodeURIComponent(accountId)}`);
}

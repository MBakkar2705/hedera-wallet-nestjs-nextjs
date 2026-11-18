// Reads the number of decimals of the tokens of an account from the mirror node.
// Hedera does not give the decimals with AccountInfoQuery, and the query of the
// balances of the SDK (AccountBalanceQuery) no longer works (ADR 0024). The
// mirror node is free and does not need the operator account.

export const MIRROR_NODE_TIMEOUT_MS = 5000;
// 100 tokens per page: 10 pages cover 1,000 tokens.
export const MIRROR_NODE_MAX_PAGES = 10;

interface TokenRelationshipsPage {
  tokens?: { token_id?: unknown; decimals?: unknown }[];
  links?: { next?: unknown } | null;
}

// A number of decimals: a whole number or a string of digits, never negative.
function toDecimals(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value);
  }
  return null;
}

// The decimals of the tokens the mirror node knows for the account, by token ID.
// Returns null when the mirror node cannot be read (network error, timeout,
// error status, answer that is not JSON): the caller then shows the decimals as
// unknown. A token that is not in the answer is simply missing from the map.
export async function readTokenDecimals(
  baseUrl: string,
  accountId: string,
  fetchPage: typeof fetch = fetch,
): Promise<Map<string, number> | null> {
  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return null;
  }

  const decimals = new Map<string, number>();
  let next: string | null = `/api/v1/accounts/${accountId}/tokens?limit=100`;

  for (let page = 0; next !== null && page < MIRROR_NODE_MAX_PAGES; page++) {
    let body: TokenRelationshipsPage;
    try {
      const url = new URL(next, baseUrl);
      // A link that leads to another host is not followed.
      if (url.origin !== origin) {
        return null;
      }
      const response = await fetchPage(url, {
        signal: AbortSignal.timeout(MIRROR_NODE_TIMEOUT_MS),
      });
      if (!response.ok) {
        return null;
      }
      body = (await response.json()) as TokenRelationshipsPage;
    } catch {
      return null;
    }

    for (const token of body.tokens ?? []) {
      const value = toDecimals(token.decimals);
      if (typeof token.token_id === 'string' && value !== null) {
        decimals.set(token.token_id, value);
      }
    }

    next = typeof body.links?.next === 'string' ? body.links.next : null;
  }

  return decimals;
}

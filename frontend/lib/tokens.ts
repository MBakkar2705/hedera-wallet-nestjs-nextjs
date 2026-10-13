import { request } from "./api";

// Hedera token IDs look like 0.0.123456.
export const TOKEN_ID_PATTERN = /^\d+\.\d+\.\d+$/;

// POST /tokens (CreateTokenDto and createToken in the backend).
// The treasury of the new token is the operator account of the backend.
export interface CreateTokenRequest {
  name: string;
  symbol: string;
  initialSupply: number;
}

export interface CreatedToken {
  tokenId: string;
  name: string;
  symbol: string;
  initialSupply: number;
}

// POST /tokens/associate (AssociateTokenDto and associateToken in the backend).
export interface AssociateTokenRequest {
  accountId: string;
  privateKey: string;
  tokenId: string;
}

export interface AssociateTokenResult {
  status: string;
  accountId: string;
  tokenId: string;
}

// POST /tokens/transfer (TransferTokenDto and transferToken in the backend).
export interface TransferTokenRequest {
  fromAccountId: string;
  fromPrivateKey: string;
  toAccountId: string;
  tokenId: string;
  amount: number;
}

export interface TransferTokenResult {
  status: string;
  transactionId: string;
  from: string;
  to: string;
  tokenId: string;
  amount: number;
}

// GET /tokens (ListTokensQueryDto and listTokens in the backend): the tokens
// created through the backend, newest first, one page at a time.
export interface TokenListItem {
  tokenId: string;
  name: string;
  symbol: string;
  initialSupply: number;
  // An ISO date, as JSON has no date type.
  createdAt: string;
}

export interface TokenListPage {
  items: TokenListItem[];
  page: number;
  limit: number;
  total: number;
}

export function createToken(body: CreateTokenRequest): Promise<CreatedToken> {
  return request<CreatedToken>("/tokens", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listTokens(
  page: number,
  limit: number,
): Promise<TokenListPage> {
  return request<TokenListPage>(`/tokens?page=${page}&limit=${limit}`);
}

export function associateToken(
  body: AssociateTokenRequest,
): Promise<AssociateTokenResult> {
  return request<AssociateTokenResult>("/tokens/associate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function transferToken(
  body: TransferTokenRequest,
): Promise<TransferTokenResult> {
  return request<TransferTokenResult>("/tokens/transfer", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

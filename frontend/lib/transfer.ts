import { request } from "./api";

// Request body of POST /accounts/transfer (TransferHbarDto in the backend).
export interface TransferHbarRequest {
  fromAccountId: string;
  fromPrivateKey: string;
  toAccountId: string;
  amount: number;
}

// Response of transferHbar in the backend. "amount" is already formatted,
// for example "1 followed by the HBAR symbol". "value" and "unit" are the same
// amount as a number and its unit.
export interface TransferHbarResult {
  status: string;
  transactionId: string;
  from: string;
  to: string;
  amount: string;
  value: number;
  unit: string;
}

export function transferHbar(
  body: TransferHbarRequest,
): Promise<TransferHbarResult> {
  return request<TransferHbarResult>("/accounts/transfer", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

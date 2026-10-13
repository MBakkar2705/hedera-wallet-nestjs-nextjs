import { Client } from '@hashgraph/sdk';

// Builds the Hedera client of the operator account: the account that pays for
// the transactions and queries the backend sends on its own.
// The application stops at startup, with a clear message, if a variable is missing.
export function createHederaClient(): Client {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;

  if (!accountId || !privateKey) {
    const missing: string[] = [];
    if (!accountId) missing.push('HEDERA_ACCOUNT_ID');
    if (!privateKey) missing.push('HEDERA_PRIVATE_KEY');
    throw new Error(`Missing environment variable(s): ${missing.join(', ')}`);
  }

  return Client.forTestnet().setOperator(accountId, privateKey);
}

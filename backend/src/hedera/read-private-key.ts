import {
  AccountInfoQuery,
  Client,
  PrivateKey,
  PublicKey,
} from '@hashgraph/sdk';

// 64 hexadecimal characters, with or without the 0x prefix. This text does not
// say the type of the key (Ed25519 or ECDSA).
const RAW_KEY = /^(?:0x)?[0-9a-f]{64}$/i;

// Reads the private key that signs for an account.
//
// A DER key carries its type, so PrivateKey.fromString reads it correctly. A raw
// key does not: fromString always reads it as Ed25519, which gives another key
// for an ECDSA account. For a raw key, the type of the account is read on
// Hedera first (one AccountInfoQuery, paid by the operator).
export async function readPrivateKey(
  client: Client,
  accountId: string,
  keyText: string,
): Promise<PrivateKey> {
  if (!RAW_KEY.test(keyText)) {
    return PrivateKey.fromString(keyText);
  }

  // Errors are not caught here: HederaExceptionFilter maps them to HTTP.
  const info = await new AccountInfoQuery()
    .setAccountId(accountId)
    .execute(client);

  // Only a single public key has one type. A list of keys, a threshold key or a
  // contract key keeps the previous reading (see ADR 0023).
  if (info.key instanceof PublicKey) {
    const hex = keyText.replace(/^0x/i, '');
    return info.key.type === 'secp256k1'
      ? PrivateKey.fromStringECDSA(hex)
      : PrivateKey.fromStringED25519(hex);
  }

  return PrivateKey.fromString(keyText);
}

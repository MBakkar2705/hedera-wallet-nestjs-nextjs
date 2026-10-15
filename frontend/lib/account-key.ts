import type { AccountKey } from "./accounts";

export type KeyCheck = "match" | "mismatch" | "unreadable";

// Checks, in the browser, that a private key belongs to an account: the public
// key computed from the private key must be the public key of the account.
// The private key is not sent anywhere, stored or logged.
export async function checkPrivateKey(
  privateKeyText: string,
  accountKey: AccountKey,
): Promise<KeyCheck> {
  // The SDK is large: it is loaded only when a key is checked.
  const { PrivateKey } = await import("@hashgraph/sdk");

  try {
    // A key copied from a document often has a space or a line break around
    // it. Many tools write a hexadecimal key with a 0x prefix. Left in place,
    // fromStringDer would read such a key as Ed25519, whatever its type.
    const text = privateKeyText.trim().replace(/^0x/i, "");
    // In the browser, the SDK reads hexadecimal without checking it: an odd
    // number of characters, or a character that is not hexadecimal, is read as
    // other bytes, so as another key. Such a text is refused here.
    if (!/^(?:[0-9a-fA-F]{2})+$/.test(text)) {
      return "unreadable";
    }
    const isRaw = /^[0-9a-fA-F]{64}$/.test(text);
    // A raw hexadecimal key does not say its type: the type of the account
    // does. A DER key carries its type.
    const key = isRaw
      ? accountKey.type === "secp256k1"
        ? PrivateKey.fromStringECDSA(text)
        : PrivateKey.fromStringED25519(text)
      : PrivateKey.fromStringDer(text);

    const publicKey = key.publicKey;
    const sameType = publicKey.type === accountKey.type;
    const sameKey = publicKey.toStringRaw() === accountKey.publicKey;
    return sameType && sameKey ? "match" : "mismatch";
  } catch {
    // The text is not a private key. The error is not logged: it could
    // contain part of the key.
    return "unreadable";
  }
}

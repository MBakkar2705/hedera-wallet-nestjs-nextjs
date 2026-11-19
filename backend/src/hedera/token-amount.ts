// Turns the balance of a token, in the smallest unit of the token, into an exact
// amount with the decimals of the token. Only text is used, no floating point:
// 150 with 2 decimals is "1.50". Returns null when the decimals are unknown.
export function formatTokenAmount(
  balance: string,
  decimals: number | null,
): string | null {
  if (decimals === null || !/^\d+$/.test(balance)) {
    return null;
  }
  if (decimals === 0) {
    return balance;
  }
  const digits = balance.padStart(decimals + 1, '0');
  const split = digits.length - decimals;
  return `${digits.slice(0, split)}.${digits.slice(split)}`;
}

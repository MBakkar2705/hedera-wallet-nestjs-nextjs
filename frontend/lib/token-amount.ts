// The same conversion as the backend (backend/src/hedera/token-amount.ts): an
// amount in the smallest unit of a token, with the decimals of the token applied.
// Only text is used, so that a large amount stays exact: 150 with 2 decimals is
// "1.50". Returns null when the amount is not a string of digits.
export function formatTokenAmount(
  units: string,
  decimals: number,
): string | null {
  if (!/^\d+$/.test(units)) {
    return null;
  }
  if (decimals === 0) {
    return units;
  }
  const digits = units.padStart(decimals + 1, "0");
  const split = digits.length - decimals;
  return `${digits.slice(0, split)}.${digits.slice(split)}`;
}

function plural(count: number | string, word: string): string {
  return `${count} ${word}${String(count) === "1" ? "" : "s"}`;
}

// What the list of the tokens of an account says under the amount.
export function describeBalance(
  balance: string,
  decimals: number | null,
): string {
  if (decimals === null) {
    return "decimals unknown";
  }
  return `${plural(balance, "unit")} · ${plural(decimals, "decimal")}`;
}

// What the form of the transfer says under the amount typed: how many units make
// a token, and what the typed amount is worth. The transfer always sends the
// units that are typed.
export function describeUnits(
  decimals: number | null,
  symbol: string,
  unitsInput: string,
): string {
  if (decimals === null) {
    return "The decimals of this token are unknown: the amount is in the smallest unit of the token.";
  }
  const unitsPerToken = `1${"0".repeat(decimals)}`;
  const base = `This token has ${plural(decimals, "decimal")}: 1 token = ${plural(unitsPerToken, "unit")}.`;
  // Leading zeros are not part of the amount.
  const units = unitsInput.trim().replace(/^0+(?=\d)/, "");
  const value = formatTokenAmount(units, decimals);
  if (value === null) {
    return base;
  }
  return `${base} If you send ${plural(units, "unit")}, it corresponds to ${value} ${symbol}.`;
}

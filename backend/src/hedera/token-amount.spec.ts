import { formatTokenAmount } from './token-amount';

describe('formatTokenAmount()', () => {
  it('puts the decimal point inside the balance', () => {
    expect(formatTokenAmount('150', 2)).toBe('1.50');
    expect(formatTokenAmount('1000', 2)).toBe('10.00');
  });

  it('keeps the zeros of a balance smaller than one unit', () => {
    expect(formatTokenAmount('5', 3)).toBe('0.005');
    expect(formatTokenAmount('10', 2)).toBe('0.10');
  });

  it('gives a zero with its decimals for a balance of 0', () => {
    expect(formatTokenAmount('0', 2)).toBe('0.00');
  });

  it('gives the balance as it is when the token has no decimals', () => {
    expect(formatTokenAmount('10', 0)).toBe('10');
    expect(formatTokenAmount('0', 0)).toBe('0');
  });

  it('is exact for a balance that a floating point number cannot hold', () => {
    expect(formatTokenAmount('9007199254740993123', 2)).toBe(
      '90071992547409931.23',
    );
  });

  it('returns null when the decimals are unknown', () => {
    expect(formatTokenAmount('150', null)).toBeNull();
  });

  it('returns null when the balance is not a string of digits', () => {
    expect(formatTokenAmount('1e5', 2)).toBeNull();
    expect(formatTokenAmount('-5', 2)).toBeNull();
  });
});

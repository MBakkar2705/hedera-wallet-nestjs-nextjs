import { MIRROR_NODE_MAX_PAGES, readTokenDecimals } from './mirror-node';

const BASE_URL = 'https://mirror.example.com';

// A fake fetch: each call answers with the next given answer.
function page(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) };
}

function fetchWith(...answers: unknown[]) {
  const fake = jest.fn();
  for (const answer of answers) {
    fake.mockResolvedValueOnce(answer);
  }
  return fake;
}

describe('readTokenDecimals()', () => {
  it('reads the decimals of the tokens of the account', async () => {
    const fake = fetchWith(
      page({
        tokens: [
          { token_id: '0.0.11', decimals: 0 },
          { token_id: '0.0.22', decimals: 2 },
        ],
        links: { next: null },
      }),
    );

    const result = await readTokenDecimals(BASE_URL, '0.0.5', fake);

    expect(result).toEqual(
      new Map([
        ['0.0.11', 0],
        ['0.0.22', 2],
      ]),
    );
    expect(fake).toHaveBeenCalledTimes(1);
    expect(String(fake.mock.calls[0][0])).toBe(
      'https://mirror.example.com/api/v1/accounts/0.0.5/tokens?limit=100',
    );
  });

  it('follows the link to the next page', async () => {
    const fake = fetchWith(
      page({
        tokens: [{ token_id: '0.0.11', decimals: 1 }],
        links: {
          next: '/api/v1/accounts/0.0.5/tokens?limit=100&token.id=gt:0.0.11',
        },
      }),
      page({
        tokens: [{ token_id: '0.0.22', decimals: 3 }],
        links: { next: null },
      }),
    );

    const result = await readTokenDecimals(BASE_URL, '0.0.5', fake);

    expect(result).toEqual(
      new Map([
        ['0.0.11', 1],
        ['0.0.22', 3],
      ]),
    );
    expect(fake).toHaveBeenCalledTimes(2);
    expect(String(fake.mock.calls[1][0])).toContain('token.id=gt:0.0.11');
  });

  it('accepts decimals sent as text', async () => {
    const fake = fetchWith(
      page({ tokens: [{ token_id: '0.0.11', decimals: '3' }], links: null }),
    );

    expect(await readTokenDecimals(BASE_URL, '0.0.5', fake)).toEqual(
      new Map([['0.0.11', 3]]),
    );
  });

  it('ignores a token without a usable number of decimals', async () => {
    const fake = fetchWith(
      page({
        tokens: [
          { token_id: '0.0.11', decimals: -1 },
          { token_id: '0.0.22', decimals: 1.5 },
          { token_id: '0.0.33' },
          { decimals: 2 },
        ],
        links: null,
      }),
    );

    expect(await readTokenDecimals(BASE_URL, '0.0.5', fake)).toEqual(new Map());
  });

  it('returns null when the mirror node answers with an error status', async () => {
    const fake = fetchWith(page({}, false));

    expect(await readTokenDecimals(BASE_URL, '0.0.5', fake)).toBeNull();
  });

  it('returns null when the network fails', async () => {
    const fake = jest.fn().mockRejectedValue(new Error('network down'));

    expect(await readTokenDecimals(BASE_URL, '0.0.5', fake)).toBeNull();
  });

  it('returns null when the answer is not JSON', async () => {
    const fake = fetchWith({
      ok: true,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    });

    expect(await readTokenDecimals(BASE_URL, '0.0.5', fake)).toBeNull();
  });

  it('does not follow a link that leads to another host', async () => {
    const fake = fetchWith(
      page({
        tokens: [{ token_id: '0.0.11', decimals: 1 }],
        links: { next: 'https://other.example.com/steal' },
      }),
    );

    expect(await readTokenDecimals(BASE_URL, '0.0.5', fake)).toBeNull();
    expect(fake).toHaveBeenCalledTimes(1);
  });

  it('stops after the maximum number of pages', async () => {
    const fake = jest.fn().mockImplementation(() =>
      Promise.resolve(
        page({
          tokens: [{ token_id: '0.0.11', decimals: 1 }],
          links: { next: '/api/v1/accounts/0.0.5/tokens?limit=100&more=1' },
        }),
      ),
    );

    const result = await readTokenDecimals(BASE_URL, '0.0.5', fake);

    expect(fake).toHaveBeenCalledTimes(MIRROR_NODE_MAX_PAGES);
    expect(result).toEqual(new Map([['0.0.11', 1]]));
  });

  it('returns null when the base URL is not a URL', async () => {
    const fake = jest.fn();

    expect(await readTokenDecimals('not a url', '0.0.5', fake)).toBeNull();
    expect(fake).not.toHaveBeenCalled();
  });
});

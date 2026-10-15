import { AccountInfoQuery, Client, KeyList, PrivateKey } from '@hashgraph/sdk';
import { readPrivateKey } from './read-private-key';

// The real SDK reads the keys. Only the query that reads the account is replaced.
const mockExecute = jest.fn();
jest.mock('@hashgraph/sdk', () => ({
  ...jest.requireActual('@hashgraph/sdk'),
  AccountInfoQuery: jest.fn().mockImplementation(() => ({
    setAccountId: jest.fn().mockReturnThis(),
    execute: mockExecute,
  })),
}));

describe('readPrivateKey()', () => {
  // Never used: the query is replaced above.
  const client = {} as Client;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reads a DER key without any query', async () => {
    const key = PrivateKey.generateECDSA();

    const result = await readPrivateKey(client, '0.0.1', key.toStringDer());

    expect(result.type).toBe('secp256k1');
    expect(result.publicKey.toStringRaw()).toBe(key.publicKey.toStringRaw());
    expect(AccountInfoQuery).not.toHaveBeenCalled();
  });

  it('reads a DER key with the 0x prefix without any query', async () => {
    const key = PrivateKey.generateECDSA();

    const result = await readPrivateKey(
      client,
      '0.0.1',
      `0x${key.toStringDer()}`,
    );

    expect(result.publicKey.toStringRaw()).toBe(key.publicKey.toStringRaw());
    expect(AccountInfoQuery).not.toHaveBeenCalled();
  });

  it('reads a raw key as ECDSA when the account has an ECDSA key', async () => {
    const key = PrivateKey.generateECDSA();
    mockExecute.mockResolvedValue({ key: key.publicKey });

    const result = await readPrivateKey(client, '0.0.1', key.toStringRaw());

    expect(result.type).toBe('secp256k1');
    expect(result.publicKey.toStringRaw()).toBe(key.publicKey.toStringRaw());
    expect(mockExecute).toHaveBeenCalledWith(client);
  });

  it('reads a raw key as Ed25519 when the account has an Ed25519 key', async () => {
    const key = PrivateKey.generateED25519();
    mockExecute.mockResolvedValue({ key: key.publicKey });

    const result = await readPrivateKey(client, '0.0.1', key.toStringRaw());

    expect(result.type).toBe('ED25519');
    expect(result.publicKey.toStringRaw()).toBe(key.publicKey.toStringRaw());
  });

  it('reads a raw key with the 0x prefix', async () => {
    const key = PrivateKey.generateECDSA();
    mockExecute.mockResolvedValue({ key: key.publicKey });

    const result = await readPrivateKey(
      client,
      '0.0.1',
      `0x${key.toStringRaw()}`,
    );

    expect(result.type).toBe('secp256k1');
    expect(result.publicKey.toStringRaw()).toBe(key.publicKey.toStringRaw());
  });

  it('keeps the previous reading (Ed25519) when the key of the account is not a single key', async () => {
    const ecdsa = PrivateKey.generateECDSA();
    const ed25519 = PrivateKey.generateED25519();
    mockExecute.mockResolvedValue({
      key: new KeyList([ecdsa.publicKey, ed25519.publicKey], 1),
    });

    const result = await readPrivateKey(client, '0.0.1', ecdsa.toStringRaw());

    expect(result.type).toBe('ED25519');
    expect(result.publicKey.toStringRaw()).not.toBe(
      ecdsa.publicKey.toStringRaw(),
    );
  });

  it('lets the SDK error through (the global filter maps it)', async () => {
    const key = PrivateKey.generateECDSA();
    mockExecute.mockRejectedValue(new Error('Simulated SDK failure'));

    await expect(
      readPrivateKey(client, '0.0.1', key.toStringRaw()),
    ).rejects.toThrow('Simulated SDK failure');
  });
});

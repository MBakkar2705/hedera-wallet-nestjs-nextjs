import { PrivateKey } from '@hashgraph/sdk';
import { createHederaClient } from './hedera-client';

describe('createHederaClient()', () => {
  const saved = {
    HEDERA_ACCOUNT_ID: process.env.HEDERA_ACCOUNT_ID,
    HEDERA_PRIVATE_KEY: process.env.HEDERA_PRIVATE_KEY,
  };

  beforeEach(() => {
    delete process.env.HEDERA_ACCOUNT_ID;
    delete process.env.HEDERA_PRIVATE_KEY;
  });

  afterAll(() => {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it('names both variables when both are absent', () => {
    expect(() => createHederaClient()).toThrow(
      'Missing environment variable(s): HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY',
    );
  });

  it('names only HEDERA_PRIVATE_KEY when only the key is absent', () => {
    process.env.HEDERA_ACCOUNT_ID = '0.0.1';
    expect(() => createHederaClient()).toThrow(
      'Missing environment variable(s): HEDERA_PRIVATE_KEY',
    );
  });

  it('names only HEDERA_ACCOUNT_ID when only the account is absent', () => {
    process.env.HEDERA_PRIVATE_KEY = PrivateKey.generateED25519().toStringDer();
    expect(() => createHederaClient()).toThrow(
      'Missing environment variable(s): HEDERA_ACCOUNT_ID',
    );
  });

  it('treats an empty value as absent', () => {
    process.env.HEDERA_ACCOUNT_ID = '';
    process.env.HEDERA_PRIVATE_KEY = '';
    expect(() => createHederaClient()).toThrow(
      'Missing environment variable(s): HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY',
    );
  });

  it('returns a client whose operator is the configured account', () => {
    process.env.HEDERA_ACCOUNT_ID = '0.0.1';
    process.env.HEDERA_PRIVATE_KEY = PrivateKey.generateED25519().toStringDer();

    const client = createHederaClient();
    try {
      expect(client.operatorAccountId?.toString()).toBe('0.0.1');
    } finally {
      client.close();
    }
  });
});

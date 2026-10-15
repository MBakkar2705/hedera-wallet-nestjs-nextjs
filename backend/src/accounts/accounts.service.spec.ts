import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountEntity } from './entities/account.entity';
import * as readPrivateKeyModule from '../hedera/read-private-key';

jest.mock('@hashgraph/sdk', () => {
  class Hbar {
    private amount: number;
    constructor(amount: number) {
      this.amount = amount;
    }
    toTinybars(): number {
      return this.amount * 100_000_000;
    }
    toString(): string {
      return `${this.amount} HBAR`;
    }
  }

  // A real class, so that `info.key instanceof PublicKey` works in the service.
  class PublicKey {
    static fromString = jest.fn().mockReturnValue({
      toString: () => 'mocked-public-key',
    });

    constructor(
      public type: string,
      private raw: string,
    ) {}

    toStringRaw(): string {
      return this.raw;
    }
  }

  return {
    PrivateKey: {
      generate: jest.fn().mockReturnValue({
        publicKey: { toString: () => 'mocked-public-key' },
        toString: () => 'mocked-private-key',
      }),
      fromString: jest.fn().mockReturnValue({
        toString: () => 'mocked-private-key',
      }),
    },
    PublicKey,
    Hbar,
    HbarUnit: { Hbar: 'HBAR_UNIT' },
    AccountCreateTransaction: jest.fn().mockImplementation(() => ({
      setKey: jest.fn().mockReturnThis(),
      setInitialBalance: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({
        getReceipt: jest.fn().mockResolvedValue({
          accountId: { toString: () => '0.0.9999999' },
        }),
      }),
    })),
    AccountInfoQuery: jest.fn().mockImplementation(() => ({
      setAccountId: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({
        accountId: { toString: () => '0.0.12345' },
        key: new PublicKey('ED25519', 'mocked-raw-public-key'),
        balance: {
          toString: () => '100',
          to: () => ({ toFixed: () => '100' }),
          toTinybars: () => ({ toString: () => '10000000000' }),
        },
        tokenRelationships: new Map([
          [
            '0.0.111',
            {
              tokenId: { toString: () => '0.0.111' },
              symbol: 'AAA',
              balance: { toString: () => '10' },
            },
          ],
          [
            '0.0.222',
            {
              tokenId: { toString: () => '0.0.222' },
              symbol: 'BBB',
              balance: { toString: () => '2500' },
            },
          ],
        ]),
      }),
    })),
    TransferTransaction: jest.fn().mockImplementation(() => ({
      addHbarTransfer: jest.fn().mockReturnThis(),
      freezeWith: jest.fn().mockReturnThis(),
      sign: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({
        getReceipt: jest.fn().mockResolvedValue({
          status: { toString: () => 'SUCCESS' },
        }),
        transactionId: { toString: () => 'mocked-tx-id' },
      }),
      transactionId: { toString: () => 'mocked-tx-id' },
    })),
    AccountId: {
      fromString: jest.fn().mockReturnValue({
        toString: () => '0.0.mocked-from',
      }),
    },
  };
});

describe('AccountsService', () => {
  let service: AccountsService;

  // Injected in place of the shared Hedera client; the SDK calls are mocked above.
  const mockClient = {};

  const mockRepo = {
    create: jest.fn().mockImplementation((data) => data),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: 'HEDERA_CLIENT', useValue: mockClient },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  describe('createAccount()', () => {
    it('should create a Hedera account and return expected fields', async () => {
      const result = await service.createAccount(10);

      expect(result).toEqual({
        accountId: '0.0.9999999',
        publicKey: 'mocked-public-key',
        privateKey: 'mocked-private-key',
        initialBalance: 10,
      });

      // The private key is in the response, but it is not saved.
      expect(mockRepo.create).toHaveBeenCalledWith({
        accountId: '0.0.9999999',
        publicKey: 'mocked-public-key',
        initialBalance: 10,
      });
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should throw if accountId is null in receipt', async () => {
      const mockTransaction = {
        setKey: jest.fn().mockReturnThis(),
        setInitialBalance: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          getReceipt: jest.fn().mockResolvedValue({
            accountId: null,
          }),
        }),
      };
      const { AccountCreateTransaction } = require('@hashgraph/sdk');
      AccountCreateTransaction.mockImplementation(() => mockTransaction);

      await expect(service.createAccount(5)).rejects.toThrow(
        'Account creation failed: receipt.accountId is null',
      );
    });
  });

  describe('getAccountInfo()', () => {
    it('should fetch account info and return expected structure', async () => {
      const result = await service.getAccountInfo('0.0.12345');

      expect(result).toEqual({
        accountId: '0.0.12345',
        hbarBalance: '100',
        tokenAssociations: ['0.0.111', '0.0.222'],
        balance: { hbar: '100', tinybars: '10000000000' },
        tokens: [
          { tokenId: '0.0.111', symbol: 'AAA', balance: '10' },
          { tokenId: '0.0.222', symbol: 'BBB', balance: '2500' },
        ],
        key: { type: 'ED25519', publicKey: 'mocked-raw-public-key' },
      });
    });

    it('should return the type and the raw public key of an ECDSA key', async () => {
      const { AccountInfoQuery, PublicKey } = require('@hashgraph/sdk');
      AccountInfoQuery.mockImplementationOnce(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          accountId: { toString: () => '0.0.12345' },
          key: new PublicKey('secp256k1', 'mocked-raw-ecdsa-key'),
          balance: {
            toString: () => '100',
            to: () => ({ toFixed: () => '100' }),
            toTinybars: () => ({ toString: () => '10000000000' }),
          },
          tokenRelationships: new Map(),
        }),
      }));

      const result = await service.getAccountInfo('0.0.12345');

      expect(result.key).toEqual({
        type: 'secp256k1',
        publicKey: 'mocked-raw-ecdsa-key',
      });
    });

    it('should return key: null when the key is not a single public key', async () => {
      const { AccountInfoQuery } = require('@hashgraph/sdk');
      AccountInfoQuery.mockImplementationOnce(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          accountId: { toString: () => '0.0.12345' },
          // A list of keys: not a PublicKey.
          key: { toArray: () => [] },
          balance: {
            toString: () => '100',
            to: () => ({ toFixed: () => '100' }),
            toTinybars: () => ({ toString: () => '10000000000' }),
          },
          tokenRelationships: new Map(),
        }),
      }));

      const result = await service.getAccountInfo('0.0.12345');

      expect(result.key).toBeNull();
    });

    it('should let the SDK error through (the global filter maps it)', async () => {
      const { AccountInfoQuery } = require('@hashgraph/sdk');
      AccountInfoQuery.mockImplementation(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest
          .fn()
          .mockRejectedValue(new Error('Simulated SDK failure')),
      }));

      await expect(service.getAccountInfo('0.0.invalid')).rejects.toThrow(
        'Simulated SDK failure',
      );
    });
  });

  describe('transferHbar()', () => {
    it('should transfer Hbar and return transaction summary', async () => {
      const result = await service.transferHbar({
        fromAccountId: '0.0.mocked-from',
        fromPrivateKey: 'mocked-private-key',
        toAccountId: '0.0.to',
        amount: 5,
      });

      expect(result).toEqual({
        status: 'SUCCESS',
        transactionId: 'mocked-tx-id',
        from: '0.0.mocked-from',
        to: '0.0.to',
        amount: '5 ℏ',
        value: 5,
        unit: 'HBAR',
      });
    });

    it('should send the transfer with the shared client and sign it with the key of the sender', async () => {
      const sdk = require('@hashgraph/sdk');

      await service.transferHbar({
        fromAccountId: '0.0.mocked-from',
        fromPrivateKey: 'mocked-private-key',
        toAccountId: '0.0.to',
        amount: 5,
      });

      const transaction = jest
        .mocked(sdk.TransferTransaction)
        .mock.results.at(-1)?.value;
      expect(sdk.PrivateKey.fromString).toHaveBeenCalledWith(
        'mocked-private-key',
      );
      expect(transaction.freezeWith).toHaveBeenCalledWith(mockClient);
      expect(transaction.sign).toHaveBeenCalled();
    });

    it('should read the key with the account of the sender', async () => {
      const spy = jest.spyOn(readPrivateKeyModule, 'readPrivateKey');

      try {
        await service.transferHbar({
          fromAccountId: '0.0.5001',
          fromPrivateKey: 'mocked-private-key',
          toAccountId: '0.0.5002',
          amount: 5,
        });

        expect(spy).toHaveBeenCalledWith(
          mockClient,
          '0.0.5001',
          'mocked-private-key',
        );
      } finally {
        spy.mockRestore();
      }
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountEntity } from './entities/account.entity';

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
    PublicKey: {
      fromString: jest.fn().mockReturnValue({
        toString: () => 'mocked-public-key',
      }),
    },
    Hbar,
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
        balance: { toString: () => '100' },
        tokenRelationships: new Map([
          ['0.0.111', { tokenId: { toString: () => '0.0.111' } }],
          ['0.0.222', { tokenId: { toString: () => '0.0.222' } }],
        ]),
      }),
    })),
    TransferTransaction: jest.fn().mockImplementation(() => ({
      addHbarTransfer: jest.fn().mockReturnThis(),
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
    Client: {
      forTestnet: jest.fn().mockReturnValue({
        setOperator: jest.fn(),
      }),
    },
  };
});

describe('AccountsService', () => {
  let service: AccountsService;

  const mockRepo = {
    create: jest.fn().mockImplementation((data) => data),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
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

      expect(mockRepo.create).toHaveBeenCalledWith(result);
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
      });
    });

    it('should throw if SDK throws inside execute()', async () => {
      const { AccountInfoQuery } = require('@hashgraph/sdk');
      AccountInfoQuery.mockImplementation(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest
          .fn()
          .mockRejectedValue(new Error('Simulated SDK failure')),
      }));

      await expect(service.getAccountInfo('0.0.invalid')).rejects.toThrow(
        'Failed to fetch account info: Error: Simulated SDK failure',
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
      });
    });
  });
});

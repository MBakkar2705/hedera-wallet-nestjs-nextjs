import { Test, TestingModule } from '@nestjs/testing';
import { TokensService } from './tokens.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TokenEntity } from './entities/token.entity';
import { AssociationEntity } from './entities/association.entity';
import { TokenTransferEntity } from './entities/token-transfer.entity';
import { CreateTokenDto } from './dto/create-token.dto';
import { AssociateTokenDto } from './dto/associate-token.dto';
import { TransferTokenDto } from './dto/transfer-token.dto';

jest.mock('@hashgraph/sdk', () => {
  const mockExecuteCreate = jest.fn().mockResolvedValue({
    getReceipt: jest.fn().mockResolvedValue({
      tokenId: { toString: () => '0.0.9999' },
    }),
  });

  const mockExecuteTransfer = jest.fn().mockResolvedValue({
    getReceipt: jest.fn().mockResolvedValue({
      status: { toString: () => 'SUCCESS' },
    }),
    transactionId: { toString: () => 'tx-mocked' },
  });

  const mockExecuteAssociate = jest.fn().mockResolvedValue({
    getReceipt: jest.fn().mockResolvedValue({
      status: { toString: () => 'SUCCESS' },
    }),
  });

  return {
    Client: {
      forTestnet: jest.fn().mockReturnValue({
        setOperator: jest.fn(),
        operatorAccountId: '0.0.operator',
        operatorPublicKey: 'fake-public-key',
      }),
    },
    PrivateKey: {
      fromString: jest.fn().mockReturnValue('mocked-private-key'),
    },
    AccountId: {
      fromString: jest.fn().mockReturnValue('mocked-account-id'),
    },
    TokenId: {
      fromString: jest.fn().mockReturnValue('mocked-token-id'),
    },
    TokenCreateTransaction: jest.fn().mockImplementation(() => ({
      setTokenName: jest.fn().mockReturnThis(),
      setTokenSymbol: jest.fn().mockReturnThis(),
      setInitialSupply: jest.fn().mockReturnThis(),
      setDecimals: jest.fn().mockReturnThis(),
      setTreasuryAccountId: jest.fn().mockReturnThis(),
      setAdminKey: jest.fn().mockReturnThis(),
      freezeWith: jest.fn().mockReturnThis(),
      sign: jest.fn().mockReturnThis(),
      execute: mockExecuteCreate,
    })),
    TokenAssociateTransaction: jest.fn().mockImplementation(() => ({
      setAccountId: jest.fn().mockReturnThis(),
      setTokenIds: jest.fn().mockReturnThis(),
      freezeWith: jest.fn().mockReturnThis(),
      sign: jest.fn().mockReturnThis(),
      execute: mockExecuteAssociate,
    })),
    TransferTransaction: jest.fn().mockImplementation(() => ({
      addTokenTransfer: jest.fn().mockReturnThis(),
      freezeWith: jest.fn().mockReturnThis(),
      sign: jest.fn().mockReturnThis(),
      execute: mockExecuteTransfer,
    })),
    Status: {
      Success: 'SUCCESS',
    },
  };
});

describe('TokensService – full stable test', () => {
  let service: TokensService;

  const mockTokenRepo = { save: jest.fn() };
  const mockAssocRepo = { save: jest.fn() };
  const mockTransferRepo = { save: jest.fn() };

  beforeEach(async () => {
    process.env.OPERATOR_ID = '0.0.operator';
    process.env.OPERATOR_KEY = 'mocked-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        { provide: getRepositoryToken(TokenEntity), useValue: mockTokenRepo },
        {
          provide: getRepositoryToken(AssociationEntity),
          useValue: mockAssocRepo,
        },
        {
          provide: getRepositoryToken(TokenTransferEntity),
          useValue: mockTransferRepo,
        },
      ],
    }).compile();

    service = module.get<TokensService>(TokensService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a token and persist it', async () => {
    const dto: CreateTokenDto = {
      name: 'TestToken',
      symbol: 'TTK',
      initialSupply: 1000,
    };

    const result = await service.createToken(dto);

    expect(result).toEqual({
      tokenId: '0.0.9999',
      name: 'TestToken',
      symbol: 'TTK',
      initialSupply: 1000,
    });

    expect(mockTokenRepo.save).toHaveBeenCalledWith(result);
  });

  it('should throw if operator credentials are missing', async () => {
    delete process.env.OPERATOR_ID;
    delete process.env.OPERATOR_KEY;

    await expect(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TokensService,
          { provide: getRepositoryToken(TokenEntity), useValue: mockTokenRepo },
          {
            provide: getRepositoryToken(AssociationEntity),
            useValue: mockAssocRepo,
          },
          {
            provide: getRepositoryToken(TokenTransferEntity),
            useValue: mockTransferRepo,
          },
        ],
      }).compile();

      module.get<TokensService>(TokensService);
    }).rejects.toThrow('Missing operator credentials in environment variables');
  });

  it('should throw if operator accountId or publicKey is missing', async () => {
    // Simule un client sans credentials internes
    jest.mocked(require('@hashgraph/sdk').Client.forTestnet).mockReturnValue({
      setOperator: jest.fn(),
      operatorAccountId: undefined,
      operatorPublicKey: undefined,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        { provide: getRepositoryToken(TokenEntity), useValue: mockTokenRepo },
        {
          provide: getRepositoryToken(AssociationEntity),
          useValue: mockAssocRepo,
        },
        {
          provide: getRepositoryToken(TokenTransferEntity),
          useValue: mockTransferRepo,
        },
      ],
    }).compile();

    const brokenService = module.get<TokensService>(TokensService);

    const dto: CreateTokenDto = {
      name: 'FailToken',
      symbol: 'FAIL',
      initialSupply: 100,
    };

    await expect(brokenService.createToken(dto)).rejects.toThrow(
      'Operator credentials not properly initialized',
    );
  });

  it('should throw if tokenId is missing in the receipt', async () => {
    jest.mocked(require('@hashgraph/sdk').Client.forTestnet).mockReturnValue({
      setOperator: jest.fn(),
      operatorAccountId: '0.0.operator',
      operatorPublicKey: 'mocked-public-key',
    });

    jest
      .mocked(require('@hashgraph/sdk').TokenCreateTransaction)
      .mockImplementation(() => ({
        setTokenName: jest.fn().mockReturnThis(),
        setTokenSymbol: jest.fn().mockReturnThis(),
        setInitialSupply: jest.fn().mockReturnThis(),
        setDecimals: jest.fn().mockReturnThis(),
        setTreasuryAccountId: jest.fn().mockReturnThis(),
        setAdminKey: jest.fn().mockReturnThis(),
        freezeWith: jest.fn().mockReturnThis(),
        sign: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          getReceipt: jest.fn().mockResolvedValue({ tokenId: null }),
        }),
      }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        { provide: getRepositoryToken(TokenEntity), useValue: mockTokenRepo },
        {
          provide: getRepositoryToken(AssociationEntity),
          useValue: mockAssocRepo,
        },
        {
          provide: getRepositoryToken(TokenTransferEntity),
          useValue: mockTransferRepo,
        },
      ],
    }).compile();

    const service = module.get<TokensService>(TokensService);

    const dto: CreateTokenDto = {
      name: 'MissingTokenId',
      symbol: 'MTK',
      initialSupply: 500,
    };

    await expect(service.createToken(dto)).rejects.toThrow(
      'Token creation failed: tokenId missing in receipt',
    );
  });

  it('should associate token and persist relation', async () => {
    const dto: AssociateTokenDto = {
      accountId: '0.0.5001',
      privateKey: 'mocked-private-key',
      tokenId: '0.0.9999',
    };

    const result = await service.associateToken(dto);

    expect(result).toEqual({
      status: 'SUCCESS',
      accountId: '0.0.5001',
      tokenId: '0.0.9999',
    });

    expect(mockAssocRepo.save).toHaveBeenCalledWith({
      accountId: '0.0.5001',
      tokenId: '0.0.9999',
      status: 'ASSOCIATED',
    });
  });

  it('should throw if token association status is not SUCCESS', async () => {
    jest
      .mocked(require('@hashgraph/sdk').TokenAssociateTransaction)
      .mockImplementation(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        setTokenIds: jest.fn().mockReturnThis(),
        freezeWith: jest.fn().mockReturnThis(),
        sign: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          getReceipt: jest
            .fn()
            .mockResolvedValue({ status: { toString: () => 'FAILED' } }),
        }),
      }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        { provide: getRepositoryToken(TokenEntity), useValue: mockTokenRepo },
        {
          provide: getRepositoryToken(AssociationEntity),
          useValue: mockAssocRepo,
        },
        {
          provide: getRepositoryToken(TokenTransferEntity),
          useValue: mockTransferRepo,
        },
      ],
    }).compile();

    const service = module.get<TokensService>(TokensService);

    const dto: AssociateTokenDto = {
      accountId: '0.0.1234',
      privateKey: 'mocked-private-key',
      tokenId: '0.0.9999',
    };

    await expect(service.associateToken(dto)).rejects.toThrow(
      'Association failed: FAILED',
    );
  });

  it('should transfer tokens and persist transaction', async () => {
    const dto: TransferTokenDto = {
      fromAccountId: '0.0.5001',
      fromPrivateKey: 'mocked-private-key',
      toAccountId: '0.0.5002',
      tokenId: '0.0.9999',
      amount: 42,
    };

    const result = await service.transferToken(dto);

    expect(result).toEqual({
      status: 'SUCCESS',
      transactionId: 'tx-mocked',
      from: '0.0.5001',
      to: '0.0.5002',
      tokenId: '0.0.9999',
      amount: 42,
    });

    expect(mockTransferRepo.save).toHaveBeenCalledWith({
      fromAccountId: '0.0.5001',
      toAccountId: '0.0.5002',
      tokenId: '0.0.9999',
      amount: 42,
      transactionId: 'tx-mocked',
    });
  });
  it('should throw if token transfer status is not SUCCESS', async () => {
    jest
      .mocked(require('@hashgraph/sdk').TransferTransaction)
      .mockImplementation(() => ({
        addTokenTransfer: jest.fn().mockReturnThis(),
        freezeWith: jest.fn().mockReturnThis(),
        sign: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          getReceipt: jest
            .fn()
            .mockResolvedValue({ status: { toString: () => 'REJECTED' } }),
          transactionId: { toString: () => 'tx-failed' },
        }),
      }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        { provide: getRepositoryToken(TokenEntity), useValue: mockTokenRepo },
        {
          provide: getRepositoryToken(AssociationEntity),
          useValue: mockAssocRepo,
        },
        {
          provide: getRepositoryToken(TokenTransferEntity),
          useValue: mockTransferRepo,
        },
      ],
    }).compile();

    const service = module.get<TokensService>(TokensService);

    const dto: TransferTokenDto = {
      fromAccountId: '0.0.5001',
      fromPrivateKey: 'mocked-private-key',
      toAccountId: '0.0.5002',
      tokenId: '0.0.9999',
      amount: 100,
    };

    await expect(service.transferToken(dto)).rejects.toThrow(
      'Token transfer failed: REJECTED',
    );
  });
});

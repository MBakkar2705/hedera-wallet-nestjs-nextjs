import { Test, TestingModule } from '@nestjs/testing';
import { TopicsService } from './topics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TopicEntity } from './entities/topic.entity';
import { MessageEntity } from './entities/message.entity';

jest.mock('@hashgraph/sdk', () => {
  return {
    TopicCreateTransaction: jest.fn().mockImplementation(() => ({
      setTopicMemo: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({
        getReceipt: jest.fn().mockResolvedValue({
          topicId: { toString: () => '0.0.567890' },
        }),
      }),
    })),
    TopicMessageSubmitTransaction: jest.fn().mockImplementation(() => ({
      setTopicId: jest.fn().mockReturnThis(),
      setMessage: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({
        getReceipt: jest.fn().mockResolvedValue({}),
        transactionId: { toString: () => 'tx-topic-123' },
      }),
    })),
    TopicId: {
      fromString: jest.fn().mockReturnValue('mocked-topic-id'),
    },
  };
});

describe('TopicsService', () => {
  let service: TopicsService;

  const mockTopicRepo = {
    save: jest.fn(),
  };

  const mockMessageRepo = {
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockClient = {}; // injected but unused directly

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicsService,
        { provide: getRepositoryToken(TopicEntity), useValue: mockTopicRepo },
        {
          provide: getRepositoryToken(MessageEntity),
          useValue: mockMessageRepo,
        },
        { provide: 'HEDERA_CLIENT', useValue: mockClient },
      ],
    }).compile();

    service = module.get<TopicsService>(TopicsService);
  });

  describe('createTopic()', () => {
    it('should create a topic and persist it', async () => {
      const dto = { memo: 'Test memo' };
      const result = await service.createTopic(dto);

      expect(result).toEqual({
        topicId: '0.0.567890',
        memo: 'Test memo',
      });

      expect(mockTopicRepo.save).toHaveBeenCalledWith({
        topicId: '0.0.567890',
        memo: 'Test memo',
      });
    });

    it('should throw if receipt.topicId is null', async () => {
      const { TopicCreateTransaction } = require('@hashgraph/sdk');
      TopicCreateTransaction.mockImplementation(() => ({
        setTopicMemo: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          getReceipt: jest.fn().mockResolvedValue({
            topicId: null,
          }),
        }),
      }));

      const dto = { memo: 'Empty memo' };

      await expect(service.createTopic(dto)).rejects.toThrow(
        'Topic creation failed: no topicId returned by Hedera.',
      );
    });

    it('should create a topic without memo and persist it', async () => {
      // Remock local pour garantir receipt avec topicId
      const sdk = require('@hashgraph/sdk');
      sdk.TopicCreateTransaction.mockImplementation(() => ({
        setTopicMemo: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          getReceipt: jest.fn().mockResolvedValue({
            topicId: { toString: () => '0.0.567890' },
          }),
        }),
      }));

      const dto = {}; // memo absent

      const result = await service.createTopic(dto);

      expect(result).toEqual({
        topicId: '0.0.567890',
        memo: undefined,
      });

      expect(mockTopicRepo.save).toHaveBeenCalledWith({
        topicId: '0.0.567890',
        memo: undefined,
      });
    });
  });

  describe('sendMessage()', () => {
    it('should send a message and persist it', async () => {
      const topicId = '0.0.567890';
      const dto = { message: 'Hello Hedera' };

      const result = await service.sendMessage(topicId, dto);

      expect(result).toMatchObject({
        topicId: '0.0.567890',
        message: 'Hello Hedera',
        transactionId: 'tx-topic-123',
      });

      expect(typeof result.createdAt).toBe('object');

      expect(mockMessageRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          topicId: '0.0.567890',
          message: 'Hello Hedera',
          transactionId: 'tx-topic-123',
        }),
      );
    });
  });

  describe('getMessages()', () => {
    it('should return messages for a valid topicId', async () => {
      const topicId = '0.0.567890';
      const mockMessages = [
        {
          id: 1,
          topicId,
          message: 'Hello',
          transactionId: 'tx-1',
          createdAt: new Date(),
        },
        {
          id: 2,
          topicId,
          message: 'World',
          transactionId: 'tx-2',
          createdAt: new Date(),
        },
      ];

      mockMessageRepo.find = jest.fn().mockResolvedValue(mockMessages);

      const result = await service.getMessages(topicId);
      expect(result).toEqual(mockMessages);
      expect(mockMessageRepo.find).toHaveBeenCalledWith({
        where: { topicId },
        order: { createdAt: 'ASC' },
      });
    });
    it('should throw NotFoundException if no messages are found', async () => {
      const topicId = '0.0.999999';
      mockMessageRepo.find = jest.fn().mockResolvedValue([]);

      await expect(service.getMessages(topicId)).rejects.toThrow(
        `No messages found for topicId ${topicId}`,
      );
    });
  });
});

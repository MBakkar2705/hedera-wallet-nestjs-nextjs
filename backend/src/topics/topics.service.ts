import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TopicEntity } from './entities/topic.entity';
import { CreateTopicDto } from './dto/create-topic.dto/create-topic.dto';
import { SendMessageDto } from './dto/send-message.dto/send-message.dto';
import {
  Client,
  TopicId,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from '@hashgraph/sdk';
import { MessageEntity } from './entities/message.entity';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(TopicEntity)
    private readonly topicRepo: Repository<TopicEntity>,

    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,

    @Inject('HEDERA_CLIENT')
    private readonly client: Client,
  ) {}

  @ApiOperation({ summary: 'Create a new HCS topic on Hedera' })
  @ApiResponse({ status: 201, description: 'Topic successfully created' })
  @ApiResponse({
    status: 400,
    description: 'Topic creation failed: no topicId returned',
  })
  async createTopic(
    dto: CreateTopicDto,
  ): Promise<{ topicId: string; memo?: string }> {
    const tx = new TopicCreateTransaction();

    if (dto.memo) {
      tx.setTopicMemo(dto.memo);
    }

    const response = await tx.execute(this.client);
    const receipt = await response.getReceipt(this.client);

    const topicIdObj = receipt.topicId;
    if (!topicIdObj) {
      throw new Error('Topic creation failed: no topicId returned by Hedera.');
    }

    const topicId = topicIdObj.toString();
    await this.topicRepo.save({ topicId, memo: dto.memo });

    return { topicId, memo: dto.memo };
  }

  @ApiOperation({ summary: 'Submit a message to an existing HCS topic' })
  @ApiResponse({
    status: 201,
    description: 'Message successfully submitted and persisted',
  })
  @ApiResponse({
    status: 400,
    description: 'Message submission failed (invalid topic or Hedera error)',
  })
  async sendMessage(
    topicId: string,
    dto: SendMessageDto,
  ): Promise<{
    topicId: string;
    message: string;
    transactionId: string;
    createdAt: Date;
  }> {
    const tx = new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(Buffer.from(dto.message, 'utf-8'));

    const response = await tx.execute(this.client);
    await response.getReceipt(this.client); // optional receipt control (can be removed if not needed)

    const transactionId = response.transactionId.toString();
    const createdAt = new Date();

    await this.messageRepo.save({
      topicId,
      message: dto.message,
      transactionId,
      createdAt,
    });

    return {
      topicId,
      message: dto.message,
      transactionId,
      createdAt,
    };
  }
  @ApiOperation({ summary: 'Retrieve all messages for a given HCS topic' })
  @ApiResponse({
    status: 200,
    description: 'Messages successfully retrieved from local persistence',
  })
  @ApiResponse({
    status: 404,
    description: 'No messages found for the given topicId',
  })
  async getMessages(topicId: string): Promise<MessageEntity[]> {
    const messages = await this.messageRepo.find({
      where: { topicId },
      order: { createdAt: 'ASC' },
    });

    if (!messages || messages.length === 0) {
      throw new Error(`No messages found for topicId ${topicId}`);
    }

    return messages;
  }
}

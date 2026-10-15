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

  getMessages(topicId: string): Promise<MessageEntity[]> {
    // A topic without message gives an empty list, not an error.
    return this.messageRepo.find({
      where: { topicId },
      order: { createdAt: 'ASC' },
    });
  }
}

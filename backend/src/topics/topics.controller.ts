import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto/create-topic.dto';
import { SendMessageDto } from './dto/send-message.dto/send-message.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { MessageEntity } from './entities/message.entity';

@ApiTags('topics')
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new HCS topic on Hedera testnet' })
  @ApiBody({ type: CreateTopicDto })
  @ApiResponse({ status: 201, description: 'Topic successfully created' })
  @ApiResponse({
    status: 400,
    description: 'Missing topicId in Hedera receipt',
  })
  create(@Body() dto: CreateTopicDto) {
    return this.topicsService.createTopic(dto);
  }

  @Post(':topicId/messages')
  @ApiOperation({ summary: 'Submit a message to an existing HCS topic' })
  @ApiParam({ name: 'topicId', description: 'Target topic ID on Hedera' })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message successfully submitted and persisted',
  })
  @ApiResponse({
    status: 400,
    description: 'Message submission failed or topic invalid',
  })
  sendMessage(@Param('topicId') topicId: string, @Body() dto: SendMessageDto) {
    return this.topicsService.sendMessage(topicId, dto);
  }

  @ApiOperation({ summary: 'Retrieve all messages for a given HCS topic' })
  @ApiParam({ name: 'topicId', required: true, description: 'Hedera topic ID' })
  @ApiResponse({
    status: 200,
    description: 'Messages successfully retrieved from local persistence',
  })
  @ApiResponse({
    status: 404,
    description: 'No messages found for the given topicId',
  })
  @Get(':topicId/messages')
  getMessages(@Param('topicId') topicId: string): Promise<MessageEntity[]> {
    return this.topicsService.getMessages(topicId);
  }
}

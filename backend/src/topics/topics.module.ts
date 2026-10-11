import { Module } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicEntity } from './entities/topic.entity';
import { MessageEntity } from './entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TopicEntity, MessageEntity])],
  providers: [TopicsService],
  controllers: [TopicsController],
})
export class TopicsModule {}

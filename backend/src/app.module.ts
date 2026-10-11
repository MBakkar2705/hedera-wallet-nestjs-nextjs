import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
//import { AccountEntity } from './accounts/entities/account.entity';
//import { TokenEntity } from './tokens/entities/token.entity';
import { AccountsModule } from './accounts/accounts.module';
import { TokensModule } from './tokens/tokens.module';
import { TopicsModule } from './topics/topics.module';
//import { Client } from '@hashgraph/sdk';
//import { AssociationEntity } from './tokens/entities/association.entity';
//import { TopicEntity } from './topics/entities/topic.entity';
import { HederaModule } from './hedera/hedera.module';
//import { MessageEntity } from './topics/entities/message.entity';

@Module({
  imports: [
    HederaModule,
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'hedera-wallet.db',
      autoLoadEntities: true,
      //      entities: [
      //        AccountEntity,
      //       TokenEntity,
      //        AssociationEntity,
      //        TopicEntity,
      //        MessageEntity
      //      ],
      synchronize: true,
    }),
    AccountsModule,
    TokensModule,
    TopicsModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

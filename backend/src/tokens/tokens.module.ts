import { Module } from '@nestjs/common';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
//import { Client, PrivateKey } from '@hashgraph/sdk';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenEntity } from './entities/token.entity';
import { AssociationEntity } from './entities/association.entity';
import { TokenTransferEntity } from './entities/token-transfer.entity';

//const HEDERA_CLIENT_PROVIDER = {
//  provide: 'HEDERA_CLIENT',
//  useFactory: () => {
//    const client = Client.forTestnet();
//    const operatorKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY!);
//    client.setOperator(process.env.HEDERA_ACCOUNT_ID!, operatorKey);
//    return client;
//  },
//};

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TokenEntity,
      AssociationEntity,
      TokenTransferEntity,
    ]),
  ],
  controllers: [TokensController],
  //  providers: [HEDERA_CLIENT_PROVIDER, TokensService],
  providers: [TokensService],
})
export class TokensModule {}

import { Module } from '@nestjs/common';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenEntity } from './entities/token.entity';
import { AssociationEntity } from './entities/association.entity';
import { TokenTransferEntity } from './entities/token-transfer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TokenEntity,
      AssociationEntity,
      TokenTransferEntity,
    ]),
  ],
  controllers: [TokensController],
  providers: [TokensService],
})
export class TokensModule {}

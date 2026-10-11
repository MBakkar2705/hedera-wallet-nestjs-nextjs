import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Client,
  AccountId,
  PrivateKey,
  TokenCreateTransaction,
  TokenAssociateTransaction,
  TransferTransaction,
  TokenId,
} from '@hashgraph/sdk';

import { CreateTokenDto } from './dto/create-token.dto';
import { AssociateTokenDto } from './dto/associate-token.dto';
import { TransferTokenDto } from './dto/transfer-token.dto';

import { TokenEntity } from './entities/token.entity';
import { AssociationEntity } from './entities/association.entity';
import { TokenTransferEntity } from './entities/token-transfer.entity';

@Injectable()
export class TokensService implements OnModuleDestroy {
  private readonly client: Client;

  constructor(
    @InjectRepository(TokenEntity)
    private readonly tokenRepo: Repository<TokenEntity>,

    @InjectRepository(AssociationEntity)
    private readonly associationRepo: Repository<AssociationEntity>,

    @InjectRepository(TokenTransferEntity)
    private readonly tokenTransferRepo: Repository<TokenTransferEntity>,
  ) {
    const operatorId = process.env.OPERATOR_ID;
    const operatorKey = process.env.OPERATOR_KEY;

    if (!operatorId || !operatorKey) {
      throw new Error('Missing operator credentials in environment variables');
    }

    this.client = Client.forTestnet();
    this.client.setOperator(operatorId, PrivateKey.fromString(operatorKey));
  }

  onModuleDestroy() {
    this.client.close();
  }

  async createToken(dto: CreateTokenDto) {
    const { name, symbol, initialSupply } = dto;

    const operatorAccountId = this.client.operatorAccountId;
    const operatorPublicKey = this.client.operatorPublicKey;

    if (!operatorAccountId || !operatorPublicKey) {
      throw new Error('Operator credentials not properly initialized');
    }

    const transaction = new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setInitialSupply(initialSupply)
      .setDecimals(0)
      .setTreasuryAccountId(operatorAccountId)
      .setAdminKey(operatorPublicKey);

    const txResponse = await transaction.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    if (!receipt.tokenId) {
      throw new Error('Token creation failed: tokenId missing in receipt');
    }

    const tokenId = receipt.tokenId.toString();

    await this.tokenRepo.save({ tokenId, name, symbol, initialSupply });

    return { tokenId, name, symbol, initialSupply };
  }

  async associateToken(dto: AssociateTokenDto) {
    const { accountId, privateKey, tokenId } = dto;

    const transaction = new TokenAssociateTransaction()
      .setAccountId(AccountId.fromString(accountId))
      .setTokenIds([TokenId.fromString(tokenId)]);

    const key = PrivateKey.fromString(privateKey);
    const signedTx = await transaction.freezeWith(this.client).sign(key);

    const txResponse = await signedTx.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    if (receipt.status.toString() !== 'SUCCESS') {
      throw new Error(`Association failed: ${receipt.status.toString()}`);
    }

    await this.associationRepo.save({
      accountId,
      tokenId,
      status: 'ASSOCIATED',
    });

    return { status: receipt.status.toString(), accountId, tokenId };
  }

  async transferToken(dto: TransferTokenDto) {
    const { fromAccountId, fromPrivateKey, toAccountId, tokenId, amount } = dto;

    const transaction = new TransferTransaction()
      .addTokenTransfer(
        TokenId.fromString(tokenId),
        AccountId.fromString(fromAccountId),
        -amount,
      )
      .addTokenTransfer(
        TokenId.fromString(tokenId),
        AccountId.fromString(toAccountId),
        amount,
      );

    const key = PrivateKey.fromString(fromPrivateKey);
    const signedTx = await transaction.freezeWith(this.client).sign(key);

    const txResponse = await signedTx.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    if (receipt.status.toString() !== 'SUCCESS') {
      throw new Error(`Token transfer failed: ${receipt.status.toString()}`);
    }

    await this.tokenTransferRepo.save({
      fromAccountId,
      toAccountId,
      tokenId,
      amount,
      transactionId: txResponse.transactionId.toString(),
    });

    return {
      status: receipt.status.toString(),
      transactionId: txResponse.transactionId.toString(),
      from: fromAccountId,
      to: toAccountId,
      tokenId,
      amount,
    };
  }
}

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountEntity } from './entities/account.entity';
import {
  Client,
  AccountCreateTransaction,
  PrivateKey,
  Hbar,
} from '@hashgraph/sdk';
import { AccountInfoQuery } from '@hashgraph/sdk';
import { TransferHbarDto } from './dto/transfer-hbar.dto';
import {
  TransferTransaction,
  AccountId,
  TransactionReceipt,
} from '@hashgraph/sdk';

@Injectable()
export class AccountsService implements OnModuleDestroy {
  private client: Client;

  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
  ) {
    const operatorId = process.env.HEDERA_ACCOUNT_ID!;
    const operatorKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY!);

    this.client = Client.forTestnet();
    this.client.setOperator(operatorId, operatorKey);
  }

  onModuleDestroy() {
    this.client.close();
  }

  async createAccount(initialBalance: number): Promise<any> {
    const privateKey = PrivateKey.generate();
    const publicKey = privateKey.publicKey;

    const transaction = await new AccountCreateTransaction()
      .setKey(publicKey)
      .setInitialBalance(new Hbar(initialBalance))
      .execute(this.client);

    const receipt = await transaction.getReceipt(this.client);
    const accountId = receipt.accountId?.toString();

    if (!accountId) {
      throw new Error('Account creation failed: receipt.accountId is null');
    }

    const result = {
      accountId,
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- SDK: toString() exists at runtime, missing from .d.ts
      publicKey: publicKey.toString(),
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- SDK: toString() exists at runtime, missing from .d.ts
      privateKey: privateKey.toString(),
      initialBalance,
    };

    await this.saveAccountLocally(result);

    return result;
  }

  async getAccountInfo(accountId: string) {
    try {
      const info = await new AccountInfoQuery()
        .setAccountId(accountId)
        .execute(this.client);

      return {
        accountId: info.accountId.toString(),
        hbarBalance: info.balance.toString(),
        tokenAssociations: Array.from(info.tokenRelationships.values()).map(
          (rel) => rel.tokenId.toString(),
        ),
      };
    } catch (error) {
      throw new Error(`Failed to fetch account info: ${error}`);
    }
  }

  async transferHbar({
    fromAccountId,
    fromPrivateKey,
    toAccountId,
    amount,
  }: TransferHbarDto) {
    const client = Client.forTestnet();

    const senderId = AccountId.fromString(fromAccountId);
    const senderKey = PrivateKey.fromString(fromPrivateKey);
    client.setOperator(senderId, senderKey);

    const tx = await new TransferTransaction()
      .addHbarTransfer(fromAccountId, new Hbar(-amount))
      .addHbarTransfer(toAccountId, new Hbar(amount))
      .execute(client);

    const receipt: TransactionReceipt = await tx.getReceipt(client);

    return {
      status: receipt.status.toString(),
      transactionId: tx.transactionId.toString(),
      from: fromAccountId,
      to: toAccountId,
      amount: `${amount} ℏ`,
    };
  }
  private async saveAccountLocally(data: {
    accountId: string;
    publicKey: string;
    privateKey: string;
    initialBalance: number;
  }) {
    const account = this.accountRepo.create(data);
    await this.accountRepo.save(account);
  }
}

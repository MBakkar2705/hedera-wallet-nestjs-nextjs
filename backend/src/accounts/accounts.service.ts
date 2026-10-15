import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountEntity } from './entities/account.entity';
import {
  AccountCreateTransaction,
  AccountId,
  AccountInfoQuery,
  Client,
  Hbar,
  HbarUnit,
  PrivateKey,
  PublicKey,
  TransactionReceipt,
  TransferTransaction,
} from '@hashgraph/sdk';
import { TransferHbarDto } from './dto/transfer-hbar.dto';

@Injectable()
export class AccountsService {
  constructor(
    // The shared client is closed by HederaModule, not here.
    @Inject('HEDERA_CLIENT') private readonly client: Client,
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
  ) {}

  async createAccount(initialBalance: number): Promise<{
    accountId: string;
    publicKey: string;
    privateKey: string;
    initialBalance: number;
  }> {
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

    // The private key is returned to the caller and never stored.
    await this.saveAccountLocally({
      accountId,
      publicKey: result.publicKey,
      initialBalance,
    });

    return result;
  }

  async getAccountInfo(accountId: string) {
    // Errors are not caught here: HederaExceptionFilter maps them to HTTP.
    const info = await new AccountInfoQuery()
      .setAccountId(accountId)
      .execute(this.client);

    return {
      accountId: info.accountId.toString(),
      hbarBalance: info.balance.toString(),
      tokenAssociations: Array.from(info.tokenRelationships.values()).map(
        (rel) => rel.tokenId.toString(),
      ),
      balance: {
        // toFixed() gives a plain decimal; toString() could use an exponent.
        hbar: info.balance.to(HbarUnit.Hbar).toFixed(),
        tinybars: info.balance.toTinybars().toString(),
      },
      tokens: Array.from(info.tokenRelationships.values()).map((rel) => ({
        tokenId: rel.tokenId.toString(),
        symbol: rel.symbol,
        balance: rel.balance.toString(),
      })),
      // Only a single public key can be compared with a private key.
      // A list of keys, a threshold key or a contract key gives null.
      key:
        info.key instanceof PublicKey
          ? { type: info.key.type, publicKey: info.key.toStringRaw() }
          : null,
    };
  }

  async transferHbar({
    fromAccountId,
    fromPrivateKey,
    toAccountId,
    amount,
  }: TransferHbarDto) {
    const senderId = AccountId.fromString(fromAccountId);
    const senderKey = PrivateKey.fromString(fromPrivateKey);

    // The shared client (the operator account) pays the fees, as for the tokens.
    // The HBAR leave the sender's account, so the sender signs the transfer.
    const transaction = new TransferTransaction()
      .addHbarTransfer(senderId, new Hbar(-amount))
      .addHbarTransfer(toAccountId, new Hbar(amount));

    const signedTx = await transaction.freezeWith(this.client).sign(senderKey);
    const tx = await signedTx.execute(this.client);
    const receipt: TransactionReceipt = await tx.getReceipt(this.client);

    return {
      status: receipt.status.toString(),
      transactionId: tx.transactionId.toString(),
      from: fromAccountId,
      to: toAccountId,
      amount: `${amount} ℏ`,
      value: amount,
      unit: 'HBAR',
    };
  }
  private async saveAccountLocally(data: {
    accountId: string;
    publicKey: string;
    initialBalance: number;
  }) {
    const account = this.accountRepo.create(data);
    await this.accountRepo.save(account);
  }
}

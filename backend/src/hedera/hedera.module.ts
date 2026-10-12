import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Client } from '@hashgraph/sdk';
import { HederaExceptionFilter } from './hedera-exception.filter';

@Global()
@Module({
  providers: [
    {
      provide: 'HEDERA_CLIENT',
      useFactory: () =>
        Client.forTestnet().setOperator(
          process.env.OPERATOR_ID!,
          process.env.OPERATOR_KEY!,
        ),
    },
    // Turns Hedera errors into 404/400 responses, for every route.
    { provide: APP_FILTER, useClass: HederaExceptionFilter },
  ],
  exports: ['HEDERA_CLIENT'],
})
export class HederaModule implements OnModuleDestroy {
  constructor(@Inject('HEDERA_CLIENT') private readonly client: Client) {}

  onModuleDestroy() {
    this.client.close();
  }
}

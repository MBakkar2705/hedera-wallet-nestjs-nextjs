import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Client } from '@hashgraph/sdk';

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
  ],
  exports: ['HEDERA_CLIENT'],
})
export class HederaModule implements OnModuleDestroy {
  constructor(@Inject('HEDERA_CLIENT') private readonly client: Client) {}

  onModuleDestroy() {
    this.client.close();
  }
}

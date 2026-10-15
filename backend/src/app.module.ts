import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabasePath } from './config';
import { AccountsModule } from './accounts/accounts.module';
import { TokensModule } from './tokens/tokens.module';
import { TopicsModule } from './topics/topics.module';
import { HederaModule } from './hedera/hedera.module';

@Module({
  imports: [
    HederaModule,
    // forRootAsync: the path is read when the application starts, not when this file is imported.
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'sqlite',
        database: getDatabasePath(),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    AccountsModule,
    TokensModule,
    TopicsModule,
  ],

  controllers: [AppController],
  providers: [
    AppService,
    // Applies the class-validator decorators of the DTOs to every request body.
    { provide: APP_PIPE, useValue: new ValidationPipe() },
  ],
})
export class AppModule {}

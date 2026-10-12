import {
  Controller,
  Get,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import {
  AccountId,
  PrecheckStatusError,
  Status,
  TransactionId,
} from '@hashgraph/sdk';
import { HederaExceptionFilter } from './hedera-exception.filter';

// Real SDK error class, so the test checks what the SDK really throws.
function precheckError(status: Status) {
  return new PrecheckStatusError({
    status,
    transactionId: TransactionId.generate(AccountId.fromString('0.0.2')),
    nodeId: AccountId.fromString('0.0.3'),
    contractFunctionResult: null,
  });
}

// Routes that only throw, to see what the client receives.
@Controller('boom')
class BoomController {
  @Get('unknown-account')
  unknownAccount(): never {
    throw precheckError(Status.InvalidAccountId);
  }

  @Get('insufficient-balance')
  insufficientBalance(): never {
    throw precheckError(Status.InsufficientPayerBalance);
  }

  @Get('other-status')
  otherStatus(): never {
    throw precheckError(Status.InvalidSignature);
  }

  @Get('malformed-id')
  malformedId(): never {
    throw new Error('failed to parse entity id: abc');
  }

  @Get('http-error')
  httpError(): never {
    throw new NotFoundException('Nothing here');
  }

  @Get('unexpected')
  unexpected(): never {
    throw new Error('Something else broke');
  }
}

describe('HederaExceptionFilter', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BoomController],
      providers: [{ provide: APP_FILTER, useClass: HederaExceptionFilter }],
    }).compile();

    // No logger: the 500 case would print its stack in the test output.
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('maps INVALID_ACCOUNT_ID to 404', async () => {
    const response = await request(app.getHttpServer()).get(
      '/boom/unknown-account',
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      statusCode: 404,
      message: 'Hedera does not know this account (INVALID_ACCOUNT_ID)',
      error: 'Not Found',
    });
  });

  it('maps INSUFFICIENT_PAYER_BALANCE to 400', async () => {
    const response = await request(app.getHttpServer()).get(
      '/boom/insufficient-balance',
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      statusCode: 400,
      message: 'Hedera rejected the request: INSUFFICIENT_PAYER_BALANCE',
      error: 'Bad Request',
    });
  });

  it('maps any other Hedera status to 400 with the status name', async () => {
    const response = await request(app.getHttpServer()).get(
      '/boom/other-status',
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      statusCode: 400,
      message: 'Hedera rejected the request: INVALID_SIGNATURE',
      error: 'Bad Request',
    });
  });

  it('maps a malformed ID to 400', async () => {
    const response = await request(app.getHttpServer()).get(
      '/boom/malformed-id',
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      statusCode: 400,
      message: 'failed to parse entity id: abc',
      error: 'Bad Request',
    });
  });

  it('leaves an HTTP exception unchanged', async () => {
    const response = await request(app.getHttpServer()).get('/boom/http-error');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      statusCode: 404,
      message: 'Nothing here',
      error: 'Not Found',
    });
  });

  it('keeps an unexpected error as a 500 without its message', async () => {
    const response = await request(app.getHttpServer()).get('/boom/unexpected');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});

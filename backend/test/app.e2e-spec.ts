import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { PrivateKey } from '@hashgraph/sdk';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(() => {
    // Throwaway credentials: no .env file needed, and nothing real is used.
    const key = PrivateKey.generateED25519().toStringDer();
    process.env.OPERATOR_ID = '0.0.1';
    process.env.OPERATOR_KEY = key;
    process.env.HEDERA_ACCOUNT_ID = '0.0.1';
    process.env.HEDERA_PRIVATE_KEY = key;
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Welcome to Hedera Wallet API by M. Bakkar!');
  });

  // The body is checked before any call to Hedera, so these tests need no network.
  it('/accounts/transfer (POST) rejects an empty body with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts/transfer')
      .send({});

    expect(response.status).toBe(400);
    const body = response.body as { message: string[] };
    expect(body.message).toContain('fromAccountId must be a string');
  });

  it('/accounts (POST) rejects a negative initial balance with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send({ initialBalance: -1 });

    expect(response.status).toBe(400);
    const body = response.body as { message: string[] };
    expect(body.message).toContain('initialBalance must not be less than 0');
  });

  // The query is checked before any read of the database or call to Hedera.
  it('/tokens (GET) rejects a limit above 100 with 400', async () => {
    const response = await request(app.getHttpServer()).get(
      '/tokens?limit=500',
    );

    expect(response.status).toBe(400);
    const body = response.body as { message: string[] };
    expect(body.message).toContain('limit must not be greater than 100');
  });
});

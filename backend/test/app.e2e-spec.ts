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
});

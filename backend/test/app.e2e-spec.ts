import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { PrivateKey } from '@hashgraph/sdk';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { enableAppCors } from './../src/cors';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let tempDir: string;

  beforeAll(() => {
    // Throwaway credentials: no .env file needed, and nothing real is used.
    const key = PrivateKey.generateED25519().toStringDer();
    process.env.HEDERA_ACCOUNT_ID = '0.0.1';
    process.env.HEDERA_PRIVATE_KEY = key;
    // Fixed here so the CORS tests do not depend on the shell environment.
    process.env.CORS_ORIGIN = 'http://localhost:3001';
    // A throwaway database file: the test never opens the real hedera-wallet.db.
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hedera-wallet-e2e-'));
    process.env.DATABASE_PATH = path.join(tempDir, 'test.db');
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    enableAppCors(app);
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

  it('uses the database file given by DATABASE_PATH', () => {
    expect(fs.existsSync(process.env.DATABASE_PATH as string)).toBe(true);
  });

  it('creates the tables with the expected names', async () => {
    const dataSource = app.get(DataSource);
    const rows = await dataSource.query<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );

    expect(rows.map((row) => row.name)).toEqual([
      'accounts',
      'associations',
      'messages',
      'token_transfers',
      'tokens',
      'topics',
    ]);
  });

  it('keeps no column for a private key in the accounts table', async () => {
    const dataSource = app.get(DataSource);
    const columns = await dataSource.query<{ name: string }[]>(
      "SELECT name FROM pragma_table_info('accounts') ORDER BY cid",
    );
    const names = columns.map((column) => column.name);

    expect(names).toContain('accountId');
    expect(names).not.toContain('privateKey');
  });

  it('/ (GET) sends the configured CORS origin, and never another one', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/')
      .set('Origin', 'http://localhost:3001');
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://localhost:3001',
    );

    const other = await request(app.getHttpServer())
      .get('/')
      .set('Origin', 'http://other.example');
    expect(other.headers['access-control-allow-origin']).not.toBe(
      'http://other.example',
    );
  });

  it('/accounts (OPTIONS) answers a preflight request with 204', async () => {
    const response = await request(app.getHttpServer())
      .options('/accounts')
      .set('Origin', 'http://localhost:3001')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:3001',
    );
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

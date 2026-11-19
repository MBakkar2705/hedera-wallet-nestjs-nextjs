import {
  DEFAULT_CORS_ORIGIN,
  DEFAULT_DATABASE_PATH,
  DEFAULT_MIRROR_NODE_URL,
  DEFAULT_PORT,
  getCorsOrigin,
  getDatabasePath,
  getMirrorNodeUrl,
  getPort,
} from './config';

describe('config', () => {
  const saved = {
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    PORT: process.env.PORT,
    DATABASE_PATH: process.env.DATABASE_PATH,
    MIRROR_NODE_URL: process.env.MIRROR_NODE_URL,
  };

  beforeEach(() => {
    delete process.env.CORS_ORIGIN;
    delete process.env.PORT;
    delete process.env.DATABASE_PATH;
    delete process.env.MIRROR_NODE_URL;
  });

  afterAll(() => {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  describe('getCorsOrigin()', () => {
    it('returns the default origin when CORS_ORIGIN is absent', () => {
      expect(getCorsOrigin()).toBe(DEFAULT_CORS_ORIGIN);
    });

    it('returns the default origin when CORS_ORIGIN is empty', () => {
      process.env.CORS_ORIGIN = '';
      expect(getCorsOrigin()).toBe(DEFAULT_CORS_ORIGIN);
    });

    it('returns CORS_ORIGIN when it is set', () => {
      process.env.CORS_ORIGIN = 'https://wallet.example.com';
      expect(getCorsOrigin()).toBe('https://wallet.example.com');
    });
  });

  describe('getDatabasePath()', () => {
    it('returns the default path when DATABASE_PATH is absent', () => {
      expect(getDatabasePath()).toBe(DEFAULT_DATABASE_PATH);
    });

    it('returns the default path when DATABASE_PATH is empty', () => {
      process.env.DATABASE_PATH = '';
      expect(getDatabasePath()).toBe(DEFAULT_DATABASE_PATH);
    });

    it('returns DATABASE_PATH when it is set', () => {
      process.env.DATABASE_PATH = '/tmp/other.db';
      expect(getDatabasePath()).toBe('/tmp/other.db');
    });
  });

  describe('getPort()', () => {
    it('returns the default port when PORT is absent', () => {
      expect(getPort()).toBe(DEFAULT_PORT);
    });

    it('returns PORT as a number when it is set', () => {
      process.env.PORT = '4000';
      expect(getPort()).toBe(4000);
    });

    it.each(['abc', '0', '70000', '3000.5', '-1'])(
      'throws a clear error for PORT="%s"',
      (value) => {
        process.env.PORT = value;
        expect(() => getPort()).toThrow(`Invalid PORT "${value}"`);
      },
    );
  });

  describe('getMirrorNodeUrl()', () => {
    it('returns the default URL when MIRROR_NODE_URL is absent', () => {
      expect(getMirrorNodeUrl()).toBe(DEFAULT_MIRROR_NODE_URL);
    });

    it('returns the default URL when MIRROR_NODE_URL is empty', () => {
      process.env.MIRROR_NODE_URL = '';
      expect(getMirrorNodeUrl()).toBe(DEFAULT_MIRROR_NODE_URL);
    });

    it('returns the URL given by MIRROR_NODE_URL', () => {
      process.env.MIRROR_NODE_URL = 'https://mirror.example.com';
      expect(getMirrorNodeUrl()).toBe('https://mirror.example.com');
    });
  });
});

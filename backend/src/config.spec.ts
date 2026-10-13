import {
  DEFAULT_CORS_ORIGIN,
  DEFAULT_PORT,
  getCorsOrigin,
  getPort,
} from './config';

describe('config', () => {
  const saved = {
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    PORT: process.env.PORT,
  };

  beforeEach(() => {
    delete process.env.CORS_ORIGIN;
    delete process.env.PORT;
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
});

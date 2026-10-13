// Values read from environment variables, with their defaults.
// Each function reads process.env when it is called, not when the file is imported.

export const DEFAULT_CORS_ORIGIN = 'http://localhost:3001';
export const DEFAULT_PORT = 3000;

// The one origin allowed to call the API from a browser. An empty value gives the default.
export function getCorsOrigin(): string {
  return process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN;
}

// The port the API listens on. An absent or empty value gives the default.
export function getPort(): number {
  const raw = process.env.PORT;
  if (!raw) {
    return DEFAULT_PORT;
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT "${raw}": expected an integer between 1 and 65535`,
    );
  }
  return port;
}

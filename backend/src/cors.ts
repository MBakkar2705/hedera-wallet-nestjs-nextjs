import { INestApplication } from '@nestjs/common';
import { getCorsOrigin } from './config';

// Called by main.ts and by the e2e test, so the test checks the code that runs.
export function enableAppCors(app: INestApplication): void {
  app.enableCors({ origin: getCorsOrigin() });
}

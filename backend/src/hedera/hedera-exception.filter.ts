import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { StatusError } from '@hashgraph/sdk';

// Status Hedera returns for an unknown account.
// Observed on GET /accounts/0.0.99999999.
const UNKNOWN_ACCOUNT_STATUS = 'INVALID_ACCOUNT_ID';

// Message of the error the SDK throws, before any network call, for a
// malformed ID. Observed on GET /accounts/abc. It depends on the SDK wording.
const MALFORMED_ID_MESSAGE = /failed to parse entity id/i;

/**
 * Turns an error from the Hedera SDK into the matching HTTP exception.
 * Returns null when the error is not one we map: the caller keeps it as is.
 */
export function toHttpException(exception: unknown): HttpException | null {
  // Already an HTTP error: nothing to change.
  if (exception instanceof HttpException) {
    return null;
  }

  // Hedera refused the transaction or the query (precheck or receipt).
  if (exception instanceof StatusError) {
    const status = exception.status.toString();

    if (status === UNKNOWN_ACCOUNT_STATUS) {
      return new NotFoundException(
        `Hedera does not know this account (${status})`,
      );
    }
    return new BadRequestException(`Hedera rejected the request: ${status}`);
  }

  // Malformed ID, rejected by the SDK itself.
  if (
    exception instanceof Error &&
    MALFORMED_ID_MESSAGE.test(exception.message)
  ) {
    return new BadRequestException(exception.message);
  }

  return null;
}

// Registered globally in HederaModule. Everything it does not map goes through
// the default Nest behavior (500 with "Internal server error").
@Catch()
export class HederaExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    super.catch(toHttpException(exception) ?? exception, host);
  }
}

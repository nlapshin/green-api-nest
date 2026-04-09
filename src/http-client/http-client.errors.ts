import { AppException } from '../errors/app.exception';
import { ErrorCodes } from '../errors/error-codes';

export class HttpUpstreamException extends AppException {
  constructor(params: {
    statusCode: number;
    message: string;
    exposeMessage?: string;
    details?: unknown[];
  }) {
    const isServer = params.statusCode >= 500;
    super({
      code: isServer
        ? ErrorCodes.UPSTREAM_SERVER_ERROR
        : ErrorCodes.UPSTREAM_CLIENT_ERROR,
      httpStatus: 502,
      message: params.message,
      exposeMessage:
        params.exposeMessage ??
        (isServer
          ? 'Upstream returned a server error'
          : 'Upstream rejected the request'),
      details: params.details,
    });
    this.name = 'HttpUpstreamException';
  }
}

export class HttpTimeoutException extends AppException {
  constructor() {
    super({
      code: ErrorCodes.UPSTREAM_TIMEOUT,
      httpStatus: 504,
      message: 'Upstream request timed out',
      exposeMessage: 'Upstream request timed out',
    });
    this.name = 'HttpTimeoutException';
  }
}

export class HttpNetworkException extends AppException {
  constructor(cause?: unknown) {
    super({
      code: ErrorCodes.UPSTREAM_NETWORK_ERROR,
      httpStatus: 502,
      message: 'Network error calling upstream',
      exposeMessage: 'Failed to reach upstream service',
      cause,
    });
    this.name = 'HttpNetworkException';
  }
}

export class HttpInvalidResponseException extends AppException {
  constructor(message = 'Invalid upstream response') {
    super({
      code: ErrorCodes.UPSTREAM_INVALID_RESPONSE,
      httpStatus: 502,
      message,
      exposeMessage: 'Upstream returned an unexpected response',
    });
    this.name = 'HttpInvalidResponseException';
  }
}

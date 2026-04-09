import { AppException } from '../errors/app.exception';
import { ErrorCodes } from '../errors/error-codes';

export class HttpUpstreamException extends AppException {
  readonly upstreamHttpStatus: number;

  constructor(params: {
    statusCode: number;
    message: string;
    exposeMessage?: string;
    details?: unknown[];
  }) {
    const status = params.statusCode;
    const is429 = status === 429;
    const isServer = status >= 500;
    const code = is429
      ? ErrorCodes.UPSTREAM_RATE_LIMIT
      : isServer
        ? ErrorCodes.UPSTREAM_SERVER_ERROR
        : ErrorCodes.UPSTREAM_CLIENT_ERROR;
    super({
      code,
      httpStatus: 502,
      message: params.message,
      exposeMessage:
        params.exposeMessage ??
        (is429
          ? 'Upstream rate limited the request'
          : isServer
            ? 'Upstream returned a server error'
            : 'Upstream rejected the request'),
      details: params.details ?? [{ upstreamStatus: status }],
    });
    this.name = 'HttpUpstreamException';
    this.upstreamHttpStatus = status;
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

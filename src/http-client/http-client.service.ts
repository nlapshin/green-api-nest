import { Inject, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { setTimeout as sleep } from 'node:timers/promises';
import type { Dispatcher } from 'undici';
import { Agent, request } from 'undici';
import { ConfigService } from '../config/config.service';
import { MetricsService } from '../metrics/metrics.service';
import {
  HttpNetworkException,
  HttpTimeoutException,
  HttpUpstreamException,
} from './http-client.errors';
import { computeBackoffMs, shouldRetryOutboundError } from './retry-policy';
import {
  HTTP_CLIENT_DISPATCHER,
  type HttpClientCallResult,
  type HttpClientExecuteParams,
} from './http-client.types';

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; code?: string };
  return e.name === 'AbortError' || e.code === 'ABORT_ERR';
}

function isUndiciTimeout(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string };
  return (
    e.code === 'UND_ERR_HEADERS_TIMEOUT' ||
    e.code === 'UND_ERR_BODY_TIMEOUT' ||
    e.code === 'UND_ERR_CONNECT_TIMEOUT'
  );
}

function combineSignals(
  timeoutMs: number,
  inbound?: AbortSignal,
): { signal: AbortSignal; cancelTimeout: () => void } {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
  const cancelTimeout = () => clearTimeout(timer);
  if (!inbound) {
    return { signal: timeoutController.signal, cancelTimeout };
  }
  return {
    signal: AbortSignal.any([inbound, timeoutController.signal]),
    cancelTimeout,
  };
}

function outboundTerminalReason(err: unknown): string {
  if (err instanceof HttpTimeoutException) return 'timeout';
  if (err instanceof HttpNetworkException) return 'network';
  if (err instanceof HttpUpstreamException) {
    if (err.upstreamHttpStatus === 429) return 'rate_limit';
    if (err.upstreamHttpStatus >= 500) return 'server_error';
    return 'client_error';
  }
  return 'unknown';
}

@Injectable()
export class HttpClientService implements OnModuleDestroy {
  private readonly dispatcher: Dispatcher;
  private readonly ownsDispatcher: boolean;

  constructor(
    @InjectPinoLogger(HttpClientService.name) private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
    @Optional() @Inject(HTTP_CLIENT_DISPATCHER) injectedDispatcher?: Dispatcher,
    @Optional() private readonly metrics?: MetricsService,
  ) {
    if (injectedDispatcher) {
      this.dispatcher = injectedDispatcher;
      this.ownsDispatcher = false;
    } else {
      this.dispatcher = new Agent({
        connections: 64,
        keepAliveTimeout: 30_000,
        keepAliveMaxTimeout: 600_000,
      });
      this.ownsDispatcher = true;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.ownsDispatcher && this.dispatcher instanceof Agent) {
      await this.dispatcher.close();
    }
  }

  async execute(params: HttpClientExecuteParams): Promise<HttpClientCallResult> {
    const maxAttempts = Math.max(1, this.configService.outboundRetryMaxAttempts);
    const retryOn429 = this.configService.outboundRetryOn429;
    const target = params.metricsTarget ?? 'green_api';
    const operation = params.metricsOperation;
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        return await this.executeOnce(params);
      } catch (err) {
        lastError = err;
        const canRetry = shouldRetryOutboundError(
          err,
          attempt,
          maxAttempts,
          retryOn429,
        );
        if (!canRetry) {
          this.metrics?.recordOutboundTerminalError(
            target,
            operation,
            outboundTerminalReason(err),
          );
          throw err;
        }
        if (params.inboundSignal?.aborted) {
          this.metrics?.recordOutboundTerminalError(
            target,
            operation,
            'cancelled',
          );
          throw err;
        }
        const waitMs = computeBackoffMs({
          attemptIndex: attempt - 1,
          initialMs: this.configService.outboundRetryInitialMs,
          maxMs: this.configService.outboundRetryMaxMs,
          jitterRatio: this.configService.outboundRetryJitter,
        });
        try {
          if (params.inboundSignal) {
            await sleep(waitMs, { signal: params.inboundSignal });
          } else {
            await sleep(waitMs);
          }
        } catch {
          this.metrics?.recordOutboundTerminalError(
            target,
            operation,
            'cancelled',
          );
          throw lastError;
        }
      }
    }

    this.metrics?.recordOutboundTerminalError(
      target,
      operation,
      outboundTerminalReason(lastError),
    );
    throw lastError;
  }

  private async executeOnce(
    params: HttpClientExecuteParams,
  ): Promise<HttpClientCallResult> {
    const {
      url,
      safeUrlForLog,
      method,
      jsonBody,
      timeoutMs,
      logScope,
      logContext,
      exposeUpstreamError,
      requestId,
      inboundSignal,
    } = params;
    const target = params.metricsTarget ?? 'green_api';
    const operation = params.metricsOperation;
    const started = performance.now();
    const { signal, cancelTimeout } = combineSignals(timeoutMs, inboundSignal);

    const logBase = {
      outbound: true,
      requestId,
      ...logContext,
    };

    try {
      this.logger.info(
        {
          ...logBase,
          method,
          url: safeUrlForLog,
        },
        `${logScope} request start`,
      );

      const headers: Record<string, string> = {
        accept: 'application/json, text/plain;q=0.9,*/*;q=0.8',
        ...(method === 'POST'
          ? { 'content-type': 'application/json; charset=utf-8' }
          : {}),
      };
      if (requestId) {
        headers['x-request-id'] = requestId;
      }

      const res = await request(url, {
        method,
        dispatcher: this.dispatcher,
        signal,
        headers,
        body: method === 'POST' && jsonBody ? JSON.stringify(jsonBody) : undefined,
        headersTimeout: timeoutMs,
        bodyTimeout: timeoutMs,
      });

      const text = await res.body.text();
      const contentType =
        (res.headers['content-type'] as string | undefined) ?? null;
      const durationMs = Math.round(performance.now() - started);

      this.logger.info(
        {
          ...logBase,
          statusCode: res.statusCode,
          durationMs,
        },
        `${logScope} request end`,
      );

      if (res.statusCode < 200 || res.statusCode >= 300) {
        this.logger.warn(
          {
            ...logBase,
            statusCode: res.statusCode,
            durationMs,
          },
          `${logScope} non-success status`,
        );
        throw new HttpUpstreamException({
          statusCode: res.statusCode,
          message: `${logScope} HTTP ${res.statusCode}`,
          exposeMessage:
            exposeUpstreamError ?? 'Upstream returned an error',
          details: [{ upstreamStatus: res.statusCode }],
        });
      }

      return {
        statusCode: res.statusCode,
        payload: this.parseBody(text),
        contentType,
      };
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - started);

      if (inboundSignal?.aborted && !isUndiciTimeout(err)) {
        this.logger.warn(
          { ...logBase, durationMs },
          `${logScope} inbound cancelled`,
        );
        throw new HttpTimeoutException();
      }

      if (signal.aborted || isAbortError(err)) {
        this.logger.warn(
          { ...logBase, durationMs },
          `${logScope} request aborted (timeout)`,
        );
        throw new HttpTimeoutException();
      }

      if (isUndiciTimeout(err)) {
        this.logger.warn(
          { ...logBase, durationMs },
          `${logScope} undici timeout`,
        );
        throw new HttpTimeoutException();
      }

      if (err instanceof HttpUpstreamException) {
        throw err;
      }

      this.logger.error(
        { err, ...logBase, durationMs },
        `${logScope} transport error`,
      );
      throw new HttpNetworkException(err);
    } finally {
      cancelTimeout();
      const durationSec = (performance.now() - started) / 1000;
      this.metrics?.recordOutboundAttempt(target, operation, durationSec);
    }
  }

  private parseBody(text: string): unknown {
    if (text.length === 0) {
      return null;
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { rawText: text };
    }
  }
}

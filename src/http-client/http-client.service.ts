import { Inject, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Dispatcher } from 'undici';
import { Agent, request } from 'undici';
import {
  HttpNetworkException,
  HttpTimeoutException,
  HttpUpstreamException,
} from './http-client.errors';
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

@Injectable()
export class HttpClientService implements OnModuleDestroy {
  private readonly dispatcher: Dispatcher;
  private readonly ownsDispatcher: boolean;

  constructor(
    @InjectPinoLogger(HttpClientService.name) private readonly logger: PinoLogger,
    @Optional() @Inject(HTTP_CLIENT_DISPATCHER) injectedDispatcher?: Dispatcher,
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
    const {
      url,
      safeUrlForLog,
      method,
      jsonBody,
      timeoutMs,
      logScope,
      logContext,
      exposeUpstreamError,
    } = params;
    const started = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      this.logger.info(
        {
          outbound: true,
          method,
          url: safeUrlForLog,
          ...logContext,
        },
        `${logScope} request start`,
      );

      const res = await request(url, {
        method,
        dispatcher: this.dispatcher,
        signal: controller.signal,
        headers: {
          accept: 'application/json, text/plain;q=0.9,*/*;q=0.8',
          ...(method === 'POST'
            ? { 'content-type': 'application/json; charset=utf-8' }
            : {}),
        },
        body: method === 'POST' && jsonBody ? JSON.stringify(jsonBody) : undefined,
        headersTimeout: timeoutMs,
        bodyTimeout: timeoutMs,
      });

      const durationMs = Math.round(performance.now() - started);
      const text = await res.body.text();
      const contentType =
        (res.headers['content-type'] as string | undefined) ?? null;

      this.logger.info(
        {
          outbound: true,
          statusCode: res.statusCode,
          durationMs,
          ...logContext,
        },
        `${logScope} request end`,
      );

      if (res.statusCode < 200 || res.statusCode >= 300) {
        this.logger.warn(
          {
            outbound: true,
            statusCode: res.statusCode,
            bodyChars: Math.min(text.length, 2048),
            ...logContext,
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

      if (controller.signal.aborted || isAbortError(err)) {
        this.logger.warn(
          { outbound: true, durationMs, ...logContext },
          `${logScope} request aborted (timeout)`,
        );
        throw new HttpTimeoutException();
      }

      if (isUndiciTimeout(err)) {
        this.logger.warn(
          { outbound: true, durationMs, ...logContext },
          `${logScope} undici timeout`,
        );
        throw new HttpTimeoutException();
      }

      if (err instanceof HttpUpstreamException) {
        throw err;
      }

      this.logger.error(
        { err, outbound: true, durationMs, ...logContext },
        `${logScope} transport error`,
      );
      throw new HttpNetworkException(err);
    } finally {
      clearTimeout(timer);
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

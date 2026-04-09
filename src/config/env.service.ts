import { Injectable } from '@nestjs/common';
import { bool, cleanEnv, num, port, str, url } from 'envalid';

export type NodeEnv = 'development' | 'test' | 'production';
export type LogLevel =
  | 'fatal'
  | 'error'
  | 'warn'
  | 'info'
  | 'debug'
  | 'trace'
  | 'silent';

export interface ValidatedEnv {
  readonly NODE_ENV: NodeEnv;
  readonly PORT: number;
  readonly HOST: string;
  readonly DEFAULT_API_URL: string;
  readonly LOG_LEVEL: LogLevel;
  readonly REQUEST_TIMEOUT_MS: number;
  readonly TRUST_PROXY: boolean;
  readonly INBOUND_REQUEST_TIMEOUT_MS: number;
  readonly OUTBOUND_RETRY_MAX_ATTEMPTS: number;
  readonly OUTBOUND_RETRY_INITIAL_MS: number;
  readonly OUTBOUND_RETRY_MAX_MS: number;
  readonly OUTBOUND_RETRY_JITTER: number;
  readonly OUTBOUND_RETRY_ON_429: boolean;
}

@Injectable()
export class EnvService {
  private cachedEnv: ValidatedEnv | null = null;

  get env(): ValidatedEnv {
    if (!this.cachedEnv) {
      this.cachedEnv = this.load();
    }

    return this.cachedEnv;
  }

  get nodeEnv(): NodeEnv {
    return this.env.NODE_ENV;
  }

  get port(): number {
    return this.env.PORT;
  }

  get host(): string {
    return this.env.HOST;
  }

  get defaultApiUrl(): string {
    return this.env.DEFAULT_API_URL;
  }

  get logLevel(): LogLevel {
    return this.env.LOG_LEVEL;
  }

  get requestTimeoutMs(): number {
    return this.env.REQUEST_TIMEOUT_MS;
  }

  get trustProxy(): boolean {
    return this.env.TRUST_PROXY;
  }

  get inboundRequestTimeoutMs(): number {
    return this.env.INBOUND_REQUEST_TIMEOUT_MS;
  }

  get outboundRetryMaxAttempts(): number {
    return this.env.OUTBOUND_RETRY_MAX_ATTEMPTS;
  }

  get outboundRetryInitialMs(): number {
    return this.env.OUTBOUND_RETRY_INITIAL_MS;
  }

  get outboundRetryMaxMs(): number {
    return this.env.OUTBOUND_RETRY_MAX_MS;
  }

  get outboundRetryJitter(): number {
    return this.env.OUTBOUND_RETRY_JITTER;
  }

  get outboundRetryOn429(): boolean {
    return this.env.OUTBOUND_RETRY_ON_429;
  }

  resetCacheForTests(): void {
    this.cachedEnv = null;
  }

  private load(): ValidatedEnv {
    const nodeEnv = str<NodeEnv>({
      choices: ['development', 'test', 'production'],
      default: 'development',
      desc: 'Application environment',
    });

    const logLevel = str<LogLevel>({
      choices: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      desc: 'Pino log level',
    });

    const env = cleanEnv(process.env, {
      NODE_ENV: nodeEnv,
      PORT: port({ default: 3000 }),
      HOST: str({ default: '0.0.0.0' }),
      DEFAULT_API_URL: url({ default: 'https://api.greenapi.com' }),
      LOG_LEVEL: logLevel,
      REQUEST_TIMEOUT_MS: num({
        default: 30_000,
        desc: 'Outbound HTTP timeout per attempt (ms)',
      }),
      TRUST_PROXY: bool({
        default: false,
        desc: 'Trust X-Forwarded-* when behind a reverse proxy',
      }),
      INBOUND_REQUEST_TIMEOUT_MS: num({
        default: 120_000,
        desc: 'Inbound request idle timeout (ms); 0 = disabled (Fastify default)',
      }),
      OUTBOUND_RETRY_MAX_ATTEMPTS: num({
        default: 3,
        desc: 'Total outbound attempts (including the first) for retryable failures',
      }),
      OUTBOUND_RETRY_INITIAL_MS: num({
        default: 100,
        desc: 'Initial backoff base (ms) before exponential growth',
      }),
      OUTBOUND_RETRY_MAX_MS: num({
        default: 5000,
        desc: 'Backoff ceiling (ms)',
      }),
      OUTBOUND_RETRY_JITTER: num({
        default: 0.3,
        desc: 'Jitter as a fraction of the capped backoff (0–1)',
      }),
      OUTBOUND_RETRY_ON_429: bool({
        default: true,
        desc: 'Retry outbound calls when upstream returns HTTP 429',
      }),
    });

    return {
      NODE_ENV: env.NODE_ENV,
      PORT: env.PORT,
      HOST: env.HOST,
      DEFAULT_API_URL: env.DEFAULT_API_URL,
      LOG_LEVEL: env.LOG_LEVEL,
      REQUEST_TIMEOUT_MS: env.REQUEST_TIMEOUT_MS,
      TRUST_PROXY: env.TRUST_PROXY,
      INBOUND_REQUEST_TIMEOUT_MS: env.INBOUND_REQUEST_TIMEOUT_MS,
      OUTBOUND_RETRY_MAX_ATTEMPTS: env.OUTBOUND_RETRY_MAX_ATTEMPTS,
      OUTBOUND_RETRY_INITIAL_MS: env.OUTBOUND_RETRY_INITIAL_MS,
      OUTBOUND_RETRY_MAX_MS: env.OUTBOUND_RETRY_MAX_MS,
      OUTBOUND_RETRY_JITTER: env.OUTBOUND_RETRY_JITTER,
      OUTBOUND_RETRY_ON_429: env.OUTBOUND_RETRY_ON_429,
    };
  }
}

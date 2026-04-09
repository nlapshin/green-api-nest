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
        desc: 'Outbound HTTP timeout (ms)',
      }),
      TRUST_PROXY: bool({
        default: false,
        desc: 'Trust X-Forwarded-* when behind a reverse proxy',
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
    };
  }
}

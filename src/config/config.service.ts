import { Injectable } from '@nestjs/common';
import { EnvService, type LogLevel, type NodeEnv } from './env.service';

export interface IConfig {
  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly host: string;
  readonly defaultApiUrl: string;
  readonly logLevel: LogLevel;
  readonly requestTimeoutMs: number;
  readonly trustProxy: boolean;
}

@Injectable()
export class ConfigService {
  constructor(private readonly envService: EnvService) { }

  get config(): IConfig {
    return {
      nodeEnv: this.envService.nodeEnv,
      port: this.envService.port,
      host: this.envService.host,
      defaultApiUrl: this.envService.defaultApiUrl.replace(/\/+$/, ''),
      logLevel: this.envService.logLevel,
      requestTimeoutMs: this.envService.requestTimeoutMs,
      trustProxy: this.envService.trustProxy,
    };
  }

  get nodeEnv(): NodeEnv {
    return this.config.nodeEnv;
  }

  get port(): number {
    return this.config.port;
  }

  get host(): string {
    return this.config.host;
  }

  get defaultApiUrl(): string {
    return this.config.defaultApiUrl;
  }

  get logLevel(): LogLevel {
    return this.config.logLevel;
  }

  get requestTimeoutMs(): number {
    return this.config.requestTimeoutMs;
  }

  get trustProxy(): boolean {
    return this.config.trustProxy;
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}

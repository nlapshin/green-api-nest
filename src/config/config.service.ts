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
  readonly inboundRequestTimeoutMs: number;
  readonly outboundRetryMaxAttempts: number;
  readonly outboundRetryInitialMs: number;
  readonly outboundRetryMaxMs: number;
  readonly outboundRetryJitter: number;
  readonly outboundRetryOn429: boolean;
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
      inboundRequestTimeoutMs: this.envService.inboundRequestTimeoutMs,
      outboundRetryMaxAttempts: this.envService.outboundRetryMaxAttempts,
      outboundRetryInitialMs: this.envService.outboundRetryInitialMs,
      outboundRetryMaxMs: this.envService.outboundRetryMaxMs,
      outboundRetryJitter: this.envService.outboundRetryJitter,
      outboundRetryOn429: this.envService.outboundRetryOn429,
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

  get inboundRequestTimeoutMs(): number {
    return this.config.inboundRequestTimeoutMs;
  }

  get outboundRetryMaxAttempts(): number {
    return this.config.outboundRetryMaxAttempts;
  }

  get outboundRetryInitialMs(): number {
    return this.config.outboundRetryInitialMs;
  }

  get outboundRetryMaxMs(): number {
    return this.config.outboundRetryMaxMs;
  }

  get outboundRetryJitter(): number {
    return this.config.outboundRetryJitter;
  }

  get outboundRetryOn429(): boolean {
    return this.config.outboundRetryOn429;
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

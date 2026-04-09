import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry } from 'prom-client';

const DEFAULT_TARGET = 'green_api';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  private readonly inboundRequests: Counter<'method' | 'route'>;
  private readonly inboundDuration: Histogram<'method' | 'route'>;
  private readonly outboundRequests: Counter<'target' | 'operation'>;
  private readonly outboundDuration: Histogram<'target' | 'operation'>;
  private readonly outboundErrors: Counter<'target' | 'operation' | 'reason'>;

  constructor() {
    this.inboundRequests = new Counter({
      name: 'gateway_inbound_requests_total',
      help: 'Count of inbound HTTP requests handled by the gateway',
      labelNames: ['method', 'route'],
      registers: [this.registry],
    });
    this.inboundDuration = new Histogram({
      name: 'gateway_inbound_request_duration_seconds',
      help: 'Inbound request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
    this.outboundRequests = new Counter({
      name: 'gateway_outbound_requests_total',
      help: 'Count of outbound upstream HTTP attempts',
      labelNames: ['target', 'operation'],
      registers: [this.registry],
    });
    this.outboundDuration = new Histogram({
      name: 'gateway_outbound_request_duration_seconds',
      help: 'Outbound upstream request duration in seconds (per attempt)',
      labelNames: ['target', 'operation'],
      buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 15, 30, 60],
      registers: [this.registry],
    });
    this.outboundErrors = new Counter({
      name: 'gateway_outbound_errors_total',
      help: 'Final outbound failures after retries (terminal errors)',
      labelNames: ['target', 'operation', 'reason'],
      registers: [this.registry],
    });
  }

  get metricsContentType(): string {
    return this.registry.contentType;
  }

  async scrapeText(): Promise<string> {
    return this.registry.metrics();
  }

  recordInboundRequest(method: string, route: string): void {
    this.inboundRequests.inc({ method, route });
  }

  observeInboundDuration(
    method: string,
    route: string,
    durationSeconds: number,
  ): void {
    this.inboundDuration.observe({ method, route }, durationSeconds);
  }

  recordOutboundAttempt(
    target: string | undefined,
    operation: string,
    durationSeconds: number,
  ): void {
    const t = target ?? DEFAULT_TARGET;
    this.outboundRequests.inc({ target: t, operation });
    this.outboundDuration.observe({ target: t, operation }, durationSeconds);
  }

  recordOutboundTerminalError(
    target: string | undefined,
    operation: string,
    reason: string,
  ): void {
    const t = target ?? DEFAULT_TARGET;
    this.outboundErrors.inc({ target: t, operation, reason });
  }
}

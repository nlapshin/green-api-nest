import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { HealthController } from '../src/health.controller';
import { ConfigModule } from '../src/config/config.module';
import { GreenApiModule } from '../src/green-api/green-api.module';
import { InboundMetricsInterceptor } from '../src/metrics/inbound-metrics.interceptor';
import { MetricsModule } from '../src/metrics/metrics.module';

@Module({
  imports: [
    ConfigModule,
    MetricsModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: 'silent',
        autoLogging: false,
      },
    }),
    GreenApiModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: InboundMetricsInterceptor,
    },
  ],
})
export class E2eAppModule {}

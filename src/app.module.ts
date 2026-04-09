import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { GreenApiModule } from './green-api/green-api.module';
import { AppLoggingModule } from './logging/logging.module';
import { HealthController } from './health.controller';
import { InboundMetricsInterceptor } from './metrics/inbound-metrics.interceptor';
import { MetricsModule } from './metrics/metrics.module';
import { UiController } from './ui.controller';

@Module({
  imports: [ConfigModule, AppLoggingModule, MetricsModule, GreenApiModule],
  controllers: [HealthController, UiController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: InboundMetricsInterceptor,
    },
  ],
})
export class AppModule {}

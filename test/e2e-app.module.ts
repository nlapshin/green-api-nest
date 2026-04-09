import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { HealthController } from '../src/health.controller';
import { ConfigModule } from '../src/config/config.module';
import { GreenApiModule } from '../src/green-api/green-api.module';

/**
 * Slim app surface for e2e: no Handlebars/static plugins, minimal pino-http.
 */
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: 'silent',
        autoLogging: false,
      },
    }),
    GreenApiModule,
  ],
  controllers: [HealthController],
})
export class E2eAppModule {}

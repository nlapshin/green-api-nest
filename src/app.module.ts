import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { GreenApiModule } from './green-api/green-api.module';
import { AppLoggingModule } from './logging/logging.module';
import { HealthController } from './health.controller';
import { UiController } from './ui.controller';

@Module({
  imports: [ConfigModule, AppLoggingModule, GreenApiModule],
  controllers: [HealthController, UiController],
})
export class AppModule {}

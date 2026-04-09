import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { EnvService } from './env.service';

@Global()
@Module({
  providers: [EnvService, ConfigService],
  exports: [EnvService, ConfigService],
})
export class ConfigModule { }

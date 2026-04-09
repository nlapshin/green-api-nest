import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { createPinoLoggerOptions } from './logging.config';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createPinoLoggerOptions,
    }),
  ],
  exports: [PinoLoggerModule],
})
export class AppLoggingModule { }

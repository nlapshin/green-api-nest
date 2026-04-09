import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { HttpClientService } from './http-client.service';

@Module({
  imports: [ConfigModule],
  providers: [HttpClientService],
  exports: [HttpClientService],
})
export class HttpClientModule {}

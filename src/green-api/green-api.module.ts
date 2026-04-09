import { Module } from '@nestjs/common';
import { HttpClientModule } from '../http-client/http-client.module';
import { GreenApiClient } from './green-api.client';
import { GreenApiController } from './green-api.controller';
import { GreenApiService } from './green-api.service';

@Module({
  imports: [HttpClientModule],
  controllers: [GreenApiController],
  providers: [GreenApiClient, GreenApiService],
  exports: [GreenApiClient, GreenApiService],
})
export class GreenApiModule {}

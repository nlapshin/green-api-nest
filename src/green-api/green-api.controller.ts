import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { ResponseEnvelopeInterceptor } from '../response/response-envelope.interceptor';
import { ZodValidationPipe } from '../validation/zod-validation.pipe';
import {
  getSettingsBodySchema,
  getStateInstanceBodySchema,
  sendFileByUrlBodySchema,
  sendMessageBodySchema,
  type GetSettingsBody,
  type GetStateInstanceBody,
  type SendFileByUrlBody,
  type SendMessageBody,
} from './green-api.schemas';
import { GreenApiService } from './green-api.service';

@Controller('api/v1/green-api')
@UseInterceptors(ResponseEnvelopeInterceptor)
export class GreenApiController {
  constructor(private readonly greenApi: GreenApiService) {}

  @Post('get-settings')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(getSettingsBodySchema))
  async getSettings(@Body() body: GetSettingsBody) {
    return this.greenApi.getSettings(body);
  }

  @Post('get-state-instance')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(getStateInstanceBodySchema))
  async getStateInstance(@Body() body: GetStateInstanceBody) {
    return this.greenApi.getStateInstance(body);
  }

  @Post('send-message')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(sendMessageBodySchema))
  async sendMessage(@Body() body: SendMessageBody) {
    return this.greenApi.sendMessage(body);
  }

  @Post('send-file-by-url')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(sendFileByUrlBodySchema))
  async sendFileByUrl(@Body() body: SendFileByUrlBody) {
    return this.greenApi.sendFileByUrl(body);
  }
}

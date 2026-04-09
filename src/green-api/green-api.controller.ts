import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  createInboundAbortSignal,
  getRequestIdForMeta,
} from '../logging/request-id';
import { ResponseEnvelopeInterceptor } from '../response/response-envelope.interceptor';
import { ZodValidationPipe } from '../validation/zod-validation.pipe';
import type { GreenApiCallContext } from './green-api-context';
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

  private callContext(req: FastifyRequest): GreenApiCallContext {
    return {
      requestId: getRequestIdForMeta(req),
      signal: createInboundAbortSignal(req),
    };
  }

  @Post('get-settings')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(getSettingsBodySchema))
  async getSettings(@Body() body: GetSettingsBody, @Req() req: FastifyRequest) {
    return this.greenApi.getSettings(body, this.callContext(req));
  }

  @Post('get-state-instance')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(getStateInstanceBodySchema))
  async getStateInstance(
    @Body() body: GetStateInstanceBody,
    @Req() req: FastifyRequest,
  ) {
    return this.greenApi.getStateInstance(body, this.callContext(req));
  }

  @Post('send-message')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(sendMessageBodySchema))
  async sendMessage(@Body() body: SendMessageBody, @Req() req: FastifyRequest) {
    return this.greenApi.sendMessage(body, this.callContext(req));
  }

  @Post('send-file-by-url')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(sendFileByUrlBodySchema))
  async sendFileByUrl(
    @Body() body: SendFileByUrlBody,
    @Req() req: FastifyRequest,
  ) {
    return this.greenApi.sendFileByUrl(body, this.callContext(req));
  }
}

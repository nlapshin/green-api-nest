import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { HttpClientService } from '../http-client/http-client.service';
import type { HttpClientCallResult } from '../http-client/http-client.types';
import type { GreenApiCallContext } from './green-api-context';
import { toSendFileByUrlUpstream, toSendMessageUpstream } from './green-api.mapper';
import { maskUrlSensitive } from './mask-secret';
import type {
  GetSettingsBody,
  GetStateInstanceBody,
  SendFileByUrlBody,
  SendMessageBody,
} from './green-api.schemas';

@Injectable()
export class GreenApiClient {
  constructor(
    private readonly configService: ConfigService,
    private readonly http: HttpClientService,
  ) {}

  async getSettings(
    body: GetSettingsBody,
    ctx: GreenApiCallContext,
  ): Promise<HttpClientCallResult> {
    return this.call(
      {
        httpMethod: 'GET',
        idInstance: body.idInstance,
        apiTokenInstance: body.apiTokenInstance,
        pathMethod: 'getSettings',
      },
      ctx,
    );
  }

  async getStateInstance(
    body: GetStateInstanceBody,
    ctx: GreenApiCallContext,
  ): Promise<HttpClientCallResult> {
    return this.call(
      {
        httpMethod: 'GET',
        idInstance: body.idInstance,
        apiTokenInstance: body.apiTokenInstance,
        pathMethod: 'getStateInstance',
      },
      ctx,
    );
  }

  async sendMessage(
    body: SendMessageBody,
    ctx: GreenApiCallContext,
  ): Promise<HttpClientCallResult> {
    return this.call(
      {
        httpMethod: 'POST',
        idInstance: body.idInstance,
        apiTokenInstance: body.apiTokenInstance,
        pathMethod: 'sendMessage',
        jsonBody: toSendMessageUpstream(body),
      },
      ctx,
    );
  }

  async sendFileByUrl(
    body: SendFileByUrlBody,
    ctx: GreenApiCallContext,
  ): Promise<HttpClientCallResult> {
    return this.call(
      {
        httpMethod: 'POST',
        idInstance: body.idInstance,
        apiTokenInstance: body.apiTokenInstance,
        pathMethod: 'sendFileByUrl',
        jsonBody: toSendFileByUrlUpstream(body),
      },
      ctx,
    );
  }

  private buildUrl(pathMethod: string, idInstance: string, token: string): string {
    const base = this.configService.defaultApiUrl.replace(/\/+$/, '');
    return `${base}/waInstance${idInstance}/${pathMethod}/${token}`;
  }

  private async call(
    params: {
      httpMethod: 'GET' | 'POST';
      idInstance: string;
      apiTokenInstance: string;
      pathMethod: string;
      jsonBody?: Record<string, string>;
    },
    ctx: GreenApiCallContext,
  ): Promise<HttpClientCallResult> {
    const url = this.buildUrl(
      params.pathMethod,
      params.idInstance,
      params.apiTokenInstance,
    );
    return this.http.execute({
      url,
      safeUrlForLog: maskUrlSensitive(url),
      method: params.httpMethod,
      jsonBody: params.jsonBody,
      timeoutMs: this.configService.requestTimeoutMs,
      logScope: 'GREEN-API',
      logContext: {
        pathMethod: params.pathMethod,
        idInstance: params.idInstance,
        method: params.httpMethod,
      },
      metricsOperation: params.pathMethod,
      metricsTarget: 'green_api',
      requestId: ctx.requestId,
      inboundSignal: ctx.signal,
      exposeUpstreamError: 'GREEN-API returned an error',
    });
  }
}

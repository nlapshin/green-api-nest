import { Injectable } from '@nestjs/common';
import { GreenApiClient } from './green-api.client';
import type {
  GetSettingsBody,
  GetStateInstanceBody,
  SendFileByUrlBody,
  SendMessageBody,
} from './green-api.schemas';

export interface GreenApiGatewayResponse {
  readonly upstreamStatusCode: number;
  readonly contentType: string | null;
  readonly body: unknown;
}

@Injectable()
export class GreenApiService {
  constructor(private readonly client: GreenApiClient) {}

  async getSettings(body: GetSettingsBody): Promise<GreenApiGatewayResponse> {
    const res = await this.client.getSettings(body);
    return this.toGatewayResponse(res);
  }

  async getStateInstance(
    body: GetStateInstanceBody,
  ): Promise<GreenApiGatewayResponse> {
    const res = await this.client.getStateInstance(body);
    return this.toGatewayResponse(res);
  }

  async sendMessage(body: SendMessageBody): Promise<GreenApiGatewayResponse> {
    const res = await this.client.sendMessage(body);
    return this.toGatewayResponse(res);
  }

  async sendFileByUrl(
    body: SendFileByUrlBody,
  ): Promise<GreenApiGatewayResponse> {
    const res = await this.client.sendFileByUrl(body);
    return this.toGatewayResponse(res);
  }

  private toGatewayResponse(result: {
    statusCode: number;
    contentType: string | null;
    payload: unknown;
  }): GreenApiGatewayResponse {
    return {
      upstreamStatusCode: result.statusCode,
      contentType: result.contentType,
      body: result.payload,
    };
  }
}

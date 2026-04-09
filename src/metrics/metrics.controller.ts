import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { MetricsService } from './metrics.service';

@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('/metrics')
  @Header('Cache-Control', 'no-store')
  async scrape(@Res() reply: FastifyReply): Promise<void> {
    const body = await this.metricsService.scrapeText();
    reply.type(this.metricsService.metricsContentType);
    await reply.send(body);
  }
}

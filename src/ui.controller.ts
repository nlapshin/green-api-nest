import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

@Controller()
export class UiController {
  @Get('/')
  @Header('Cache-Control', 'no-store')
  async index(@Res() reply: FastifyReply) {
    return reply.view('index', {
      apiBase: '/api/v1/green-api',
    });
  }
}

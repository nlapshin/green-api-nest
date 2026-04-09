import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import type { FastifyRequest, RawRequestDefaultExpression } from 'fastify';
import handlebars from 'handlebars';
import { Logger as PinoNestLogger } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './exceptions/http-exception.filter';
import { getOrCreateRequestId, getRequestIdForMeta } from './logging/request-id';
import { ConfigService } from './config/config.service';
import { EnvService } from './config/env.service';

async function bootstrap() {
  const configService = new ConfigService(new EnvService());
  const config = configService.config;

  const adapter = new FastifyAdapter({
    logger: false,
    bodyLimit: 65_536,
    trustProxy: config.trustProxy,
    requestIdHeader: 'x-request-id',
    genReqId: (req: RawRequestDefaultExpression) =>
      getOrCreateRequestId(req.headers, () => randomUUID()),
    ...(config.inboundRequestTimeoutMs > 0
      ? { requestTimeout: config.inboundRequestTimeoutMs }
      : {}),
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { bufferLogs: true },
  );

  app.useLogger(app.get(PinoNestLogger));
  app.useGlobalFilters(new GlobalExceptionFilter());

  const fastify = app.getHttpAdapter().getInstance();

  fastify.addHook('onSend', (request, reply, _payload, done) => {
    reply.header('x-request-id', getRequestIdForMeta(request as FastifyRequest));
    done();
  });

  await fastify.register(helmet as never, {
    global: true,
    contentSecurityPolicy: configService.isProduction,
  });

  await fastify.register(compress as never, { global: true });

  const publicPath = join(__dirname, '..', 'public');
  await fastify.register(fastifyStatic as never, {
    root: publicPath,
    prefix: '/static/',
    decorateReply: false,
  });

  const viewsPath = join(__dirname, '..', 'views');
  await fastify.register(fastifyView as never, {
    engine: { handlebars },
    root: viewsPath,
    includeViewExtension: true,
  });

  app.enableShutdownHooks();

  const logger = app.get(PinoNestLogger);
  logger.log(
    {
      port: config.port,
      host: config.host,
      nodeEnv: config.nodeEnv,
      trustProxy: config.trustProxy,
      defaultApiHost: new URL(config.defaultApiUrl).host,
      inboundRequestTimeoutMs: config.inboundRequestTimeoutMs,
      bodyLimitBytes: 65_536,
      outboundRetryMaxAttempts: config.outboundRetryMaxAttempts,
    },
    'application bootstrapped',
  );

  await app.listen(config.port, config.host);
  logger.log(`HTTP server listening on ${config.host}:${config.port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

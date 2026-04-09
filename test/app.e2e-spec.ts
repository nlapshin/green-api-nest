import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import { GlobalExceptionFilter } from '../src/exceptions/http-exception.filter';
import { GreenApiClient } from '../src/green-api/green-api.client';
import { GreenApiService } from '../src/green-api/green-api.service';
import { getRequestIdForMeta } from '../src/logging/request-id';
import { E2eAppModule } from './e2e-app.module';

const validToken = 'x'.repeat(24);

describe('App (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [E2eAppModule],
    })
      .overrideProvider(GreenApiClient)
      .useValue({
        getSettings: jest.fn(),
        getStateInstance: jest.fn(),
        sendMessage: jest.fn(),
        sendFileByUrl: jest.fn(),
        onModuleDestroy: jest.fn(),
      })
      .overrideProvider(GreenApiService)
      .useValue({
        getSettings: jest.fn().mockResolvedValue({
          upstreamStatusCode: 200,
          contentType: 'application/json',
          body: { mocked: true },
        }),
        getStateInstance: jest.fn(),
        sendMessage: jest.fn(),
        sendFileByUrl: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    const fastify = app.getHttpAdapter().getInstance();
    fastify.addHook('onSend', (request, reply, _payload, done) => {
      reply.header('x-request-id', getRequestIdForMeta(request as FastifyRequest));
      done();
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/healthz (GET)', async () => {
    const fastify = app.getHttpAdapter().getInstance();
    const res = await fastify.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      status: string;
      version: string;
      kind: string;
    };
    expect(body.status).toBe('live');
    expect(body.kind).toBe('liveness');
    expect(body.version).toBeDefined();
  });

  it('GET /metrics returns Prometheus text', async () => {
    const fastify = app.getHttpAdapter().getInstance();
    const res = await fastify.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text/);
    expect(res.body).toContain('gateway_inbound_requests_total');
  });

  it('POST /api/v1/green-api/get-settings validation failure', async () => {
    const fastify = app.getHttpAdapter().getInstance();
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/v1/green-api/get-settings',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({
        idInstance: '12',
        apiTokenInstance: 'short',
      }),
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as {
      success: boolean;
      error: { code: string; details?: Array<{ field: string }> };
      meta: { requestId: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.meta.requestId).toBeDefined();
    expect(body.error.details?.[0]?.field).toBeDefined();
  });

  it('POST /api/v1/green-api/get-settings happy path (mocked upstream)', async () => {
    const fastify = app.getHttpAdapter().getInstance();
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/v1/green-api/get-settings',
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'e2e-req-1',
      },
      payload: JSON.stringify({
        idInstance: '123456',
        apiTokenInstance: validToken,
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success: boolean;
      data: { body: unknown };
      meta: { requestId: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.body).toEqual({ mocked: true });
    expect(body.meta.requestId).toBe('e2e-req-1');
    expect(res.headers['x-request-id']).toBe('e2e-req-1');
  });
});

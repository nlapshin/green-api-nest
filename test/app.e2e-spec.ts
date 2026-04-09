import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { GlobalExceptionFilter } from '../src/exceptions/http-exception.filter';
import { GreenApiClient } from '../src/green-api/green-api.client';
import { GreenApiService } from '../src/green-api/green-api.service';
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
    const body = JSON.parse(res.body) as { status: string; version: string };
    expect(body.status).toBe('live');
    expect(body.version).toBeDefined();
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
      error: { code: string };
      meta: { requestId: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.meta.requestId).toBeDefined();
  });

  it('POST /api/v1/green-api/get-settings happy path (mocked upstream)', async () => {
    const fastify = app.getHttpAdapter().getInstance();
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/v1/green-api/get-settings',
      headers: { 'content-type': 'application/json' },
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
    expect(body.meta.requestId).toBeDefined();
  });
});

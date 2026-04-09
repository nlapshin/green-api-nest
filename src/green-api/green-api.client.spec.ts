import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';
import type { IConfig } from '../config/config.service';
import { ConfigService } from '../config/config.service';
import {
  HttpNetworkException,
  HttpUpstreamException,
} from '../http-client/http-client.errors';
import { HttpClientService } from '../http-client/http-client.service';
import { GreenApiClient } from './green-api.client';

const validToken = 't'.repeat(24);

function baseConfig(overrides: Partial<IConfig> = {}): IConfig {
  return {
    nodeEnv: 'test',
    port: 3000,
    host: '0.0.0.0',
    defaultApiUrl: 'https://api.greenapi.com',
    logLevel: 'silent',
    requestTimeoutMs: 2000,
    trustProxy: false,
    ...overrides,
  };
}

function mockConfigService(overrides: Partial<IConfig> = {}): ConfigService {
  const c = baseConfig(overrides);
  return {
    get defaultApiUrl() {
      return c.defaultApiUrl;
    },
    get requestTimeoutMs() {
      return c.requestTimeoutMs;
    },
  } as unknown as ConfigService;
}

function mockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as import('nestjs-pino').PinoLogger;
}

function createClient(
  config: ConfigService,
  agent: MockAgent,
): GreenApiClient {
  const http = new HttpClientService(mockLogger(), agent);
  return new GreenApiClient(config, http);
}

describe('GreenApiClient', () => {
  let previousDispatcher: ReturnType<typeof getGlobalDispatcher>;
  let agent: MockAgent;

  beforeEach(() => {
    previousDispatcher = getGlobalDispatcher();
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
  });

  afterEach(async () => {
    await agent.close();
    setGlobalDispatcher(previousDispatcher);
  });

  it('returns JSON payload on 2xx', async () => {
    const pool = agent.get('https://api.greenapi.com');
    pool
      .intercept({
        path: '/waInstance123456/getSettings/' + validToken,
        method: 'GET',
      })
      .reply(200, { ok: true, nested: { a: 1 } });

    const client = createClient(mockConfigService(), agent);
    const res = await client.getSettings({
      idInstance: '123456',
      apiTokenInstance: validToken,
    });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ ok: true, nested: { a: 1 } });
  });

  it('maps upstream 4xx to HttpUpstreamException', async () => {
    const pool = agent.get('https://api.greenapi.com');
    pool
      .intercept({
        path: '/waInstance123456/getSettings/' + validToken,
        method: 'GET',
      })
      .reply(401, { error: 'unauthorized' });

    const client = createClient(mockConfigService(), agent);
    await expect(
      client.getSettings({
        idInstance: '123456',
        apiTokenInstance: validToken,
      }),
    ).rejects.toBeInstanceOf(HttpUpstreamException);
  });

  it('maps upstream 5xx to HttpUpstreamException', async () => {
    const pool = agent.get('https://api.greenapi.com');
    pool
      .intercept({
        path: '/waInstance123456/getSettings/' + validToken,
        method: 'GET',
      })
      .reply(503, 'bad');

    const client = createClient(mockConfigService(), agent);
    await expect(
      client.getSettings({
        idInstance: '123456',
        apiTokenInstance: validToken,
      }),
    ).rejects.toBeInstanceOf(HttpUpstreamException);
  });

  it('falls back to rawText when body is not JSON', async () => {
    const pool = agent.get('https://api.greenapi.com');
    pool
      .intercept({
        path: '/waInstance123456/getSettings/' + validToken,
        method: 'GET',
      })
      .reply(200, 'plain-text-not-json', {
        headers: { 'content-type': 'text/plain' },
      });

    const client = createClient(mockConfigService(), agent);
    const res = await client.getSettings({
      idInstance: '123456',
      apiTokenInstance: validToken,
    });

    expect(res.payload).toEqual({ rawText: 'plain-text-not-json' });
  });

  it('throws HttpNetworkException on connection failure', async () => {
    const client = createClient(
      mockConfigService({ defaultApiUrl: 'http://127.0.0.1:1' }),
      agent,
    );

    await expect(
      client.getSettings({
        idInstance: '123456',
        apiTokenInstance: validToken,
      }),
    ).rejects.toBeInstanceOf(HttpNetworkException);
  });
});

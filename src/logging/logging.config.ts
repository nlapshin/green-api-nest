import type { Params } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ConfigService } from '../config/config.service';
import { getOrCreateRequestId } from './request-id';

type RequestWithId = IncomingMessage & { id?: string };
type ResponseWithStatus = ServerResponse & { statusCode: number };

function pathOnly(url: string | undefined): string {
  if (!url) {
    return '';
  }
  return url.split('?')[0] ?? url;
}

export function createPinoLoggerOptions(config: ConfigService): Params {
  const prettyTransport = config.isDevelopment
    ? {
      transport: {
        target: 'pino-pretty',
        options: {
          singleLine: true,
          colorize: true,
        },
      },
    }
    : {};

  return {
    pinoHttp: {
      level: config.logLevel,
      genReqId: (req) =>
        getOrCreateRequestId(req.headers, () => randomUUID()),
      customProps: (req) => ({
        requestId: (req as RequestWithId).id,
      }),
      serializers: {
        req: serializeRequest,
        res: serializeResponse,
      },
      autoLogging: {
        ignore: (req) => {
          const p = pathOnly(req.url);
          return (
            p === '/healthz' ||
            p === '/readyz' ||
            p === '/metrics'
          );
        },
      },
    },
    pino: {
      level: config.logLevel,
      ...prettyTransport,
    },
  } as Params;
}

function serializeRequest(req: IncomingMessage) {
  const request = req as RequestWithId;

  return {
    id: request.id,
    method: request.method,
    url: request.url,
  };
}

function serializeResponse(res: ServerResponse) {
  const response = res as ResponseWithStatus;

  return {
    statusCode: response.statusCode,
  };
}

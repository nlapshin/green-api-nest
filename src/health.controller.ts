import { Controller, Get } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const appVersion = (
  JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
  ) as { version: string }
).version;

@Controller()
export class HealthController {
  @Get('/healthz')
  liveness() {
    return {
      status: 'live',
      kind: 'liveness',
      version: appVersion,
    };
  }

  @Get('/readyz')
  readiness() {
    return {
      status: 'ready',
      kind: 'readiness',
      checks: {},
    };
  }
}

import { Injectable, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ZodValidationException } from './zod-validation.exception';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ZodValidationException(result.error.issues);
    }
    return result.data;
  }
}

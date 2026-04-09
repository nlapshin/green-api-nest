export interface ApiSuccessEnvelope<T = unknown> {
  success: true;
  data: T;
  meta: { requestId: string };
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
  meta: { requestId: string };
}

export type ApiEnvelope<T = unknown> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export function successEnvelope<T>(
  data: T,
  requestId: string,
): ApiSuccessEnvelope<T> {
  return { success: true, data, meta: { requestId } };
}

export type ApiErrorInput = {
  code: string;
  message: string;
  details?: unknown[];
};

export function errorEnvelope(
  requestId: string,
  err: ApiErrorInput,
): ApiErrorEnvelope {
  const error =
    err.details !== undefined
      ? { code: err.code, message: err.message, details: err.details }
      : { code: err.code, message: err.message };
  return { success: false, error, meta: { requestId } };
}

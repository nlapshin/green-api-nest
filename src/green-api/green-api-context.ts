export interface GreenApiCallContext {
  readonly requestId: string;
  readonly signal: AbortSignal;
}

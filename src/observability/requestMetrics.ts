export type RequestCompletedLogFields = {
  requestId: string;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
};

export function buildRequestCompletedLogFields(input: {
  requestId: string;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
}): RequestCompletedLogFields {
  return {
    requestId: input.requestId,
    method: input.method,
    route: input.route,
    statusCode: input.statusCode,
    durationMs: Math.round(input.durationMs * 100) / 100,
  };
}

import { NextResponse } from 'next/server';

export class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

export const badRequest = (msg: string) => new ApiError(400, msg);
export const unauthorized = (msg: string) => new ApiError(401, msg);
export const forbidden = (msg: string) => new ApiError(403, msg);
export const notFound = (msg: string) => new ApiError(404, msg);
export const conflict = (msg: string) => new ApiError(409, msg);

const ERROR_LABEL: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { message: err.message, statusCode: err.statusCode, error: ERROR_LABEL[err.statusCode] ?? 'Error' },
      { status: err.statusCode },
    );
  }
  console.error('[api]', err);
  return NextResponse.json(
    { message: 'Internal server error', statusCode: 500, error: 'Internal Server Error' },
    { status: 500 },
  );
}

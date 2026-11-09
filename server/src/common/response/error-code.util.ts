import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

/** 机器可读的错误码，前端据此分支处理。 */
export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ErrorMeta {
  /** HTTP 状态码（失败时作为响应体里的 code，同时设置到 HTTP 响应状态） */
  readonly code: number;
  readonly errorCode: string;
}

/**
 * 把任意异常解析为 { code, errorCode }。
 * 子类异常必须在父类 `HttpException` 之前判定，否则会被父类兜底吞掉。
 */
export function resolveErrorMeta(exception: unknown): ErrorMeta {
  if (exception instanceof NotFoundException) {
    return { code: 404, errorCode: ErrorCode.NOT_FOUND };
  }
  if (exception instanceof ConflictException) {
    return { code: 409, errorCode: ErrorCode.CONFLICT };
  }
  if (exception instanceof ForbiddenException) {
    return { code: 403, errorCode: ErrorCode.FORBIDDEN };
  }
  if (exception instanceof UnauthorizedException) {
    return { code: 401, errorCode: ErrorCode.UNAUTHORIZED };
  }
  if (exception instanceof BadRequestException) {
    return { code: 400, errorCode: ErrorCode.BAD_REQUEST };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return { code: status, errorCode: `HTTP_${status}` };
  }
  return { code: 500, errorCode: ErrorCode.INTERNAL_ERROR };
}

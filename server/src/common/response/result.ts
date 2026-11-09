/**
 * 统一响应对象。
 *
 * 设计要点：
 * - 成功体只含 `code/data/timestamp`（分页额外 `meta`），**不**带 `error/errorCode`；
 * - 失败体含 `code/data(null)/error/errorCode/timestamp`；
 * - `code === 0` 表示成功，失败时 `code` 为 HTTP 状态码；
 * - 泛型仅作用于成功体的 `data`，失败体 `data` 恒为 `null`。
 */
export const SUCCESS_CODE = 0;

export interface SuccessResult<T> {
  readonly code: typeof SUCCESS_CODE;
  readonly data: T;
  readonly timestamp: string;
}

export interface PaginatedResult<T> extends SuccessResult<T[]> {
  readonly meta: Record<string, unknown>;
}

export interface FailResult {
  readonly code: number;
  readonly data: null;
  readonly error: string;
  readonly errorCode: string;
  readonly timestamp: string;
}

export class Result {
  private constructor() {}

  static success<T>(data: T): SuccessResult<T> {
    return {
      code: SUCCESS_CODE,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static successPaginated<T>(
    data: T[],
    meta: Record<string, unknown>,
  ): PaginatedResult<T> {
    return {
      code: SUCCESS_CODE,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
  }

  static fail(error: string, errorCode: string, code: number): FailResult {
    return {
      code,
      data: null,
      error,
      errorCode,
      timestamp: new Date().toISOString(),
    };
  }
}

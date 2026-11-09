import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { resolveErrorMeta } from './error-code.util';
import { Result } from './result';

/**
 * 全局异常过滤器（失败路径）：把任意异常格式化为统一失败信封。
 *
 * - HttpException：按异常类型解析 code/errorCode（见 resolveErrorMeta），
 *   message 若为校验错误数组则 join 成单个字符串；HTTP 响应状态同步设置为 code。
 * - 非 Http 异常：落完整堆栈日志，对外只返回脱敏的 500/INTERNAL_ERROR。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const { code, errorCode } = resolveErrorMeta(exception);
      const message = this.extractMessage(exception);
      response.status(code).json(Result.fail(message, errorCode, code));
      return;
    }

    this.logger.error(
      `未处理异常 ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    response
      .status(500)
      .json(Result.fail('服务器内部错误', 'INTERNAL_ERROR', 500));
  }

  /** 从 HttpException.getResponse() 提取人类可读信息；校验错误数组 join 成字符串。 */
  private extractMessage(exception: HttpException): string {
    const res = exception.getResponse();
    if (typeof res === 'string') {
      return res;
    }
    if (res && typeof res === 'object') {
      const msg = (res as { message?: unknown }).message;
      if (Array.isArray(msg)) {
        return msg
          .filter((m) => typeof m === 'string' && m.length > 0)
          .join('; ');
      }
      if (typeof msg === 'string' && msg.length > 0) {
        return msg;
      }
    }
    return exception.message;
  }
}

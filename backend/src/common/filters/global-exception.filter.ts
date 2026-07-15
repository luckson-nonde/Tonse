import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let detail = '';

    if (exception instanceof HttpException) {
      // HttpException messages are intentionally client-facing (e.g.
      // "Invalid credentials", "PIN must be exactly 4 digits") — safe to
      // pass through as-is regardless of environment.
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || message;
      detail = (res as any).detail || '';
    } else if (exception instanceof Error) {
      // Anything that reaches here is unexpected — a raw DB error, a bug,
      // etc. Its .message can contain internal detail (SQL, file paths,
      // stack-adjacent info) that must never reach the client outside dev.
      this.logger.error(exception.stack);
      message =
        process.env.NODE_ENV === 'production' ? 'Internal server error' : exception.message;
    }

    response.status(status).json({
      statusCode: status,
      message,
      detail,
      timestamp: new Date().toISOString(),
    });
  }
}

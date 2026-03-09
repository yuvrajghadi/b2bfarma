import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      
      this.logger.warn(`HTTP ${status} Error: ${request.method} ${request.url}`);
      this.logger.warn(`Exception: ${exception.message}`);
      
      return response.status(status).json({
        statusCode: status,
        path: request.url,
        timestamp: new Date().toISOString(),
        error: payload,
      });
    }

    // Log full error details for 500 errors
    this.logger.error(`❌ INTERNAL ERROR: ${request.method} ${request.url}`);
    this.logger.error(`Exception type: ${exception?.constructor?.name}`);
    
    if (exception instanceof Error) {
      this.logger.error(`Message: ${exception.message}`);
      this.logger.error(`Stack trace:\n${exception.stack}`);
    } else {
      this.logger.error(`Exception details: ${JSON.stringify(exception, null, 2)}`);
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    return response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      error: 'Internal server error',
    });
  }
}

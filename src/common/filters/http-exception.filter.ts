import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3111',
  'https://quick-order-dashboard-red.vercel.app',
  'https://quick-order-frontend.vercel.app',
  'https://qr-client-kappa.vercel.app',
];

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Đảm bảo CORS headers luôn được gửi, kể cả khi có exception
    const origin = request.headers.origin as string;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      message = (errorResponse as any).message || exception.message;
    } else if ((exception as any).code === 11000) {
      status = HttpStatus.CONFLICT;
      message = 'Dữ liệu đã tồn tại (Duplicate Key Error)';
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

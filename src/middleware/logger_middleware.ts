import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: any, res: Response, next: NextFunction) {
    const logger = new Logger(LoggerMiddleware.name);

    // التحقق مما إذا كان الطلب يحتوي على ملفات (multipart) لتجنب استهلاك الـ body
    const contentType = req.headers['content-type'];
    if (contentType && contentType.includes('multipart/form-data')) {
      logger.log(`[${req.method}] ${req.url} - Multipart request (Body parsing skipped)`);
    } else {
      // فقط في الطلبات العادية نقوم بطباعة الـ body
      console.log('from middleware request body is', req.body as any);
      logger.log(`[${req.method}] ${req.url}`);
    }
    
    next();
  }
}
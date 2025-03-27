import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: any, res: Response, next: NextFunction) {
    const logger = new Logger(LoggerMiddleware.name)
    console.log('from middleware request body is', req.body as any);
    logger.log(`[${req.method}] ${req.url}`);
    next(); // Call the next middleware or controller
  }
}
/**
 * API Version Middleware for NestJS Backend
 * Currently supports v1 only
 * 
 * Usage in AppModule:
 * 
 * import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
 * import { ApiVersionMiddleware } from './common/middleware/api-version.middleware';
 * 
 * @Module({ imports: [...] })
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(ApiVersionMiddleware).forRoutes('*');
 *   }
 * }
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface VersionedRequest extends Request {
  apiVersion: string;
}

const API_VERSION = 'v1';

@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  use(req: VersionedRequest, res: Response, next: NextFunction) {
    // Set API version on request
    req.apiVersion = API_VERSION;
    
    // Add version to response headers
    res.setHeader('X-API-Version', API_VERSION);
    
    next();
  }
}

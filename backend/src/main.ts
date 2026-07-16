import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as cors from 'cors';
import * as path from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Configure payload size limits (for large file uploads and base64 images).
  //
  // `verify` stashes the RAW request body before JSON parsing. PSP webhooks are
  // signed over the exact bytes sent, so re-serialising the parsed object can
  // never reproduce the signature (key order and whitespace differ). Without
  // this, webhook signatures are unverifiable — i.e. anyone who knows the URL
  // could post a "payment succeeded" event and mint escrow.
  app.use(
    express.json({
      limit: '50mb',
      verify: (req: any, _res, buf: Buffer) => {
        if (buf?.length) req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Security — must run BEFORE express.static. express.static ends the
  // response directly for any matched file without calling next(), so any
  // middleware registered after it (helmet included) never touches
  // static/uploaded-file responses.
  app.use(helmet());

  // Serve static files from public directory
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Production origins come from CORS_ORIGINS (comma-separated, e.g. the Render
  // static-site URL). Falls back to the local dev ports when unset.
  const corsOrigins =
    process.env.NODE_ENV === 'production'
      ? (process.env.CORS_ORIGINS || '')
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3002',
          'http://localhost:5173',
        ];
  app.enableCors({
    // The Render blueprint wires CORS_ORIGINS from the frontend service's
    // `host` (no scheme); prepend https:// so it matches the browser Origin.
    origin: corsOrigins.map((o) => (/^https?:\/\//.test(o) ? o : `https://${o}`)),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  const port = configService.get('PORT') || 3001;
  await app.listen(port);

  console.log(`✅ Application is running on: http://localhost:${port}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV}`);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});

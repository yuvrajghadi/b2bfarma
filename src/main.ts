import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './modules/users/user.entity';
import { RolesService } from './modules/roles/roles.service';
import { seedAdminUser } from './modules/users/admin.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Security middleware
  app.use(helmet());

  // Allow large JSON payloads (for payments/webhooks etc.)
  app.use(
    json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
      limit: '2mb',
    }),
  );

  app.use(
    urlencoded({
      extended: true,
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
      limit: '2mb',
    }),
  );

  // Enable CORS for mobile app / frontend
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global error filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Seed admin user on startup
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const rolesService = app.get(RolesService);
  await seedAdminUser(userRepository, rolesService);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database URL: ${process.env.DATABASE_URL}`);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});
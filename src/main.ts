import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.set('trust proxy', 1);
  // Update CORS options
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://quick-order-dashboard-red.vercel.app',
      'https://quick-order-frontend.vercel.app'
    ],
    credentials: true,
  });

  app.use(cookieParser());

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quick-order';
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'quick-order-secret-key',
      resave: false,
      saveUninitialized: true, // Tạo session cho cả khách chưa đăng nhập (để order sau này)
      store: MongoStore.create({
        mongoUrl: mongoUri,
        collectionName: 'sessions',
        ttl: 7 * 24 * 60 * 60, // 7 ngày (giây)
      }),
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày (ms)
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: true,
    }),
  );

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Quick Order API')
    .setDescription('Restaurant ordering system API - Complete documentation for all endpoints')
    .setVersion('1.0.0')
    .addServer('https://quick-order-backend.onrender.com', 'Production Server')
    .addCookieAuth('connect.sid', {
      type: 'apiKey',
      in: 'cookie',
      description: 'Session cookie (set automatically after login)',
    })
    .addTag('Auth', 'Authentication and user management')
    .addTag('Restaurants', 'Restaurant CRUD operations and favorites')
    .addTag('Menus', 'Menu items management')
    .addTag('Orders', 'Order management and tracking')
    .addTag('Tables', 'Table management')
    .addTag('Payments', 'Payment processing')
    .addTag('Users', 'User management')
    .addTag('Invoices', 'Invoice operations')
    .addTag('Reviews', 'Restaurant reviews and ratings')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Quick Order API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  app.use('/docs/openapi.json', (req, res) => {
    res.json(document);
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Server running on port: ${port}`);
}
bootstrap();

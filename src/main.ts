import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Quick Order API')
    .setDescription('Restaurant ordering system API - Complete documentation for all endpoints')
    .setVersion('1.0.0')
    .addServer('https://quick-order-backend.onrender.com', 'Production Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
      'JWT',
    )
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
  await app.listen(port);
  console.log(`Server running on port: ${port}`);
}
bootstrap();

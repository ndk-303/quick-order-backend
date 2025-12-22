import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { LoggerMiddleware } from './common/middlewares/logging.middleware';

import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { TablesModule } from './modules/tables/tables.module';
import { MenusModule } from './modules/menus/menus.module';
import { OrdersModule } from './modules/orders/orders.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule, // Kết nối DB qua module riêng
    RestaurantsModule,
    TablesModule,
    MenusModule,
    OrdersModule,
    UsersModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

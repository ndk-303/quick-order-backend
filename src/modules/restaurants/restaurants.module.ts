import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Restaurant, RestaurantSchema } from './schemas/restaurant.schema';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import {
  RestaurantType,
  RestaurantTypeSchema,
} from './schemas/restaurant-types.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
    MongooseModule.forFeature([
      { name: RestaurantType.name, schema: RestaurantTypeSchema },
    ]),
  ],
  controllers: [RestaurantsController],
  providers: [RestaurantsService, CloudinaryService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}

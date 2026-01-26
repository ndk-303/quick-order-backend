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
import {
  FavoriteRestaurant,
  FavoriteRestaurantSchema,
} from './schemas/favorite-restaurant.schema';
import {
  RestaurantReview,
  RestaurantReviewSchema,
} from './schemas/restaurant-review.schema';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: RestaurantType.name, schema: RestaurantTypeSchema },
      { name: FavoriteRestaurant.name, schema: FavoriteRestaurantSchema },
      { name: RestaurantReview.name, schema: RestaurantReviewSchema },
    ]),
  ],
  controllers: [RestaurantsController, ReviewsController],
  providers: [RestaurantsService, ReviewsService, CloudinaryService],
  exports: [RestaurantsService, ReviewsService],
})
export class RestaurantsModule { }

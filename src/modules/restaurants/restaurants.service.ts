import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  async create(
    createRestaurantDto: CreateRestaurantDto,
    ownerId: string,
  ): Promise<Restaurant> {
    const newRestaurant = new this.restaurantModel({
      ...createRestaurantDto,
      ownerId,
      location: {
        type: 'Point',
        coordinates: createRestaurantDto.coordinates,
      },
    });
    return newRestaurant.save();
  }

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantModel.find().exec();
  }
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { RestaurantsService } from '../../modules/restaurants/restaurants.service';
import { GeoUtils } from '../utils/geo.util';

@Injectable()
export class GeoFencingGuard implements CanActivate {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    let lat: number;
    let long: number;
    let restaurant_id: string;

    if (request.method === 'GET') {
      const latQuery = request.query.lat as string;
      const longQuery = request.query.long as string;

      lat = parseFloat(latQuery);
      long = parseFloat(longQuery);

      restaurant_id = (request.params.restaurantId ||
        request.query.restaurant_id) as string;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      lat = request.body.lat;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      long = request.body.long;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      restaurant_id = request.body.restaurant_id;
    }

    if (!lat || !long || isNaN(lat) || isNaN(long)) {
      throw new BadRequestException('Vui lòng bật định vị (GPS) hợp lệ.');
    }

    if (!restaurant_id) {
      throw new BadRequestException('Thiếu thông tin nhà hàng.');
    }

    const restaurant = await this.restaurantsService.findById(restaurant_id);

    if (!restaurant) {
      throw new BadRequestException('Nhà hàng không tồn tại.');
    }

    const [resLong, resLat] = restaurant.location.coordinates;
    const distance = GeoUtils.calculateDistance(lat, long, resLat, resLong);

    if (distance > restaurant.allowedRadius) {
      throw new ForbiddenException(
        `Bạn cách quán ${Math.round(distance)}m. Phạm vi cho phép: ${restaurant.allowedRadius}m.`,
      );
    }

    return true;
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Dùng ConfigService để lấy env an toàn
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    folder: string,
    file: Express.Multer.File,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) return reject(new Error(error.message));
          if (!result)
            return reject(
              new Error('Cloudinary upload failed: No result returned'),
            );
          resolve(result.secure_url);
        },
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async uploadMenuImage(file: Express.Multer.File) {
    return await this.uploadImage('restaurant_menus', file);
  }

  async uploadRestaurantImage(file: Express.Multer.File) {
    return await this.uploadImage('restaurants', file);
  }
}

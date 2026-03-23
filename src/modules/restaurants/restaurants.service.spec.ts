import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { RestaurantsService } from './restaurants.service';
import { Restaurant } from './schemas/restaurant.schema';
import { RestaurantTypesService } from './restaurant-types.service';
import { CloudinaryService } from 'src/common/services/cloudinary.service';

describe('RestaurantsService', () => {
  let service: RestaurantsService;

  // Model is used in two ways in service: static query methods and `new this.restaurantModel(...)`.
  let restaurantModel: jest.Mock & {
    find: jest.Mock;
    countDocuments: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    deleteOne: jest.Mock;
  };

  let restaurantTypesService: {
    findBySlug: jest.Mock;
  };

  let cloudinaryService: {
    uploadRestaurantImage: jest.Mock;
  };

  const restaurantId = new Types.ObjectId().toString();

  const createRestaurantDto = {
    name: 'Nhà hàng ABC',
    address: '123 Lê Lợi, Q1',
    coordinates: [106.7009, 10.7769],
    rating: 4.5,
    review: 120,
    priceRange: '$$',
    type: 'cafe',
    openTime: '08:00 - 22:00',
  };

  const makeRestaurant = (overrides: Partial<any> = {}) => ({
    _id: new Types.ObjectId(restaurantId),
    name: createRestaurantDto.name,
    address: createRestaurantDto.address,
    location: {
      type: 'Point',
      coordinates: createRestaurantDto.coordinates,
    },
    rating: createRestaurantDto.rating,
    review: createRestaurantDto.review,
    priceRange: createRestaurantDto.priceRange,
    imageUrl: 'https://cdn.example.com/image.jpg',
    type: new Types.ObjectId(),
    openTime: createRestaurantDto.openTime,
    ...overrides,
  });

  const makeQueryChain = <T>(resolved: T) => {
    const chain: any = {
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(resolved),
    };

    return chain;
  };

  beforeEach(async () => {
    const modelConstructor = jest.fn().mockImplementation((payload) => ({
      ...payload,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue({ ...payload, _id: new Types.ObjectId() }),
    }));

    restaurantModel = Object.assign(modelConstructor, {
      find: jest.fn(),
      countDocuments: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
    });

    restaurantTypesService = {
      findBySlug: jest.fn(),
    };

    cloudinaryService = {
      uploadRestaurantImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        {
          provide: getModelToken(Restaurant.name),
          useValue: restaurantModel,
        },
        {
          provide: RestaurantTypesService,
          useValue: restaurantTypesService,
        },
        {
          provide: CloudinaryService,
          useValue: cloudinaryService,
        },
      ],
    }).compile();

    service = module.get<RestaurantsService>(RestaurantsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates restaurant successfully with uploaded image', async () => {
      const typeId = new Types.ObjectId();
      const uploadedImage = 'https://cdn.example.com/new-restaurant.jpg';
      const mockFile = { originalname: 'restaurant.jpg' } as Express.Multer.File;

      restaurantTypesService.findBySlug.mockResolvedValue({ _id: typeId });
      cloudinaryService.uploadRestaurantImage.mockResolvedValue(uploadedImage);

      const constructorSave = jest.fn().mockResolvedValue(
        makeRestaurant({
          imageUrl: uploadedImage,
          type: typeId,
        }),
      );
      (restaurantModel as jest.Mock).mockImplementationOnce((payload) => ({
        ...payload,
        save: constructorSave,
      }));

      const result = await service.create(createRestaurantDto as any, mockFile);

      expect(restaurantTypesService.findBySlug).toHaveBeenCalledWith(createRestaurantDto.type);
      expect(cloudinaryService.uploadRestaurantImage).toHaveBeenCalledWith(mockFile);
      expect(restaurantModel).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createRestaurantDto.name,
          imageUrl: uploadedImage,
          location: {
            type: 'Point',
            coordinates: createRestaurantDto.coordinates,
          },
          type: typeId,
        }),
      );
      expect(constructorSave).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          name: createRestaurantDto.name,
          imageUrl: uploadedImage,
        }),
      );
    });

    it('throws BadRequestException when restaurant type does not exist', async () => {
      const mockFile = { originalname: 'restaurant.jpg' } as Express.Multer.File;
      restaurantTypesService.findBySlug.mockResolvedValue(null);

      await expect(service.create(createRestaurantDto as any, mockFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createRestaurantDto as any, mockFile)).rejects.toThrow(
        'Không có loại nhà hàng này',
      );
      expect(cloudinaryService.uploadRestaurantImage).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when image file is missing', async () => {
      restaurantTypesService.findBySlug.mockResolvedValue({ _id: new Types.ObjectId() });

      await expect(service.create(createRestaurantDto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(createRestaurantDto as any)).rejects.toThrow('Ảnh nhà hàng là bắt buộc');
      expect(cloudinaryService.uploadRestaurantImage).not.toHaveBeenCalled();
    });

    it('propagates upload errors from Cloudinary service', async () => {
      const mockFile = { originalname: 'restaurant.jpg' } as Express.Multer.File;
      restaurantTypesService.findBySlug.mockResolvedValue({ _id: new Types.ObjectId() });
      cloudinaryService.uploadRestaurantImage.mockRejectedValue(new Error('upload failed'));

      await expect(service.create(createRestaurantDto as any, mockFile)).rejects.toThrow('upload failed');
    });
  });

  describe('findAll', () => {
    it('returns paginated restaurants', async () => {
      const restaurants = [makeRestaurant()];
      const findChain = makeQueryChain(restaurants);
      restaurantModel.find.mockReturnValue(findChain);
      restaurantModel.countDocuments.mockResolvedValue(13);

      const result = await service.findAll({ page: 2, limit: 5 });

      expect(restaurantModel.find).toHaveBeenCalledWith();
      expect(findChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(findChain.populate).toHaveBeenCalledWith('type', 'name slug');
      expect(findChain.select).toHaveBeenCalledWith('-createdAt -updatedAt -allowedRadius');
      expect(findChain.skip).toHaveBeenCalledWith(5);
      expect(findChain.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        data: restaurants,
        total: 13,
        page: 2,
        limit: 5,
        totalPages: 3,
      });
    });

    it('uses default pagination when no pagination input is provided', async () => {
      const findChain = makeQueryChain([]);
      restaurantModel.find.mockReturnValue(findChain);
      restaurantModel.countDocuments.mockResolvedValue(0);

      const result = await service.findAll();

      expect(findChain.skip).toHaveBeenCalledWith(0);
      expect(findChain.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });
  });

  describe('findById', () => {
    it('returns restaurant when id is valid and found', async () => {
      const restaurant = makeRestaurant();
      restaurantModel.findById.mockResolvedValue(restaurant);

      const result = await service.findById(restaurantId);

      expect(restaurantModel.findById).toHaveBeenCalledWith(restaurantId);
      expect(result).toBe(restaurant);
    });

    it('throws BadRequestException when id is invalid', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(BadRequestException);
      await expect(service.findById('invalid-id')).rejects.toThrow('ID không hợp lệ');
      expect(restaurantModel.findById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when restaurant does not exist', async () => {
      restaurantModel.findById.mockResolvedValue(null);

      await expect(service.findById(restaurantId)).rejects.toThrow(NotFoundException);
      await expect(service.findById(restaurantId)).rejects.toThrow('Nhà hàng không tồn tại');
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Nhà hàng mới',
      openTime: '09:00 - 23:00',
    };

    it('updates restaurant and returns updated document', async () => {
      const updatedRestaurant = makeRestaurant(updateDto);
      restaurantModel.findByIdAndUpdate.mockResolvedValue(updatedRestaurant);

      const result = await service.update(restaurantId, updateDto as any);

      expect(restaurantModel.findByIdAndUpdate).toHaveBeenCalledWith(
        restaurantId,
        { $set: updateDto },
        { new: true },
      );
      expect(result).toBe(updatedRestaurant);
    });

    it('throws BadRequestException when id is invalid', async () => {
      await expect(service.update('invalid-id', updateDto as any)).rejects.toThrow(BadRequestException);
      await expect(service.update('invalid-id', updateDto as any)).rejects.toThrow('ID không hợp lệ');
      expect(restaurantModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when target restaurant does not exist', async () => {
      restaurantModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.update(restaurantId, updateDto as any)).rejects.toThrow(NotFoundException);
      await expect(service.update(restaurantId, updateDto as any)).rejects.toThrow('Nhà hàng không tồn tại');
    });
  });

  describe('remove', () => {
    it('deletes restaurant and returns success message', async () => {
      restaurantModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.remove(restaurantId);

      expect(restaurantModel.deleteOne).toHaveBeenCalledWith({ _id: restaurantId });
      expect(result).toEqual({ message: 'Xóa thành công' });
    });

    it('throws BadRequestException when id is invalid', async () => {
      await expect(service.remove('invalid-id')).rejects.toThrow(BadRequestException);
      await expect(service.remove('invalid-id')).rejects.toThrow('ID không hợp lệ');
      expect(restaurantModel.deleteOne).not.toHaveBeenCalled();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TablesService } from './tables.service';
import { Table, TableDocument } from './schemas/table.schema';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import * as QRCode from 'qrcode';

jest.mock('qrcode');
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-token'),
}));

describe('TablesService', () => {
    let service: TablesService;
    let tableModel: Model<TableDocument>;
    let cacheManager: any;
    let configService: ConfigService;

    const mockRestaurantId = new Types.ObjectId().toString();
    const mockTable = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        name: 'Table 1',
        capacity: 4,
        restaurant: mockRestaurantId,
        token: 'mock-uuid-token',
        qrImage: 'data:image/png;base64,mockQRCode',
        isActive: true,
    };

    const mockTableModel = {
        create: jest.fn(),
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const mockCacheManager = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn((key: string) => {
            if (key === 'FRONTEND_URL') return 'http://localhost:3000';
            return null;
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TablesService,
                {
                    provide: getModelToken(Table.name),
                    useValue: mockTableModel,
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: mockCacheManager,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<TablesService>(TablesService);
        tableModel = module.get<Model<TableDocument>>(getModelToken(Table.name));
        cacheManager = module.get(CACHE_MANAGER);
        configService = module.get<ConfigService>(ConfigService);

        (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,mockQRCode');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        const createTableDto: CreateTableDto = {
            name: 'Table 1',
            capacity: 4,
            location: 'Main Hall',
        };

        it('should create a table with QR code successfully', async () => {
            mockTableModel.create.mockResolvedValue(mockTable);
            mockTableModel.findByIdAndUpdate.mockResolvedValue({
                ...mockTable,
                qrImage: 'data:image/png;base64,mockQRCode',
            });

            const result = await service.create(createTableDto, mockRestaurantId);

            expect(mockTableModel.create).toHaveBeenCalledWith({
                name: createTableDto.name,
                capacity: createTableDto.capacity,
                restaurant: mockRestaurantId,
                token: 'mock-uuid-token',
            });
            expect(QRCode.toDataURL).toHaveBeenCalled();
            expect(mockCacheManager.del).toHaveBeenCalledWith(`tables:${mockRestaurantId}`);
            expect(result).toHaveProperty('tableId');
            expect(result).toHaveProperty('qrImage');
        });

        it('should throw BadRequestException when creation fails', async () => {
            mockTableModel.create.mockRejectedValue(new Error('Database error'));

            await expect(
                service.create(createTableDto, mockRestaurantId),
            ).rejects.toThrow(BadRequestException);
            await expect(
                service.create(createTableDto, mockRestaurantId),
            ).rejects.toThrow('Failed to create table');
        });
    });

    describe('generateQrCode', () => {
        it('should generate QR code for existing table', async () => {
            const tableId = mockTable._id.toString();
            mockTableModel.findById.mockResolvedValue(mockTable);

            const result = await service.generateQrCode(tableId);

            expect(mockTableModel.findById).toHaveBeenCalledWith(tableId);
            expect(QRCode.toDataURL).toHaveBeenCalled();
            expect(result).toHaveProperty('tableId', mockTable._id);
            expect(result).toHaveProperty('qr_image');
        });

        it('should throw NotFoundException when table does not exist', async () => {
            const tableId = new Types.ObjectId().toString();
            mockTableModel.findById.mockResolvedValue(null);

            await expect(service.generateQrCode(tableId)).rejects.toThrow(
                NotFoundException,
            );
            await expect(service.generateQrCode(tableId)).rejects.toThrow(
                'Table not found',
            );
        });
    });

    describe('findAllByRestaurant', () => {
        it('should return cached tables if available', async () => {
            const cachedTables = [mockTable];
            mockCacheManager.get.mockResolvedValue(cachedTables);

            const result = await service.findAllByRestaurant(mockRestaurantId);

            expect(mockCacheManager.get).toHaveBeenCalledWith(`tables:${mockRestaurantId}`);
            expect(mockTableModel.find).not.toHaveBeenCalled();
            expect(result).toEqual(cachedTables);
        });

        it('should fetch from database and cache when cache miss', async () => {
            const tables = [mockTable];
            mockCacheManager.get.mockResolvedValue(null);
            const mockSelect = jest.fn().mockResolvedValue(tables);
            mockTableModel.find.mockReturnValue({ select: mockSelect });

            const result = await service.findAllByRestaurant(mockRestaurantId);

            expect(mockCacheManager.get).toHaveBeenCalledWith(`tables:${mockRestaurantId}`);
            expect(mockTableModel.find).toHaveBeenCalledWith({ restaurant: mockRestaurantId });
            expect(mockCacheManager.set).toHaveBeenCalledWith(
                `tables:${mockRestaurantId}`,
                tables,
                300000,
            );
            expect(result).toEqual(tables);
        });
    });

    describe('findById', () => {
        it('should return a table when found', async () => {
            const tableId = mockTable._id.toString();
            mockTableModel.findById.mockResolvedValue(mockTable);

            const result = await service.findById(tableId);

            expect(mockTableModel.findById).toHaveBeenCalledWith(tableId);
            expect(result).toEqual(mockTable);
        });

        it('should throw NotFoundException when table not found', async () => {
            const tableId = new Types.ObjectId().toString();
            mockTableModel.findById.mockResolvedValue(null);

            await expect(service.findById(tableId)).rejects.toThrow(NotFoundException);
            await expect(service.findById(tableId)).rejects.toThrow('Table not found');
        });
    });

    describe('findByToken', () => {
        it('should return true when table with token exists', async () => {
            const token = 'valid-token';
            mockTableModel.findOne.mockResolvedValue(mockTable);

            const result = await service.findByToken(token);

            expect(mockTableModel.findOne).toHaveBeenCalledWith({ token });
            expect(result).toBe(true);
        });

        it('should return false when table with token does not exist', async () => {
            const token = 'invalid-token';
            mockTableModel.findOne.mockResolvedValue(null);

            const result = await service.findByToken(token);

            expect(result).toBe(false);
        });
    });

    describe('update', () => {
        const updateDto: UpdateTableDto = {
            name: 'Updated Table',
            capacity: 6,
        };

        it('should update table and invalidate cache', async () => {
            const tableId = mockTable._id.toString();
            const updatedTable = { ...mockTable, ...updateDto };
            mockTableModel.findByIdAndUpdate.mockResolvedValue(updatedTable);

            const result = await service.update(tableId, updateDto);

            expect(mockTableModel.findByIdAndUpdate).toHaveBeenCalledWith(tableId, updateDto);
            expect(mockCacheManager.del).toHaveBeenCalledWith(`tables:${mockRestaurantId}`);
            expect(result).toEqual(updatedTable);
        });

        it('should throw NotFoundException when table not found', async () => {
            const tableId = new Types.ObjectId().toString();
            mockTableModel.findByIdAndUpdate.mockResolvedValue(null);

            await expect(service.update(tableId, updateDto)).rejects.toThrow(
                NotFoundException,
            );
            await expect(service.update(tableId, updateDto)).rejects.toThrow(
                'Table not found',
            );
        });
    });

    describe('remove', () => {
        it('should delete table and invalidate cache', async () => {
            const tableId = mockTable._id.toString();
            mockTableModel.findByIdAndDelete.mockResolvedValue(mockTable);

            const result = await service.remove(tableId);

            expect(mockTableModel.findByIdAndDelete).toHaveBeenCalledWith(tableId);
            expect(mockCacheManager.del).toHaveBeenCalledWith(`tables:${mockRestaurantId}`);
            expect(result).toHaveProperty('message', 'Table deleted successfully');
        });

        it('should throw NotFoundException when table not found', async () => {
            const tableId = new Types.ObjectId().toString();
            mockTableModel.findByIdAndDelete.mockResolvedValue(null);

            await expect(service.remove(tableId)).rejects.toThrow(NotFoundException);
            await expect(service.remove(tableId)).rejects.toThrow('Table not found');
        });
    });
});

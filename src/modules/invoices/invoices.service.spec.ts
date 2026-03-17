import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { InvoicesService } from './invoices.service';
import { Invoice, InvoiceStatus } from './schemas/invoice.schema';
import { MenuItem } from '../menus/schemas/menu-item.schema';
import { Table } from '../tables/schemas/table.schema';
import { Restaurant } from '../restaurants/schemas/restaurant.schema';
import { SseService } from '../sse/sse.service';
import { SseEventType } from 'src/common/interfaces/sse.interface';
import { MenuCategory } from 'src/common/enums/menu-category';
import { validateMenuItemOptions, calculateItemTotal } from 'src/common/utils/order-item.util';

jest.mock('src/common/utils/order-item.util', () => ({
  validateMenuItemOptions: jest.fn(),
  calculateItemTotal: jest.fn(),
}));

describe('InvoicesService', () => {
  let service: InvoicesService;

  let invoiceModel: {
    create: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
  };

  let menuItemModel: {
    find: jest.Mock;
  };

  let tableModel: {
    findById: jest.Mock;
  };

  let restaurantModel: {
    findById: jest.Mock;
  };

  let sseService: {
    emit: jest.Mock;
  };

  const userId = new Types.ObjectId().toString();
  const restaurantId = new Types.ObjectId().toString();
  const tableId = new Types.ObjectId().toString();
  const invoiceId = new Types.ObjectId().toString();
  const menuItemId = new Types.ObjectId().toString();

  const makeCreateDto = () => ({
    userId,
    restaurantId,
    tableId,
    items: [
      {
        menuItemId,
        quantity: 2,
        selectedOptions: [{ name: 'Size L', price: 5000 }],
        note: 'ít đá',
        category: MenuCategory.DRINK,
      },
    ],
  });

  const makeInvoiceDoc = (overrides: Partial<any> = {}) => ({
    _id: new Types.ObjectId(invoiceId),
    userId: new Types.ObjectId(userId),
    restaurantId: new Types.ObjectId(restaurantId),
    tableId: new Types.ObjectId(tableId),
    items: [
      {
        menuItemId: new Types.ObjectId(menuItemId),
        name: 'Trà sữa',
        price: 30000,
        quantity: 2,
        selectedOptions: [{ name: 'Size L', price: 5000 }],
        note: 'ít đá',
        category: MenuCategory.DRINK,
      },
    ],
    totalAmount: 70000,
    status: InvoiceStatus.PENDING,
    ...overrides,
  });

  const makeQueryChain = <T>(resolved: T) => {
    const chain: any = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(resolved),
    };

    return chain;
  };

  beforeEach(async () => {
    invoiceModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };

    menuItemModel = {
      find: jest.fn(),
    };

    tableModel = {
      findById: jest.fn(),
    };

    restaurantModel = {
      findById: jest.fn(),
    };

    sseService = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: getModelToken(Invoice.name),
          useValue: invoiceModel,
        },
        {
          provide: getModelToken(MenuItem.name),
          useValue: menuItemModel,
        },
        {
          provide: getModelToken(Table.name),
          useValue: tableModel,
        },
        {
          provide: getModelToken(Restaurant.name),
          useValue: restaurantModel,
        },
        {
          provide: SseService,
          useValue: sseService,
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);

    jest.clearAllMocks();
    (validateMenuItemOptions as jest.Mock).mockReturnValue(undefined);
    (calculateItemTotal as jest.Mock).mockReturnValue({ optionsPrice: 5000, lineTotal: 70000 });
  });

  describe('create', () => {
    it('creates invoice successfully and emits INVOICE_CREATED', async () => {
      const dto = makeCreateDto();
      const menuItem = {
        _id: new Types.ObjectId(menuItemId),
        name: 'Trà sữa',
        price: 30000,
      };

      restaurantModel.findById.mockResolvedValue({ _id: new Types.ObjectId(restaurantId) });
      tableModel.findById.mockResolvedValue({ _id: new Types.ObjectId(tableId) });
      menuItemModel.find.mockResolvedValue([menuItem]);
      invoiceModel.create.mockResolvedValue({ _id: new Types.ObjectId(invoiceId) });

      const populatedInvoice = makeInvoiceDoc();
      invoiceModel.findById.mockReturnValue(makeQueryChain(populatedInvoice));

      const result = await service.create(dto as any);

      expect(validateMenuItemOptions).toHaveBeenCalledWith(menuItem, dto.items[0].selectedOptions);
      expect(calculateItemTotal).toHaveBeenCalledWith(30000, 2, dto.items[0].selectedOptions);
      expect(invoiceModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(Types.ObjectId),
          restaurantId: expect.any(Types.ObjectId),
          tableId: expect.any(Types.ObjectId),
          totalAmount: 70000,
          status: InvoiceStatus.PENDING,
        }),
      );
      expect(sseService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SseEventType.INVOICE_CREATED,
          restaurantId,
          userId,
          payload: populatedInvoice,
        }),
      );
      expect(result).toEqual(expect.objectContaining({ _id: expect.any(Types.ObjectId) }));
    });

    it('throws when restaurant is invalid', async () => {
      const dto = makeCreateDto();
      restaurantModel.findById.mockResolvedValue(null);
      tableModel.findById.mockResolvedValue({ _id: new Types.ObjectId(tableId) });

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto as any)).rejects.toThrow('Nhà hàng không hợp lệ!');
    });

    it('throws when table is invalid', async () => {
      const dto = makeCreateDto();
      restaurantModel.findById.mockResolvedValue({ _id: new Types.ObjectId(restaurantId) });
      tableModel.findById.mockResolvedValue(null);

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto as any)).rejects.toThrow('Bàn không hợp lệ!');
    });

    it('throws when menu item does not exist or unavailable', async () => {
      const dto = makeCreateDto();
      restaurantModel.findById.mockResolvedValue({ _id: new Types.ObjectId(restaurantId) });
      tableModel.findById.mockResolvedValue({ _id: new Types.ObjectId(tableId) });
      menuItemModel.find.mockResolvedValue([]);

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto as any)).rejects.toThrow(
        `Món ăn với ID ${menuItemId} không tồn tại`,
      );
    });

    it('uses empty selectedOptions array when item options are not provided', async () => {
      const dto = {
        ...makeCreateDto(),
        items: [
          {
            menuItemId,
            quantity: 1,
            note: 'không đường',
            category: MenuCategory.DRINK,
          },
        ],
      };
      const menuItem = {
        _id: new Types.ObjectId(menuItemId),
        name: 'Cà phê',
        price: 20000,
      };

      restaurantModel.findById.mockResolvedValue({ _id: new Types.ObjectId(restaurantId) });
      tableModel.findById.mockResolvedValue({ _id: new Types.ObjectId(tableId) });
      menuItemModel.find.mockResolvedValue([menuItem]);
      invoiceModel.create.mockResolvedValue({ _id: new Types.ObjectId(invoiceId) });
      invoiceModel.findById.mockReturnValue(makeQueryChain(makeInvoiceDoc({ totalAmount: 20000 })));
      (calculateItemTotal as jest.Mock).mockReturnValue({ optionsPrice: 0, lineTotal: 20000 });

      await service.create(dto as any);

      expect(invoiceModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [expect.objectContaining({ selectedOptions: [] })],
          totalAmount: 20000,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns invoice when found', async () => {
      const invoice = makeInvoiceDoc();
      invoiceModel.findById.mockReturnValue(makeQueryChain(invoice));

      const result = await service.findOne(invoiceId);

      expect(invoiceModel.findById).toHaveBeenCalledWith(invoiceId);
      expect(result).toBe(invoice);
    });

    it('throws NotFoundException when invoice not found', async () => {
      invoiceModel.findById.mockReturnValue(makeQueryChain(null));

      await expect(service.findOne(invoiceId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(invoiceId)).rejects.toThrow(`Invoice #${invoiceId} not found`);
    });
  });

  describe('updateStatus', () => {
    it('updates status and emits INVOICE_STATUS_UPDATED', async () => {
      const updatedInvoice = makeInvoiceDoc({
        status: InvoiceStatus.PAID,
      });

      invoiceModel.findByIdAndUpdate.mockReturnValue(makeQueryChain(updatedInvoice));

      const result = await service.updateStatus(invoiceId, InvoiceStatus.PAID);

      expect(invoiceModel.findByIdAndUpdate).toHaveBeenCalledWith(
        invoiceId,
        { status: InvoiceStatus.PAID },
        { new: true },
      );
      expect(sseService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SseEventType.INVOICE_STATUS_UPDATED,
          restaurantId,
          userId,
          payload: updatedInvoice,
        }),
      );
      expect(result).toBe(updatedInvoice);
    });

    it('throws NotFoundException when invoice to update not found', async () => {
      invoiceModel.findByIdAndUpdate.mockReturnValue(makeQueryChain(null));

      await expect(service.updateStatus(invoiceId, InvoiceStatus.PAID)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateStatus(invoiceId, InvoiceStatus.PAID)).rejects.toThrow(
        `Invoice #${invoiceId} not found`,
      );
    });
  });

  describe('findByUser', () => {
    it('returns paginated paid invoices for user', async () => {
      const invoices = [makeInvoiceDoc({ status: InvoiceStatus.PAID })];
      const findChain = makeQueryChain(invoices);
      invoiceModel.find.mockReturnValue(findChain);
      invoiceModel.countDocuments.mockResolvedValue(7);

      const result = await service.findByUser(userId, { page: 2, limit: 3 });

      expect(invoiceModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
        status: InvoiceStatus.PAID,
      });
      expect(findChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(findChain.skip).toHaveBeenCalledWith(3);
      expect(findChain.limit).toHaveBeenCalledWith(3);
      expect(result).toEqual({
        data: invoices,
        total: 7,
        page: 2,
        limit: 3,
        totalPages: 3,
      });
    });

    it('uses default pagination values for user invoices', async () => {
      const findChain = makeQueryChain([]);
      invoiceModel.find.mockReturnValue(findChain);
      invoiceModel.countDocuments.mockResolvedValue(0);

      const result = await service.findByUser(userId);

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

  describe('findByRestaurant', () => {
    it('returns paginated invoices for restaurant', async () => {
      const invoices = [makeInvoiceDoc()];
      const findChain = makeQueryChain(invoices);
      invoiceModel.find.mockReturnValue(findChain);
      invoiceModel.countDocuments.mockResolvedValue(4);

      const result = await service.findByRestaurant(restaurantId, { page: 1, limit: 2 });

      expect(invoiceModel.find).toHaveBeenCalledWith({
        restaurantId: expect.any(Types.ObjectId),
      });
      expect(findChain.populate).toHaveBeenNthCalledWith(1, 'tableId', 'name');
      expect(findChain.populate).toHaveBeenNthCalledWith(2, 'userId', 'fullName email');
      expect(findChain.skip).toHaveBeenCalledWith(0);
      expect(findChain.limit).toHaveBeenCalledWith(2);
      expect(result).toEqual({
        data: invoices,
        total: 4,
        page: 1,
        limit: 2,
        totalPages: 2,
      });
    });

    it('uses default pagination values for restaurant invoices', async () => {
      const findChain = makeQueryChain([]);
      invoiceModel.find.mockReturnValue(findChain);
      invoiceModel.countDocuments.mockResolvedValue(0);

      const result = await service.findByRestaurant(restaurantId);

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
});

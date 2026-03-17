import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './schemas/order.schema';
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

describe('OrdersService', () => {
  let service: OrdersService;

  // Order model must be callable via `new this.orderModel(...)` in handleInvoicePaid.
  let orderModel: jest.Mock & {
    find: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
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
  const orderId = new Types.ObjectId().toString();
  const menuItemId = new Types.ObjectId().toString();

  const makeCreateDto = () => ({
    restaurantId,
    tableId,
    lat: 10.7,
    long: 106.6,
    items: [
      {
        menuItemId,
        quantity: 2,
        selectedOptions: [{ name: 'Size L', price: 5000 }],
        note: 'ít đá',
      },
    ],
  });

  const makeOrderItem = (overrides: Partial<any> = {}) => ({
    menuItemId: new Types.ObjectId(menuItemId),
    name: 'Trà sữa',
    price: 30000,
    quantity: 2,
    selectedOptions: [{ name: 'Size L', price: 5000 }],
    note: 'ít đá',
    status: OrderStatus.PENDING,
    category: MenuCategory.DRINK,
    ...overrides,
  });

  const makeOrderDoc = (overrides: Partial<any> = {}) => ({
    _id: new Types.ObjectId(orderId),
    userId: new Types.ObjectId(userId),
    restaurantId: new Types.ObjectId(restaurantId),
    tableId: new Types.ObjectId(tableId),
    items: [makeOrderItem()],
    totalAmount: 70000,
    status: OrderStatus.PENDING,
    markModified: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const makeQueryChain = <T>(resolved: T) => {
    const chain: any = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(resolved),
    };

    return chain;
  };

  beforeEach(async () => {
    const orderConstructor = jest.fn().mockImplementation((payload) => ({
      ...payload,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue({ ...payload, _id: new Types.ObjectId() }),
    }));

    orderModel = Object.assign(orderConstructor, {
      find: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn(),
    });

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
        OrdersService,
        {
          provide: getModelToken(Order.name),
          useValue: orderModel,
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

    service = module.get<OrdersService>(OrdersService);

    jest.clearAllMocks();
    (validateMenuItemOptions as jest.Mock).mockReturnValue(undefined);
    (calculateItemTotal as jest.Mock).mockReturnValue({ optionsPrice: 5000, lineTotal: 70000 });
  });

  describe('create', () => {
    it('creates order successfully and emits ORDER_CREATED event', async () => {
      const dto = makeCreateDto();
      const dbMenuItem = {
        _id: new Types.ObjectId(menuItemId),
        name: 'Trà sữa',
        price: 30000,
        category: MenuCategory.DRINK,
      };

      restaurantModel.findById.mockResolvedValue({ _id: new Types.ObjectId(restaurantId) });
      tableModel.findById.mockResolvedValue({ _id: new Types.ObjectId(tableId), name: 'Bàn 1' });
      orderModel.find.mockResolvedValue([]);
      menuItemModel.find.mockResolvedValue([dbMenuItem]);
      orderModel.create.mockResolvedValue({ _id: new Types.ObjectId(orderId) });

      const populatedOrder = {
        _id: new Types.ObjectId(orderId),
        userId: new Types.ObjectId(userId),
        restaurantId: new Types.ObjectId(restaurantId),
        tableId: new Types.ObjectId(tableId),
      };
      const findByIdChain = makeQueryChain(populatedOrder);
      orderModel.findById.mockReturnValue(findByIdChain);

      const result = await service.create(dto as any, userId);

      expect(validateMenuItemOptions).toHaveBeenCalledWith(dbMenuItem, dto.items[0].selectedOptions);
      expect(calculateItemTotal).toHaveBeenCalledWith(30000, 2, dto.items[0].selectedOptions);
      expect(orderModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          restaurantId,
          tableId,
          totalAmount: 70000,
          status: OrderStatus.PENDING,
          items: [
            expect.objectContaining({
              menuItemId: dbMenuItem._id,
              name: dbMenuItem.name,
              status: OrderStatus.PENDING,
              category: dbMenuItem.category,
            }),
          ],
        }),
      );
      expect(sseService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SseEventType.ORDER_CREATED,
          restaurantId,
          tableId,
          userId,
          payload: populatedOrder,
        }),
      );
      expect(result).toEqual({ message: 'Đặt hàng thành công', orderId: populatedOrder._id });
    });

    it('throws when restaurant is invalid', async () => {
      const dto = makeCreateDto();
      restaurantModel.findById.mockResolvedValue(null);
      tableModel.findById.mockResolvedValue({ _id: new Types.ObjectId(tableId) });

      await expect(service.create(dto as any, userId)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto as any, userId)).rejects.toThrow('Nhà hàng không hợp lệ!');
      expect(orderModel.create).not.toHaveBeenCalled();
    });

    it('throws when table is invalid', async () => {
      const dto = makeCreateDto();
      restaurantModel.findById.mockResolvedValue({ _id: new Types.ObjectId(restaurantId) });
      tableModel.findById.mockResolvedValue(null);

      await expect(service.create(dto as any, userId)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto as any, userId)).rejects.toThrow('Bàn không hợp lệ!');
    });

    it('throws when any menu item is missing or unavailable', async () => {
      const dto = makeCreateDto();
      restaurantModel.findById.mockResolvedValue({ _id: new Types.ObjectId(restaurantId) });
      tableModel.findById.mockResolvedValue({ _id: new Types.ObjectId(tableId) });
      orderModel.find.mockResolvedValue([]);
      menuItemModel.find.mockResolvedValue([]);

      await expect(service.create(dto as any, userId)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto as any, userId)).rejects.toThrow(
        `Món ăn với ID ${menuItemId} không tồn tại`,
      );
    });

    it('sets selectedOptions to empty array when item options are missing', async () => {
      const dto = {
        ...makeCreateDto(),
        items: [{ menuItemId, quantity: 1, note: 'không đường' }],
      };
      const dbMenuItem = {
        _id: new Types.ObjectId(menuItemId),
        name: 'Cà phê',
        price: 20000,
        category: MenuCategory.DRINK,
      };

      restaurantModel.findById.mockResolvedValue({ _id: new Types.ObjectId(restaurantId) });
      tableModel.findById.mockResolvedValue({ _id: new Types.ObjectId(tableId) });
      orderModel.find.mockResolvedValue([]);
      menuItemModel.find.mockResolvedValue([dbMenuItem]);
      orderModel.create.mockResolvedValue({ _id: new Types.ObjectId(orderId) });
      orderModel.findById.mockReturnValue(
        makeQueryChain({
          _id: new Types.ObjectId(orderId),
          userId: new Types.ObjectId(userId),
          restaurantId: new Types.ObjectId(restaurantId),
          tableId: new Types.ObjectId(tableId),
        }),
      );
      (calculateItemTotal as jest.Mock).mockReturnValue({ optionsPrice: 0, lineTotal: 20000 });

      await service.create(dto as any, userId);

      expect(orderModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [expect.objectContaining({ selectedOptions: [] })],
          totalAmount: 20000,
        }),
      );
    });
  });

  describe('updateOrderItemStatus', () => {
    it('updates item status, recomputes order status and emits ORDER_UPDATED', async () => {
      const orderDoc = makeOrderDoc({
        items: [makeOrderItem({ status: OrderStatus.PENDING })],
      });
      orderModel.findById
        .mockResolvedValueOnce(orderDoc)
        .mockReturnValueOnce(
          makeQueryChain({
            ...orderDoc,
            restaurantId: { _id: new Types.ObjectId(restaurantId) },
          }),
        );

      const result = await service.updateOrderItemStatus({
        orderId,
        itemId: menuItemId,
        status: OrderStatus.COOKING,
      });

      expect(orderDoc.items[0].status).toBe(OrderStatus.COOKING);
      expect(orderDoc.markModified).toHaveBeenCalledWith('items');
      expect(orderDoc.status).toBe(OrderStatus.COOKING);
      expect(orderDoc.save).toHaveBeenCalled();
      expect(sseService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SseEventType.ORDER_UPDATED,
          restaurantId,
          userId,
        }),
      );
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when order does not exist', async () => {
      orderModel.findById.mockResolvedValue(null);

      await expect(
        service.updateOrderItemStatus({ orderId, itemId: menuItemId, status: OrderStatus.COOKING }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateOrderItemStatus({ orderId, itemId: menuItemId, status: OrderStatus.COOKING }),
      ).rejects.toThrow('Order not found');
    });

    it('throws NotFoundException when item is not in order', async () => {
      orderModel.findById.mockResolvedValue(makeOrderDoc({ items: [] }));

      await expect(
        service.updateOrderItemStatus({ orderId, itemId: menuItemId, status: OrderStatus.COOKING }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateOrderItemStatus({ orderId, itemId: menuItemId, status: OrderStatus.COOKING }),
      ).rejects.toThrow('Item not found in order');
    });

    it('throws when attempting invalid backward transition', async () => {
      const orderDoc = makeOrderDoc({
        items: [makeOrderItem({ status: OrderStatus.COOKING })],
      });
      orderModel.findById.mockResolvedValue(orderDoc);

      await expect(
        service.updateOrderItemStatus({ orderId, itemId: menuItemId, status: OrderStatus.PENDING }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('returns paginated orders for restaurant', async () => {
      const orders = [makeOrderDoc()];
      const findChain = makeQueryChain(orders);
      orderModel.find.mockReturnValue(findChain);
      orderModel.countDocuments.mockResolvedValue(17);

      const result = await service.findAll(restaurantId, { page: 2, limit: 5 });

      expect(orderModel.find).toHaveBeenCalledWith({
        restaurantId: expect.any(Types.ObjectId),
        status: { $nin: ['COMPLETED', 'CANCELED'] },
      });
      expect(findChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(findChain.skip).toHaveBeenCalledWith(5);
      expect(findChain.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        data: orders,
        total: 17,
        page: 2,
        limit: 5,
        totalPages: 4,
      });
    });

    it('uses default pagination when no options are provided', async () => {
      const findChain = makeQueryChain([]);
      orderModel.find.mockReturnValue(findChain);
      orderModel.countDocuments.mockResolvedValue(0);

      await service.findAll(restaurantId);

      expect(findChain.skip).toHaveBeenCalledWith(0);
      expect(findChain.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('findAllForClient', () => {
    it('returns paginated orders for client with status filter', async () => {
      const orders = [makeOrderDoc()];
      const findChain = makeQueryChain(orders);
      orderModel.find.mockReturnValue(findChain);
      orderModel.countDocuments.mockResolvedValue(3);

      const result = await service.findAllForClient(userId, [OrderStatus.PENDING], {
        page: 1,
        limit: 2,
      });

      expect(orderModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
        status: { $in: [OrderStatus.PENDING] },
      });
      expect(findChain.populate).toHaveBeenNthCalledWith(1, {
        path: 'tableId',
        model: Table.name,
        select: 'name',
      });
      expect(findChain.populate).toHaveBeenNthCalledWith(2, 'restaurantId', 'name');
      expect(result).toEqual({
        data: orders,
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });
    });
  });

  describe('handleInvoicePaid', () => {
    it('creates order from invoice and emits ORDER_CREATED', async () => {
      const invoice = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(userId),
        restaurantId: new Types.ObjectId(restaurantId),
        tableId: new Types.ObjectId(tableId),
        items: [
          {
            menuItemId: new Types.ObjectId(menuItemId),
            name: 'Bánh ngọt',
            price: 25000,
            quantity: 2,
            selectedOptions: [{ name: 'Extra cream', price: 3000 }],
            note: 'ít ngọt',
            category: MenuCategory.DESSERT,
          },
        ],
        totalAmount: 56000,
      };

      const savedOrderId = new Types.ObjectId();
      const newOrderInstance = {
        _id: savedOrderId,
        save: jest.fn().mockResolvedValue({ _id: savedOrderId }),
      };
      (orderModel as jest.Mock).mockImplementationOnce(() => newOrderInstance as any);

      const populated = {
        _id: savedOrderId,
        restaurantId: { _id: new Types.ObjectId(restaurantId) },
        tableId: { _id: new Types.ObjectId(tableId) },
        userId: new Types.ObjectId(userId),
      };
      orderModel.findById.mockReturnValue(makeQueryChain(populated));

      await service.handleInvoicePaid({ invoice } as any);

      expect(orderModel).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: invoice.userId,
          restaurantId: invoice.restaurantId,
          tableId: invoice.tableId,
          totalAmount: invoice.totalAmount,
          status: OrderStatus.PENDING,
          items: [
            expect.objectContaining({
              status: OrderStatus.PENDING,
              category: MenuCategory.DESSERT,
            }),
          ],
        }),
      );
      expect(newOrderInstance.save).toHaveBeenCalled();
      expect(sseService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SseEventType.ORDER_CREATED,
          restaurantId,
          tableId,
          userId,
          payload: populated,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns order when id exists', async () => {
      const order = makeOrderDoc();
      orderModel.findById.mockReturnValue(makeQueryChain(order));

      const result = await service.findOne(orderId);

      expect(result).toBe(order);
    });

    it('throws NotFoundException when id does not exist', async () => {
      orderModel.findById.mockReturnValue(makeQueryChain(null));

      await expect(service.findOne(orderId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(orderId)).rejects.toThrow('Order not found');
    });
  });

  describe('validateStatusTransition', () => {
    it('allows same status transition (idempotent)', () => {
      expect(() => (service as any).validateStatusTransition(OrderStatus.PENDING, OrderStatus.PENDING)).not.toThrow();
    });

    it('allows cancellation only from PENDING', () => {
      expect(() =>
        (service as any).validateStatusTransition(OrderStatus.PENDING, OrderStatus.CANCELLED),
      ).not.toThrow();
    });

    it('rejects cancellation from non-PENDING statuses', () => {
      expect(() =>
        (service as any).validateStatusTransition(OrderStatus.COOKING, OrderStatus.CANCELLED),
      ).toThrow(BadRequestException);
    });

    it('rejects any transition out of CANCELLED status', () => {
      expect(() =>
        (service as any).validateStatusTransition(OrderStatus.CANCELLED, OrderStatus.COOKING),
      ).toThrow(BadRequestException);
    });

    it('rejects any transition out of COMPLETED status', () => {
      expect(() =>
        (service as any).validateStatusTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED),
      ).toThrow(BadRequestException);
    });
  });

  describe('calculateOrderStatus', () => {
    it('returns COMPLETED when all items are COMPLETED/CANCELLED and at least one COMPLETED', () => {
      const result = service.calculateOrderStatus([
        makeOrderItem({ status: OrderStatus.COMPLETED }),
        makeOrderItem({ status: OrderStatus.CANCELLED }),
      ] as any);

      expect(result).toBe(OrderStatus.COMPLETED);
    });

    it('returns CANCELLED when all items are CANCELLED', () => {
      const result = service.calculateOrderStatus([
        makeOrderItem({ status: OrderStatus.CANCELLED }),
        makeOrderItem({ status: OrderStatus.CANCELLED }),
      ] as any);

      expect(result).toBe(OrderStatus.CANCELLED);
    });

    it('returns COOKING when any item is COOKING and not fully completed/cancelled', () => {
      const result = service.calculateOrderStatus([
        makeOrderItem({ status: OrderStatus.PENDING }),
        makeOrderItem({ status: OrderStatus.COOKING }),
      ] as any);

      expect(result).toBe(OrderStatus.COOKING);
    });

    it('returns PENDING when all items are still pending', () => {
      const result = service.calculateOrderStatus([
        makeOrderItem({ status: OrderStatus.PENDING }),
      ] as any);

      expect(result).toBe(OrderStatus.PENDING);
    });
  });
});

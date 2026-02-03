import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderItemStatusDto } from './dto/update-item.dto';
import { OrderStatus } from './schemas/order.schema';
import { Types } from 'mongoose';

describe('OrdersController', () => {
    let controller: OrdersController;
    let service: OrdersService;

    const mockObjectId = () => new Types.ObjectId();
    const mockUserId = mockObjectId();
    const mockRestaurantId = mockObjectId();
    const mockOrderId = mockObjectId();
    const mockTableId = mockObjectId();
    const mockItemId = mockObjectId();

    const mockOrdersService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        findAllForClient: jest.fn(),
        updateOrderItemStatus: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrdersController],
            providers: [
                {
                    provide: OrdersService,
                    useValue: mockOrdersService,
                },
            ],
        }).compile();

        controller = module.get<OrdersController>(OrdersController);
        service = module.get<OrdersService>(OrdersService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create an order with userId from request', async () => {
            const createOrderDto: CreateOrderDto = {
                restaurantId: mockRestaurantId.toString(),
                tableId: mockTableId.toString(),
                lat: 10.8231,
                long: 106.6297,
                items: [
                    {
                        menuItemId: mockItemId.toString(),
                        quantity: 2,
                        selectedOptions: [],
                        note: '',
                    },
                ],
            };

            const mockReq = {
                user: {
                    userId: mockUserId.toString(),
                },
            };

            const mockResponse = {
                message: 'Đặt hàng thành công',
                orderId: mockOrderId,
            };

            mockOrdersService.create.mockResolvedValue(mockResponse);

            const result = await controller.create(createOrderDto, mockReq);

            expect(service.create).toHaveBeenCalledWith(
                createOrderDto,
                mockUserId.toString()
            );
            expect(result).toEqual(mockResponse);
        });
    });

    describe('findAllRestaurant', () => {
        it('should return all orders for restaurant from request context', async () => {
            const mockReq = {
                user: {
                    restaurantId: mockRestaurantId.toString(),
                },
            };

            const mockOrders = [
                { _id: mockOrderId, status: OrderStatus.PENDING },
            ];

            mockOrdersService.findAll.mockResolvedValue(mockOrders);

            const result = await controller.findAllRestaurant(mockReq);

            expect(service.findAll).toHaveBeenCalledWith(mockRestaurantId.toString());
            expect(result).toEqual(mockOrders);
        });
    });

    describe('findForKitchen', () => {
        it('should return kitchen orders with restaurantId and category', async () => {
            const mockOrders = [
                { _id: mockOrderId, status: OrderStatus.COOKING },
            ];

            mockOrdersService.findAll.mockResolvedValue(mockOrders);

            const result = await controller.findForKitchen(
                mockRestaurantId.toString(),
                'FOOD'
            );

            expect(service.findAll).toHaveBeenCalledWith(
                mockRestaurantId.toString(),
                'FOOD'
            );
            expect(result).toEqual(mockOrders);
        });

        it('should return kitchen orders without category filter', async () => {
            const mockOrders = [
                { _id: mockOrderId, status: OrderStatus.COOKING },
            ];

            mockOrdersService.findAll.mockResolvedValue(mockOrders);

            const result = await controller.findForKitchen(
                mockRestaurantId.toString(),
                '' as any
            );

            expect(service.findAll).toHaveBeenCalledWith(
                mockRestaurantId.toString(),
                '' as any
            );
            expect(result).toEqual(mockOrders);
        });
    });

    describe('findAllClient', () => {
        it('should return client orders filtered by status', async () => {
            const mockReq = {
                user: {
                    userId: mockUserId.toString(),
                },
            };

            const statusFilter = [OrderStatus.PENDING, OrderStatus.COOKING];
            const mockOrders = [
                { _id: mockOrderId, status: OrderStatus.PENDING },
            ];

            mockOrdersService.findAllForClient.mockResolvedValue(mockOrders);

            const result = await controller.findAllClient(mockReq, statusFilter);

            expect(service.findAllForClient).toHaveBeenCalledWith(
                mockUserId.toString(),
                statusFilter
            );
            expect(result).toEqual(mockOrders);
        });

        it('should handle empty status filter', async () => {
            const mockReq = {
                user: {
                    userId: mockUserId.toString(),
                },
            };

            const mockOrders = [];

            mockOrdersService.findAllForClient.mockResolvedValue(mockOrders);

            const result = await controller.findAllClient(mockReq, []);

            expect(service.findAllForClient).toHaveBeenCalledWith(
                mockUserId.toString(),
                []
            );
            expect(result).toEqual(mockOrders);
        });
    });

    describe('findOne', () => {
        it('should return a single order by ID', async () => {
            const mockOrder = {
                _id: mockOrderId,
                status: OrderStatus.PENDING,
            };

            mockOrdersService.findOne.mockResolvedValue(mockOrder);

            const result = await controller.findOne(mockOrderId.toString());

            expect(service.findOne).toHaveBeenCalledWith(mockOrderId.toString());
            expect(result).toEqual(mockOrder);
        });
    });

    describe('updateStatus', () => {
        it('should update order item status with merged params', async () => {
            const updateItemDto: UpdateOrderItemStatusDto = {
                orderId: '',
                itemId: '',
                status: OrderStatus.COOKING,
            };

            const mockUpdatedOrder = {
                _id: mockOrderId,
                items: [
                    {
                        menuItemId: mockItemId,
                        status: OrderStatus.COOKING,
                    },
                ],
            };

            mockOrdersService.updateOrderItemStatus.mockResolvedValue(
                mockUpdatedOrder
            );

            const result = await controller.updateStatus(
                mockOrderId.toString(),
                mockItemId.toString(),
                updateItemDto
            );

            expect(service.updateOrderItemStatus).toHaveBeenCalledWith({
                ...updateItemDto,
                orderId: mockOrderId.toString(),
                itemId: mockItemId.toString(),
            });
            expect(result).toEqual(mockUpdatedOrder);
        });

        it('should handle cancellation status update', async () => {
            const updateItemDto: UpdateOrderItemStatusDto = {
                orderId: '',
                itemId: '',
                status: OrderStatus.CANCELLED,
            };

            const mockUpdatedOrder = {
                _id: mockOrderId,
                items: [
                    {
                        menuItemId: mockItemId,
                        status: OrderStatus.CANCELLED,
                    },
                ],
            };

            mockOrdersService.updateOrderItemStatus.mockResolvedValue(
                mockUpdatedOrder
            );

            const result = await controller.updateStatus(
                mockOrderId.toString(),
                mockItemId.toString(),
                updateItemDto
            );

            expect(service.updateOrderItemStatus).toHaveBeenCalledWith({
                ...updateItemDto,
                orderId: mockOrderId.toString(),
                itemId: mockItemId.toString(),
            });
            expect(result).toEqual(mockUpdatedOrder);
        });
    });
});

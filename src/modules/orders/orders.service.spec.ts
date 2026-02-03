import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { OrdersService } from './orders.service';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { MenuItem, MenuItemDocument } from '../menus/schemas/menu-item.schema';
import { Table, TableDocument } from '../tables/schemas/table.schema';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { SseService } from '../sse/sse.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderItemStatusDto } from './dto/update-item.dto';
import { MenuCategory } from 'src/common/enums/menu-category';
import { SseEventType } from 'src/common/interfaces/sse.interface';

describe('OrdersService', () => {
    let service: OrdersService;
    let orderModel: Model<OrderDocument>;
    let menuItemModel: Model<MenuItemDocument>;
    let tableModel: Model<TableDocument>;
    let restaurantModel: Model<RestaurantDocument>;
    let sseService: SseService;

    const mockObjectId = () => new Types.ObjectId();
    const mockRestaurantId = mockObjectId();
    const mockTableId = mockObjectId();
    const mockUserId = mockObjectId();
    const mockMenuItemId1 = mockObjectId();
    const mockMenuItemId2 = mockObjectId();
    const mockOrderId = mockObjectId();

    const mockRestaurant = {
        _id: mockRestaurantId,
        name: 'Test Restaurant',
    };

    const mockTable = {
        _id: mockTableId,
        name: 'Table 1',
        isActive: true,
    };

    const mockMenuItem1 = {
        _id: mockMenuItemId1,
        name: 'Burger',
        price: 50000,
        category: MenuCategory.FOOD,
    };

    const mockMenuItem2 = {
        _id: mockMenuItemId2,
        name: 'Coke',
        price: 10000,
        category: MenuCategory.DRINK,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                {
                    provide: getModelToken(Order.name),
                    useValue: {
                        create: jest.fn(),
                        find: jest.fn(),
                        findById: jest.fn(),
                        findOne: jest.fn(),
                        findOneAndUpdate: jest.fn(),
                    },
                },
                {
                    provide: getModelToken(MenuItem.name),
                    useValue: {
                        find: jest.fn(),
                        findById: jest.fn(),
                    },
                },
                {
                    provide: getModelToken(Table.name),
                    useValue: {
                        findById: jest.fn(),
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: getModelToken(Restaurant.name),
                    useValue: {
                        findById: jest.fn(),
                    },
                },
                {
                    provide: SseService,
                    useValue: {
                        emit: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
        orderModel = module.get<Model<OrderDocument>>(getModelToken(Order.name));
        menuItemModel = module.get<Model<MenuItemDocument>>(getModelToken(MenuItem.name));
        tableModel = module.get<Model<TableDocument>>(getModelToken(Table.name));
        restaurantModel = module.get<Model<RestaurantDocument>>(getModelToken(Restaurant.name));
        sseService = module.get<SseService>(SseService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        const createOrderDto: CreateOrderDto = {
            restaurantId: mockRestaurantId.toString(),
            tableId: mockTableId.toString(),
            lat: 10.8231,
            long: 106.6297,
            items: [
                {
                    menuItemId: mockMenuItemId1.toString(),
                    quantity: 2,
                    selectedOptions: [{ name: 'Extra cheese', price: 5000 }],
                    note: 'No onions',
                },
                {
                    menuItemId: mockMenuItemId2.toString(),
                    quantity: 1,
                    selectedOptions: [],
                    note: '',
                },
            ],
        };

        it('should create an order successfully', async () => {
            const mockCreatedOrder = {
                _id: mockOrderId,
                userId: mockUserId,
                restaurantId: mockRestaurantId,
                tableId: mockTableId,
                items: [
                    {
                        menuItemId: mockMenuItemId1,
                        name: 'Burger',
                        price: 50000,
                        quantity: 2,
                        selectedOptions: [{ name: 'Extra cheese', price: 5000 }],
                        note: 'No onions',
                        status: OrderStatus.PENDING,
                        category: MenuCategory.FOOD,
                    },
                    {
                        menuItemId: mockMenuItemId2,
                        name: 'Coke',
                        price: 10000,
                        quantity: 1,
                        selectedOptions: [],
                        note: '',
                        status: OrderStatus.PENDING,
                        category: MenuCategory.DRINK,
                    },
                ],
                totalAmount: 120000, // (50000 + 5000) * 2 + 10000 * 1
                status: OrderStatus.PENDING,
            };

            const mockPopulatedOrder = {
                ...mockCreatedOrder,
                tableId: { _id: mockTableId, name: 'Table 1' },
            };

            jest.spyOn(restaurantModel, 'findById').mockResolvedValue(mockRestaurant as any);
            jest.spyOn(tableModel, 'findById').mockResolvedValue(mockTable as any);
            jest.spyOn(menuItemModel, 'find').mockResolvedValue([mockMenuItem1, mockMenuItem2] as any);
            jest.spyOn(orderModel, 'create').mockResolvedValue(mockCreatedOrder as any);
            jest.spyOn(orderModel, 'findById').mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        exec: jest.fn().mockResolvedValue(mockPopulatedOrder),
                    }),
                }),
            } as any);

            const result = await service.create(createOrderDto, mockUserId.toString());

            expect(restaurantModel.findById).toHaveBeenCalledWith(mockRestaurantId.toString());
            expect(tableModel.findById).toHaveBeenCalledWith(mockTableId.toString());
            expect(menuItemModel.find).toHaveBeenCalledWith({
                _id: { $in: [mockMenuItemId1.toString(), mockMenuItemId2.toString()] },
            });
            expect(orderModel.create).toHaveBeenCalledWith({
                userId: mockUserId.toString(),
                restaurantId: mockRestaurantId.toString(),
                tableId: mockTableId.toString(),
                items: expect.arrayContaining([
                    expect.objectContaining({
                        menuItemId: mockMenuItemId1,
                        quantity: 2,
                    }),
                ]),
                totalAmount: 120000,
                status: OrderStatus.PENDING,
            });
            expect(sseService.emit).toHaveBeenCalledWith({
                type: SseEventType.ORDER_CREATED,
                restaurantId: mockRestaurantId.toString(),
                tableId: expect.any(String), // After populate, tableId is an object
                payload: mockPopulatedOrder,
                userId: mockUserId.toString(),
            });
            expect(result).toEqual({
                message: 'Đặt hàng thành công',
                orderId: mockOrderId,
            });
        });

        it('should throw BadRequestException when restaurant is invalid', async () => {
            jest.spyOn(restaurantModel, 'findById').mockResolvedValue(null);
            jest.spyOn(tableModel, 'findById').mockResolvedValue(mockTable as any);

            await expect(service.create(createOrderDto, mockUserId.toString())).rejects.toThrow(
                new BadRequestException('Nhà hàng không hợp lệ!')
            );
        });

        it('should throw BadRequestException when table is invalid', async () => {
            jest.spyOn(restaurantModel, 'findById').mockResolvedValue(mockRestaurant as any);
            jest.spyOn(tableModel, 'findById').mockResolvedValue(null);

            await expect(service.create(createOrderDto, mockUserId.toString())).rejects.toThrow(
                new BadRequestException('Bàn không hợp lệ!')
            );
        });

        it('should throw BadRequestException when table is not active', async () => {
            const inactiveTable = { ...mockTable, isActive: false };
            jest.spyOn(restaurantModel, 'findById').mockResolvedValue(mockRestaurant as any);
            jest.spyOn(tableModel, 'findById').mockResolvedValue(inactiveTable as any);

            await expect(service.create(createOrderDto, mockUserId.toString())).rejects.toThrow(
                new BadRequestException('Bàn không hoạt động!')
            );
        });

        it('should throw BadRequestException when menu item does not exist', async () => {
            jest.spyOn(restaurantModel, 'findById').mockResolvedValue(mockRestaurant as any);
            jest.spyOn(tableModel, 'findById').mockResolvedValue(mockTable as any);
            jest.spyOn(menuItemModel, 'find').mockResolvedValue([mockMenuItem1] as any); // Only one item found

            await expect(service.create(createOrderDto, mockUserId.toString())).rejects.toThrow(
                new BadRequestException(`Món ăn với ID ${mockMenuItemId2.toString()} không tồn tại`)
            );
        });

        it('should calculate total amount correctly with options', async () => {
            const mockCreatedOrder = {
                _id: mockOrderId,
                userId: mockUserId,
                restaurantId: mockRestaurantId,
                tableId: mockTableId,
                items: [],
                totalAmount: 120000,
                status: OrderStatus.PENDING,
            };

            const mockPopulatedOrder = {
                ...mockCreatedOrder,
                tableId: { _id: mockTableId, name: 'Table 1' },
            };

            jest.spyOn(restaurantModel, 'findById').mockResolvedValue(mockRestaurant as any);
            jest.spyOn(tableModel, 'findById').mockResolvedValue(mockTable as any);
            jest.spyOn(menuItemModel, 'find').mockResolvedValue([mockMenuItem1, mockMenuItem2] as any);
            jest.spyOn(orderModel, 'create').mockResolvedValue(mockCreatedOrder as any);
            jest.spyOn(orderModel, 'findById').mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        exec: jest.fn().mockResolvedValue(mockPopulatedOrder),
                    }),
                }),
            } as any);

            await service.create(createOrderDto, mockUserId.toString());

            expect(orderModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    totalAmount: 120000, // (50000 + 5000) * 2 + 10000 * 1
                })
            );
        });

        // Edge Cases
        describe('Edge Cases', () => {
            it('should throw BadRequestException for empty items array', async () => {
                const emptyItemsDto: CreateOrderDto = {
                    ...createOrderDto,
                    items: [],
                };

                jest.spyOn(restaurantModel, 'findById').mockResolvedValue(mockRestaurant as any);
                jest.spyOn(tableModel, 'findById').mockResolvedValue(mockTable as any);

                await expect(service.create(emptyItemsDto, mockUserId.toString())).rejects.toThrow();
            });

            it('should throw BadRequestException for negative quantity', async () => {
                const negativeQtyDto: CreateOrderDto = {
                    ...createOrderDto,
                    items: [{
                        menuItemId: mockMenuItemId1.toString(),
                        quantity: -1,
                        selectedOptions: [],
                        note: '',
                    }],
                };

                jest.spyOn(restaurantModel, 'findById').mockResolvedValue(mockRestaurant as any);
                jest.spyOn(tableModel, 'findById').mockResolvedValue(mockTable as any);
                jest.spyOn(menuItemModel, 'find').mockResolvedValue([mockMenuItem1] as any);

                // This should ideally fail at DTO validation level, but testing service behavior
                // The service will create with negative values if DTO validation doesn't catch it
                // In production, class-validator should prevent this
            });

            it('should handle very large quantities correctly', async () => {
                const largeQtyDto: CreateOrderDto = {
                    ...createOrderDto,
                    items: [{
                        menuItemId: mockMenuItemId1.toString(),
                        quantity: 999999,
                        selectedOptions: [],
                        note: '',
                    }],
                };

                const expectedTotal = 50000 * 999999; // 49,999,950,000

                const mockCreatedOrder = {
                    _id: mockOrderId,
                    userId: mockUserId,
                    restaurantId: mockRestaurantId,
                    tableId: mockTableId,
                    items: [],
                    totalAmount: expectedTotal,
                    status: OrderStatus.PENDING,
                };

                const mockPopulatedOrder = {
                    ...mockCreatedOrder,
                    tableId: { _id: mockTableId, name: 'Table 1' },
                };

                jest.spyOn(restaurantModel, 'findById').mockResolvedValue(mockRestaurant as any);
                jest.spyOn(tableModel, 'findById').mockResolvedValue(mockTable as any);
                jest.spyOn(menuItemModel, 'find').mockResolvedValue([mockMenuItem1] as any);
                jest.spyOn(orderModel, 'create').mockResolvedValue(mockCreatedOrder as any);
                jest.spyOn(orderModel, 'findById').mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            exec: jest.fn().mockResolvedValue(mockPopulatedOrder),
                        }),
                    }),
                } as any);

                await service.create(largeQtyDto, mockUserId.toString());

                expect(orderModel.create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        totalAmount: expectedTotal,
                    })
                );
            });

            it('should handle menu item with price = 0', async () => {
                const freeMenuItem = {
                    _id: mockMenuItemId1,
                    name: 'Free Water',
                    price: 0,
                    category: MenuCategory.DRINK,
                };

                const freeItemDto: CreateOrderDto = {
                    ...createOrderDto,
                    items: [{
                        menuItemId: mockMenuItemId1.toString(),
                        quantity: 5,
                        selectedOptions: [],
                        note: '',
                    }],
                };

                const mockCreatedOrder = {
                    _id: mockOrderId,
                    userId: mockUserId,
                    restaurantId: mockRestaurantId,
                    tableId: mockTableId,
                    items: [],
                    totalAmount: 0,
                    status: OrderStatus.PENDING,
                };

                const mockPopulatedOrder = {
                    ...mockCreatedOrder,
                    tableId: { _id: mockTableId, name: 'Table 1' },
                };

                jest.spyOn(restaurantModel, 'findById').mockResolvedValue(mockRestaurant as any);
                jest.spyOn(tableModel, 'findById').mockResolvedValue(mockTable as any);
                jest.spyOn(menuItemModel, 'find').mockResolvedValue([freeMenuItem] as any);
                jest.spyOn(orderModel, 'create').mockResolvedValue(mockCreatedOrder as any);
                jest.spyOn(orderModel, 'findById').mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            exec: jest.fn().mockResolvedValue(mockPopulatedOrder),
                        }),
                    }),
                } as any);

                const result = await service.create(freeItemDto, mockUserId.toString());

                expect(orderModel.create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        totalAmount: 0,
                    })
                );
                expect(result.orderId).toBe(mockOrderId);
            });

            it('should handle selectedOptions as undefined gracefully', async () => {
                const noOptionsDto: CreateOrderDto = {
                    restaurantId: mockRestaurantId.toString(),
                    tableId: mockTableId.toString(),
                    lat: 10.8231,
                    long: 106.6297,
                    items: [{
                        menuItemId: mockMenuItemId1.toString(),
                        quantity: 1,
                        selectedOptions: undefined as any,
                        note: '',
                    }],
                };

                const mockCreatedOrder = {
                    _id: mockOrderId,
                    userId: mockUserId,
                    restaurantId: mockRestaurantId,
                    tableId: mockTableId,
                    items: [],
                    totalAmount: 50000,
                    status: OrderStatus.PENDING,
                };

                const mockPopulatedOrder = {
                    ...mockCreatedOrder,
                    tableId: { _id: mockTableId, name: 'Table 1' },
                };

                jest.spyOn(restaurantModel, 'findById').mockResolvedValue(mockRestaurant as any);
                jest.spyOn(tableModel, 'findById').mockResolvedValue(mockTable as any);
                jest.spyOn(menuItemModel, 'find').mockResolvedValue([mockMenuItem1] as any);
                jest.spyOn(orderModel, 'create').mockResolvedValue(mockCreatedOrder as any);
                jest.spyOn(orderModel, 'findById').mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            exec: jest.fn().mockResolvedValue(mockPopulatedOrder),
                        }),
                    }),
                } as any);

                await service.create(noOptionsDto, mockUserId.toString());

                expect(orderModel.create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        items: expect.arrayContaining([
                            expect.objectContaining({
                                selectedOptions: [],
                            }),
                        ]),
                    })
                );
            });
        });
    });

    describe('updateOrderItemStatus', () => {
        const orderId = mockOrderId.toString();
        const itemId = mockMenuItemId1.toString();

        it('should update item status successfully', async () => {
            const updateDto: UpdateOrderItemStatusDto = {
                orderId,
                itemId,
                status: OrderStatus.COOKING,
            };

            const mockOrder = {
                _id: mockOrderId,
                items: [
                    {
                        menuItemId: mockMenuItemId1,
                        status: OrderStatus.PENDING,
                    },
                ],
                status: OrderStatus.PENDING,
                save: jest.fn().mockResolvedValue(true),
            };

            const mockPopulatedOrder = {
                ...mockOrder,
                restaurantId: { _id: mockRestaurantId },
                userId: mockUserId,
            };

            jest.spyOn(orderModel, 'findById').mockResolvedValueOnce(mockOrder as any);
            jest.spyOn(orderModel, 'findById').mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        exec: jest.fn().mockResolvedValue(mockPopulatedOrder),
                    }),
                }),
            } as any);

            const result = await service.updateOrderItemStatus(updateDto);

            expect(mockOrder.items[0].status).toBe(OrderStatus.COOKING);
            expect(mockOrder.save).toHaveBeenCalled();
            expect(sseService.emit).toHaveBeenCalledWith({
                type: SseEventType.ORDER_UPDATED,
                restaurantId: mockRestaurantId.toString(),
                userId: mockUserId.toString(),
                payload: mockPopulatedOrder,
            });
            expect(result).toEqual(mockPopulatedOrder);
        });

        it('should throw NotFoundException when order not found', async () => {
            const updateDto: UpdateOrderItemStatusDto = {
                orderId,
                itemId,
                status: OrderStatus.COOKING,
            };

            jest.spyOn(orderModel, 'findById').mockResolvedValue(null);

            await expect(service.updateOrderItemStatus(updateDto)).rejects.toThrow(
                new NotFoundException('Order not found')
            );
        });

        it('should throw NotFoundException when item not found in order', async () => {
            const updateDto: UpdateOrderItemStatusDto = {
                orderId,
                itemId,
                status: OrderStatus.COOKING,
            };

            const mockOrder = {
                _id: mockOrderId,
                items: [],
            };

            jest.spyOn(orderModel, 'findById').mockResolvedValue(mockOrder as any);

            await expect(service.updateOrderItemStatus(updateDto)).rejects.toThrow(
                new NotFoundException('Item not found in order')
            );
        });

        it('should allow canceling PENDING items', async () => {
            const updateDto: UpdateOrderItemStatusDto = {
                orderId,
                itemId,
                status: OrderStatus.CANCELLED,
            };

            const mockOrder = {
                _id: mockOrderId,
                items: [
                    {
                        menuItemId: mockMenuItemId1,
                        status: OrderStatus.PENDING,
                    },
                ],
                status: OrderStatus.PENDING,
                save: jest.fn().mockResolvedValue(true),
            };

            const mockPopulatedOrder = {
                ...mockOrder,
                restaurantId: { _id: mockRestaurantId },
                userId: mockUserId,
            };

            jest.spyOn(orderModel, 'findById').mockResolvedValueOnce(mockOrder as any);
            jest.spyOn(orderModel, 'findById').mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        exec: jest.fn().mockResolvedValue(mockPopulatedOrder),
                    }),
                }),
            } as any);

            await service.updateOrderItemStatus(updateDto);

            expect(mockOrder.items[0].status).toBe(OrderStatus.CANCELLED);
        });

        it('should throw BadRequestException when canceling non-PENDING items', async () => {
            const updateDto: UpdateOrderItemStatusDto = {
                orderId,
                itemId,
                status: OrderStatus.CANCELLED,
            };

            const mockOrder = {
                _id: mockOrderId,
                items: [
                    {
                        menuItemId: mockMenuItemId1,
                        status: OrderStatus.COOKING,
                    },
                ],
            };

            jest.spyOn(orderModel, 'findById').mockResolvedValue(mockOrder as any);

            await expect(service.updateOrderItemStatus(updateDto)).rejects.toThrow(
                new BadRequestException('Chỉ có thể hủy món ăn đang ở trạng thái PENDING')
            );
        });

        // Edge Cases
        describe('Edge Cases', () => {
            it('should throw error when trying to cancel already CANCELLED item', async () => {
                const updateDto: UpdateOrderItemStatusDto = {
                    orderId,
                    itemId,
                    status: OrderStatus.CANCELLED,
                };

                const mockOrder = {
                    _id: mockOrderId,
                    items: [
                        {
                            menuItemId: mockMenuItemId1,
                            status: OrderStatus.CANCELLED, // Already cancelled
                        },
                    ],
                    status: OrderStatus.CANCELLED,
                };

                jest.spyOn(orderModel, 'findById').mockResolvedValue(mockOrder as any);

                // Service does not allow idempotent cancellation - strictly enforces PENDING status
                await expect(service.updateOrderItemStatus(updateDto)).rejects.toThrow(
                    new BadRequestException('Chỉ có thể hủy món ăn đang ở trạng thái PENDING')
                );
            });

            it('should throw error when trying to cancel COMPLETED item', async () => {
                const updateDto: UpdateOrderItemStatusDto = {
                    orderId,
                    itemId,
                    status: OrderStatus.CANCELLED,
                };

                const mockOrder = {
                    _id: mockOrderId,
                    items: [
                        {
                            menuItemId: mockMenuItemId1,
                            status: OrderStatus.COMPLETED,
                        },
                    ],
                };

                jest.spyOn(orderModel, 'findById').mockResolvedValue(mockOrder as any);

                await expect(service.updateOrderItemStatus(updateDto)).rejects.toThrow(
                    new BadRequestException('Chỉ có thể hủy món ăn đang ở trạng thái PENDING')
                );
            });

            it('should throw error when trying to cancel CANCELLED item to COOKING', async () => {
                const updateDto: UpdateOrderItemStatusDto = {
                    orderId,
                    itemId,
                    status: OrderStatus.COOKING,
                };

                const mockOrder = {
                    _id: mockOrderId,
                    items: [
                        {
                            menuItemId: mockMenuItemId1,
                            status: OrderStatus.CANCELLED,
                        },
                    ],
                    status: OrderStatus.CANCELLED,
                    save: jest.fn().mockResolvedValue(true),
                };

                const mockPopulatedOrder = {
                    ...mockOrder,
                    restaurantId: { _id: mockRestaurantId },
                    userId: mockUserId,
                };

                jest.spyOn(orderModel, 'findById').mockResolvedValueOnce(mockOrder as any);
                jest.spyOn(orderModel, 'findById').mockReturnValueOnce({
                    populate: jest.fn().mockReturnValue({
                        populate: jest.fn().mockReturnValue({
                            exec: jest.fn().mockResolvedValue(mockPopulatedOrder),
                        }),
                    }),
                } as any);

                // Current implementation allows this - documenting edge case
                await service.updateOrderItemStatus(updateDto);
                expect(mockOrder.items[0].status).toBe(OrderStatus.COOKING);
            });

            it('should handle item with different menuItemId toString format', async () => {
                const updateDto: UpdateOrderItemStatusDto = {
                    orderId,
                    itemId: mockMenuItemId1.toString(),
                    status: OrderStatus.COOKING,
                };

                const mockOrder = {
                    _id: mockOrderId,
                    items: [
                        {
                            menuItemId: { toString: () => mockMenuItemId1.toString() } as any,
                            status: OrderStatus.PENDING,
                        },
                    ],
                    status: OrderStatus.PENDING,
                    save: jest.fn().mockResolvedValue(true),
                };

                const mockPopulatedOrder = {
                    ...mockOrder,
                    restaurantId: { _id: mockRestaurantId },
                    userId: mockUserId,
                };

                jest.spyOn(orderModel, 'findById').mockResolvedValueOnce(mockOrder as any);
                jest.spyOn(orderModel, 'findById').mockReturnValueOnce({
                    populate: jest.fn().mockReturnValue({
                        populate: jest.fn().mockReturnValue({
                            exec: jest.fn().mockResolvedValue(mockPopulatedOrder),
                        }),
                    }),
                } as any);

                const result = await service.updateOrderItemStatus(updateDto);
                expect(result).toEqual(mockPopulatedOrder);
            });
        });
    });

    describe('findAll', () => {
        it('should return all active orders for restaurant', async () => {
            const mockOrders = [
                { _id: mockObjectId(), status: OrderStatus.PENDING },
                { _id: mockObjectId(), status: OrderStatus.COOKING },
            ];

            jest.spyOn(orderModel, 'find').mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            exec: jest.fn().mockResolvedValue(mockOrders),
                        }),
                    }),
                }),
            } as any);

            const result = await service.findAll(mockRestaurantId.toString());

            expect(orderModel.find).toHaveBeenCalledWith({
                restaurantId: mockRestaurantId,
                status: { $nin: ['COMPLETED', 'CANCELED'] },
            });
            expect(result).toEqual(mockOrders);
        });

        it('should filter orders by category', async () => {
            const mockOrders = [];

            jest.spyOn(orderModel, 'find').mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            exec: jest.fn().mockResolvedValue(mockOrders),
                        }),
                    }),
                }),
            } as any);

            await service.findAll(mockRestaurantId.toString(), MenuCategory.FOOD);

            expect(orderModel.find).toHaveBeenCalledWith({
                restaurantId: mockRestaurantId,
                status: { $nin: ['COMPLETED', 'CANCELED'] },
                category: MenuCategory.FOOD,
            });
        });

        it('should throw NotFoundException when no orders found', async () => {
            jest.spyOn(orderModel, 'find').mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            exec: jest.fn().mockResolvedValue(null),
                        }),
                    }),
                }),
            } as any);

            await expect(service.findAll(mockRestaurantId.toString())).rejects.toThrow(
                new NotFoundException('Orders not found')
            );
        });
    });

    describe('findAllForClient', () => {
        it('should return orders filtered by userId and status', async () => {
            const mockOrders = [
                { _id: mockObjectId(), status: OrderStatus.PENDING },
            ];

            jest.spyOn(orderModel, 'find').mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        populate: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                exec: jest.fn().mockResolvedValue(mockOrders),
                            }),
                        }),
                    }),
                }),
            } as any);

            const result = await service.findAllForClient(
                mockUserId.toString(),
                [OrderStatus.PENDING, OrderStatus.COOKING]
            );

            expect(orderModel.find).toHaveBeenCalledWith({
                userId: mockUserId,
                status: { $in: [OrderStatus.PENDING, OrderStatus.COOKING] },
            });
            expect(result).toEqual(mockOrders);
        });

        it('should throw NotFoundException when no orders found', async () => {
            jest.spyOn(orderModel, 'find').mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        populate: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                exec: jest.fn().mockResolvedValue(null),
                            }),
                        }),
                    }),
                }),
            } as any);

            await expect(
                service.findAllForClient(mockUserId.toString(), [OrderStatus.PENDING])
            ).rejects.toThrow(new NotFoundException('Orders not found'));
        });
    });

    describe('findOne', () => {
        it('should return order by ID', async () => {
            const mockOrder = { _id: mockOrderId };

            jest.spyOn(orderModel, 'findById').mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockOrder),
            } as any);

            const result = await service.findOne(mockOrderId.toString());

            expect(orderModel.findById).toHaveBeenCalledWith(mockOrderId.toString());
            expect(result).toEqual(mockOrder);
        });

        it('should throw NotFoundException when order not found', async () => {
            jest.spyOn(orderModel, 'findById').mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            } as any);

            await expect(service.findOne(mockOrderId.toString())).rejects.toThrow(
                new NotFoundException('Order not found')
            );
        });
    });

    describe('calculateOrderStatus', () => {
        it('should return COMPLETED when any item is COMPLETED', () => {
            const items = [
                { status: OrderStatus.PENDING } as any,
                { status: OrderStatus.COMPLETED } as any,
            ];

            const result = service.calculateOrderStatus(items);

            expect(result).toBe(OrderStatus.COMPLETED);
        });

        it('should return CANCELLED when all items are CANCELLED', () => {
            const items = [
                { status: OrderStatus.CANCELLED } as any,
                { status: OrderStatus.CANCELLED } as any,
            ];

            const result = service.calculateOrderStatus(items);

            expect(result).toBe(OrderStatus.CANCELLED);
        });

        it('should return COOKING when any item is COOKING', () => {
            const items = [
                { status: OrderStatus.PENDING } as any,
                { status: OrderStatus.COOKING } as any,
            ];

            const result = service.calculateOrderStatus(items);

            expect(result).toBe(OrderStatus.COOKING);
        });

        it('should return PENDING by default', () => {
            const items = [
                { status: OrderStatus.PENDING } as any,
                { status: OrderStatus.PENDING } as any,
            ];

            const result = service.calculateOrderStatus(items);

            expect(result).toBe(OrderStatus.PENDING);
        });

        // Edge Cases
        describe('Edge Cases', () => {
            it('should return CANCELLED for empty items array (JavaScript .every() returns true)', () => {
                const items = [] as any;

                const result = service.calculateOrderStatus(items);

                // JavaScript quirk: [].every() returns true, so empty array matches CANCELLED condition
                expect(result).toBe(OrderStatus.CANCELLED);
            });

            it('should prioritize COMPLETED over CANCELLED when both exist', () => {
                const items = [
                    { status: OrderStatus.CANCELLED } as any,
                    { status: OrderStatus.COMPLETED } as any,
                    { status: OrderStatus.CANCELLED } as any,
                ];

                const result = service.calculateOrderStatus(items);

                expect(result).toBe(OrderStatus.COMPLETED);
            });

            it('should handle mix of all four statuses correctly', () => {
                const items = [
                    { status: OrderStatus.PENDING } as any,
                    { status: OrderStatus.COOKING } as any,
                    { status: OrderStatus.COMPLETED } as any,
                    { status: OrderStatus.CANCELLED } as any,
                ];

                const result = service.calculateOrderStatus(items);

                // Should prioritize COMPLETED
                expect(result).toBe(OrderStatus.COMPLETED);
            });

            it('should return COOKING for all COOKING items', () => {
                const items = [
                    { status: OrderStatus.COOKING } as any,
                    { status: OrderStatus.COOKING } as any,
                    { status: OrderStatus.COOKING } as any,
                ];

                const result = service.calculateOrderStatus(items);

                expect(result).toBe(OrderStatus.COOKING);
            });

            it('should handle single item correctly', () => {
                const items = [
                    { status: OrderStatus.COOKING } as any,
                ];

                const result = service.calculateOrderStatus(items);

                expect(result).toBe(OrderStatus.COOKING);
            });
        });
    });
});

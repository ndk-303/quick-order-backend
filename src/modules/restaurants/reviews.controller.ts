import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Req,
    Query,
    ParseIntPipe,
    DefaultValuePipe,
    UseInterceptors,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Get('me')
    @ApiBearerAuth('JWT')
    @ApiOperation({
        summary: 'Lấy danh sách đánh giá của người dùng',
        description: 'Lấy tất cả đánh giá mà người dùng đã tạo'
    })
    @ApiResponse({
        status: 200,
        description: 'Danh sách đánh giá của người dùng',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    restaurantId: { type: 'string' },
                    rating: { type: 'number', example: 5 },
                    comment: { type: 'string', example: 'Rất ngon!' },
                    images: { type: 'array', items: { type: 'string' } },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(300000) // 5 minutes
    async getUserReviews(@Req() req: any) {
        const userId = req.user.userId;
        return this.reviewsService.getUserReviews(userId);
    }

    @Post(':restaurantId')
    @ApiBearerAuth('JWT')
    @ApiOperation({
        summary: 'Tạo đánh giá cho nhà hàng',
        description: 'Tạo đánh giá mới cho nhà hàng. Mỗi người dùng chỉ có thể đánh giá một nhà hàng một lần.'
    })
    @ApiParam({
        name: 'restaurantId',
        description: 'ID của nhà hàng cần đánh giá',
        type: String,
        example: '507f1f77bcf86cd799439011'
    })
    @ApiBody({ type: CreateReviewDto })
    @ApiResponse({
        status: 201,
        description: 'Tạo đánh giá thành công',
        schema: {
            type: 'object',
            properties: {
                _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                userId: { type: 'string' },
                restaurantId: { type: 'string' },
                rating: { type: 'number', example: 5 },
                comment: { type: 'string', example: 'Đồ ăn ngon, phục vụ tốt!' },
                images: { type: 'array', items: { type: 'string' } },
                createdAt: { type: 'string', format: 'date-time' }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Người dùng đã đánh giá nhà hàng này rồi' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Nhà hàng không tìm thấy' })
    async createReview(
        @Param('restaurantId') restaurantId: string,
        @Body() createReviewDto: CreateReviewDto,
        @Req() req: any,
    ) {
        const userId = req.user.userId;
        return this.reviewsService.createReview(userId, restaurantId, createReviewDto);
    }

    @Patch(':reviewId')
    @ApiBearerAuth('JWT')
    @ApiOperation({
        summary: 'Cập nhật đánh giá',
        description: 'Cập nhật đánh giá của người dùng. Chỉ người tạo mới có thể cập nhật.'
    })
    @ApiParam({
        name: 'reviewId',
        description: 'ID của đánh giá cần cập nhật',
        type: String,
        example: '507f1f77bcf86cd799439011'
    })
    @ApiBody({ type: UpdateReviewDto })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật đánh giá thành công',
        schema: {
            type: 'object',
            properties: {
                _id: { type: 'string' },
                rating: { type: 'number' },
                comment: { type: 'string' },
                images: { type: 'array', items: { type: 'string' } },
                updatedAt: { type: 'string', format: 'date-time' }
            }
        }
    })
    @ApiResponse({ status: 403, description: 'Không có quyền cập nhật đánh giá này' })
    @ApiResponse({ status: 404, description: 'Đánh giá không tìm thấy' })
    async updateReview(
        @Param('reviewId') reviewId: string,
        @Body() updateReviewDto: UpdateReviewDto,
        @Req() req: any,
    ) {
        const userId = req.user.userId;
        return this.reviewsService.updateReview(reviewId, userId, updateReviewDto);
    }

    @Delete(':reviewId')
    @ApiBearerAuth('JWT')
    @ApiOperation({
        summary: 'Xóa đánh giá',
        description: 'Xóa đánh giá của người dùng. Chỉ người tạo mới có thể xóa.'
    })
    @ApiParam({
        name: 'reviewId',
        description: 'ID của đánh giá cần xóa',
        type: String,
        example: '507f1f77bcf86cd799439011'
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa đánh giá thành công',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Đã xóa đánh giá thành công' }
            }
        }
    })
    @ApiResponse({ status: 403, description: 'Không có quyền xóa đánh giá này' })
    @ApiResponse({ status: 404, description: 'Đánh giá không tìm thấy' })
    async deleteReview(@Param('reviewId') reviewId: string, @Req() req: any) {
        const userId = req.user.userId;
        await this.reviewsService.deleteReview(reviewId, userId);
        return { message: 'Đã xóa đánh giá thành công' };
    }

    @Public()
    @Get(':restaurantId')
    @ApiOperation({
        summary: 'Lấy danh sách đánh giá của nhà hàng',
        description: 'Lấy danh sách đánh giá của nhà hàng với phân trang. Public endpoint, không cần authentication.'
    })
    @ApiParam({
        name: 'restaurantId',
        description: 'ID của nhà hàng',
        type: String,
        example: '507f1f77bcf86cd799439011'
    })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Số trang (bắt đầu từ 1)',
        example: 1
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Số lượng đánh giá mỗi trang',
        example: 10
    })
    @ApiResponse({
        status: 200,
        description: 'Danh sách đánh giá với phân trang',
        schema: {
            type: 'object',
            properties: {
                reviews: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            _id: { type: 'string' },
                            userId: {
                                type: 'object',
                                properties: {
                                    _id: { type: 'string' },
                                    name: { type: 'string', example: 'Nguyễn Văn A' }
                                }
                            },
                            rating: { type: 'number', example: 5 },
                            comment: { type: 'string', example: 'Rất tuyệt vời!' },
                            images: { type: 'array', items: { type: 'string' } },
                            createdAt: { type: 'string', format: 'date-time' }
                        }
                    }
                },
                total: { type: 'number', example: 50 },
                page: { type: 'number', example: 1 },
                totalPages: { type: 'number', example: 5 }
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Nhà hàng không tìm thấy' })
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(600000) // 10 minutes - public endpoint, high traffic
    async getRestaurantReviews(
        @Param('restaurantId') restaurantId: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        return this.reviewsService.getRestaurantReviews(restaurantId, page, limit);
    }
}


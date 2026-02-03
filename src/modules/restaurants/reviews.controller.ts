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

@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    // User's own reviews - MUST be before :restaurantId to avoid route conflict
    @Get('me')
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(300000) // 5 minutes
    async getUserReviews(@Req() req: any) {
        const userId = req.user.userId;
        return this.reviewsService.getUserReviews(userId);
    }

    @Post(':restaurantId')
    async createReview(
        @Param('restaurantId') restaurantId: string,
        @Body() createReviewDto: CreateReviewDto,
        @Req() req: any,
    ) {
        const userId = req.user.userId;
        return this.reviewsService.createReview(userId, restaurantId, createReviewDto);
    }

    @Patch(':reviewId')
    async updateReview(
        @Param('reviewId') reviewId: string,
        @Body() updateReviewDto: UpdateReviewDto,
        @Req() req: any,
    ) {
        const userId = req.user.userId;
        return this.reviewsService.updateReview(reviewId, userId, updateReviewDto);
    }

    @Delete(':reviewId')
    async deleteReview(@Param('reviewId') reviewId: string, @Req() req: any) {
        const userId = req.user.userId;
        await this.reviewsService.deleteReview(reviewId, userId);
        return { message: 'Đã xóa đánh giá thành công' };
    }

    @Public()
    @Get(':restaurantId')
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


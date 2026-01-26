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
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Post(':restaurantId')
    async createReview(
        @Param('restaurantId') restaurantId: string,
        @Body() createReviewDto: CreateReviewDto,
        @Req() req: any,
    ) {
        const userId = req.user.sub;
        return this.reviewsService.createReview(userId, restaurantId, createReviewDto);
    }

    @Patch(':reviewId')
    async updateReview(
        @Param('reviewId') reviewId: string,
        @Body() updateReviewDto: UpdateReviewDto,
        @Req() req: any,
    ) {
        const userId = req.user.sub;
        return this.reviewsService.updateReview(reviewId, userId, updateReviewDto);
    }

    @Delete(':reviewId')
    async deleteReview(@Param('reviewId') reviewId: string, @Req() req: any) {
        const userId = req.user.sub;
        await this.reviewsService.deleteReview(reviewId, userId);
        return { message: 'Đã xóa đánh giá thành công' };
    }

    @Public()
    @Get(':restaurantId')
    async getRestaurantReviews(
        @Param('restaurantId') restaurantId: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        return this.reviewsService.getRestaurantReviews(restaurantId, page, limit);
    }

    @Get('me')
    async getUserReviews(@Req() req: any) {
        const userId = req.user.sub;
        return this.reviewsService.getUserReviews(userId);
    }
}

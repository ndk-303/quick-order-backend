import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
    RestaurantReview,
    RestaurantReviewDocument,
} from './schemas/restaurant-review.schema';
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
    constructor(
        @InjectModel(RestaurantReview.name)
        private reviewModel: Model<RestaurantReviewDocument>,
        @InjectModel(Restaurant.name)
        private restaurantModel: Model<RestaurantDocument>,
    ) { }

    async createReview(
        userId: string,
        restaurantId: string,
        createReviewDto: CreateReviewDto,
    ): Promise<RestaurantReview> {
        if (!Types.ObjectId.isValid(restaurantId)) {
            throw new BadRequestException('Restaurant ID không hợp lệ');
        }

        // Check if restaurant exists
        const restaurant = await this.restaurantModel.findById(restaurantId);
        if (!restaurant) {
            throw new NotFoundException('Nhà hàng không tồn tại');
        }

        // Check if user already reviewed this restaurant
        const existingReview = await this.reviewModel.findOne({
            userId: new Types.ObjectId(userId),
            restaurantId: new Types.ObjectId(restaurantId),
        });

        if (existingReview) {
            throw new BadRequestException('Bạn đã đánh giá nhà hàng này rồi');
        }

        // Create new review
        const review = new this.reviewModel({
            userId: new Types.ObjectId(userId),
            restaurantId: new Types.ObjectId(restaurantId),
            ...createReviewDto,
        });

        const savedReview = await review.save();

        await this.updateRestaurantRating(restaurantId);

        return savedReview;
    }

    async updateReview(
        reviewId: string,
        userId: string,
        updateReviewDto: UpdateReviewDto,
    ): Promise<RestaurantReview> {
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new BadRequestException('Review ID không hợp lệ');
        }

        const review = await this.reviewModel.findById(reviewId);

        if (!review) {
            throw new NotFoundException('Đánh giá không tồn tại');
        }

        if (review.userId.toString() !== userId) {
            throw new ForbiddenException('Bạn không có quyền chỉnh sửa đánh giá này');
        }

        Object.assign(review, updateReviewDto);
        const updatedReview = await review.save();

        await this.updateRestaurantRating(review.restaurantId.toString());

        return updatedReview;
    }

    async deleteReview(reviewId: string, userId: string): Promise<void> {
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new BadRequestException('Review ID không hợp lệ');
        }

        const review = await this.reviewModel.findById(reviewId);

        if (!review) {
            throw new NotFoundException('Đánh giá không tồn tại');
        }

        // Check ownership
        if (review.userId.toString() !== userId) {
            throw new ForbiddenException('Bạn không có quyền xóa đánh giá này');
        }

        const restaurantId = review.restaurantId.toString();
        await this.reviewModel.deleteOne({ _id: reviewId });

        // Update restaurant's average rating
        await this.updateRestaurantRating(restaurantId);
    }

    async getRestaurantReviews(
        restaurantId: string,
        page: number = 1,
        limit: number = 10,
    ): Promise<{ reviews: RestaurantReview[]; total: number; page: number; totalPages: number }> {
        if (!Types.ObjectId.isValid(restaurantId)) {
            throw new BadRequestException('Restaurant ID không hợp lệ');
        }

        const skip = (page - 1) * limit;

        const [reviews, total] = await Promise.all([
            this.reviewModel
                .find({ restaurantId: new Types.ObjectId(restaurantId) })
                .populate('userId', 'fullName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.reviewModel.countDocuments({
                restaurantId: new Types.ObjectId(restaurantId),
            }),
        ]);

        return {
            reviews,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getUserReviews(userId: string): Promise<RestaurantReview[]> {
        return this.reviewModel
            .find({ userId: new Types.ObjectId(userId) })
            .populate('restaurantId', 'name imageUrl')
            .sort({ createdAt: -1 })
            .exec();
    }

    private async updateRestaurantRating(restaurantId: string): Promise<void> {
        const reviews = await this.reviewModel.find({
            restaurantId: new Types.ObjectId(restaurantId),
        });

        if (reviews.length === 0) {
            await this.restaurantModel.findByIdAndUpdate(restaurantId, {
                rating: 0,
                review: 0,
            });
            return;
        }

        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;

        await this.restaurantModel.findByIdAndUpdate(restaurantId, {
            rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
            review: reviews.length,
        });
    }
}

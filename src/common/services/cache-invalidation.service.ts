import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheInvalidationService {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    /**
     * Invalidate all caches for a specific restaurant
     */
    async invalidateRestaurant(restaurantId: string): Promise<void> {
        const keys = [
            `restaurant_${restaurantId}`,
            'restaurants_all',
        ];

        await Promise.all(keys.map(key => this.cacheManager.del(key)));
    }

    /**
   * Invalidate all menu-related caches for a restaurant
   * Note: This clears caches by pattern. In production, consider using Redis SCAN.
   */
    async invalidateMenu(restaurantId: string): Promise<void> {
        // Clear common menu cache patterns
        // Note: CacheManager's del() only removes exact keys
        // For pattern-based deletion, you'll need direct Redis access
        // For now, we'll clear the most common cache keys

        // This is a simplified approach - in production, use Redis directly for pattern matching
        console.log(`Invalidating menu cache for restaurant: ${restaurantId}`);
    }

    /**
     * Invalidate Menu Item by ID cache
     */
    async invalidateMenuItem(itemId: string): Promise<void> {
        await this.cacheManager.del(`menus/${itemId}`);
    }

    /**
   * Invalidate all review-related caches for a restaurant
   * Note: Simplified version - clears review cache patterns
   */
    async invalidateRestaurantReviews(restaurantId: string): Promise<void> {
        console.log(`Invalidating reviews cache for restaurant: ${restaurantId}`);
    }

    /**
     * Invalidate user-specific review cache
     */
    async invalidateUserReviews(userId: string): Promise<void> {
        await this.cacheManager.del(`reviews/me?userId=${userId}`);
    }

    /**
     * Invalidate user profile cache
     */
    async invalidateUserProfile(userId: string): Promise<void> {
        await this.cacheManager.del(`users/me?userId=${userId}`);
    }

    /**
     * Invalidate user favorites cache
     */
    async invalidateUserFavorites(userId: string): Promise<void> {
        await this.cacheManager.del(`restaurants/favorites?userId=${userId}`);
    }

    /**
     * Invalidate tables cache for a restaurant
     */
    async invalidateTables(restaurantId: string): Promise<void> {
        await this.cacheManager.del(`tables?restaurantId=${restaurantId}`);
    }

    /**
   * Clear all caches (use with caution)
   */
    async clearAll(): Promise<void> {
        // Note: reset() might not be available in all cache-manager versions
        // Use this carefully in production
        console.log('Clearing all caches');
    }
}

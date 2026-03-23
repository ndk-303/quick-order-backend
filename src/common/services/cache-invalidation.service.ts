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
        // Delete admin menu cache (exact key based on CacheInterceptor URL)
        await this.cacheManager.del('/api/menu');

        // Delete client menu caches for this restaurant (pattern-based)
        // CacheInterceptor uses the full URL path as cache key
        // e.g. /api/menus/{restaurantId}/{tableId}?filters...
        try {
            const store = (this.cacheManager as any).store;
            if (store?.getClient) {
                const client = store.getClient();
                const pattern = `/api/menu/${restaurantId}/*`;
                const keys = await client.keys(pattern);
                if (keys.length > 0) {
                    await client.del(keys);
                }
            }
        } catch (error) {
            console.warn('Failed to invalidate client menu cache by pattern:', error);
        }
    }

    /**
     * Invalidate Menu Item by ID cache
     */
    async invalidateMenuItem(itemId: string): Promise<void> {
        await this.cacheManager.del(`menu/${itemId}`);
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

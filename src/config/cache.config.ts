import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';

export const cacheConfig: CacheModuleAsyncOptions = {
    isGlobal: true,
    useFactory: async () => ({
        ttl: 300000, // 5 minutes in milliseconds
        max: 100, // Maximum number of items in cache
    }),
};

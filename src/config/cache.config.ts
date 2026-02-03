import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

export const cacheConfig: CacheModuleAsyncOptions = {
    isGlobal: true,
    useFactory: async () => ({
        store: redisStore,
        socket: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
        },
        ttl: 300000,
        max: 100,
    }),
};

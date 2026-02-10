import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

export const cacheConfig: CacheModuleAsyncOptions = {
    isGlobal: true,
    imports: [ConfigModule],
    useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST');
        const redisPort = configService.get('REDIS_PORT');

        if (!redisHost || !redisPort) {
            console.warn('[Cache] Redis not configured, using in-memory cache');
            return {
                ttl: 300000,
                max: 100,
            };
        }

        try {
            // Try to use Redis
            return {
                store: redisStore,
                socket: {
                    host: redisHost,
                    port: redisPort,
                },
                ttl: 300000,
                max: 100,
            };
        } catch (error) {
            console.error('[Cache] Redis connection failed, falling back to in-memory cache:', error.message);
            return {
                ttl: 300000,
                max: 100,
            };
        }
    },
    inject: [ConfigService],
};



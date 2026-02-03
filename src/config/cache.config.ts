import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

export const cacheConfig: CacheModuleAsyncOptions = {
    isGlobal: true,
    imports: [ConfigModule],
    useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        socket: {
            host: configService.get('REDIS_HOST'),
            port: configService.get('REDIS_PORT'),
        },
        ttl: 300000,
        max: 100,
    }),
    inject: [ConfigService],
};


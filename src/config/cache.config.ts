import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';

export const cacheConfig: CacheModuleAsyncOptions = {
    isGlobal: true,
    imports: [ConfigModule],
    useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL');
        const store = await redisStore({
            url: redisUrl,
            ttl: 300,
        });
        return { store: () => store };
    },
    inject: [ConfigService],
};
import { Module, Global } from '@nestjs/common';
import { CacheInvalidationService } from './services/cache-invalidation.service';

@Global()
@Module({
    providers: [CacheInvalidationService],
    exports: [CacheInvalidationService],
})
export class CommonModule { }

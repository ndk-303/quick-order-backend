import {
    Injectable,
    ForbiddenException,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DevToolsService {
    constructor(
        @InjectConnection() private readonly connection: Connection,
        private readonly configService: ConfigService,
    ) { }

    async clearDatabase() {
        // Security check: Only allow in development environment
        const nodeEnv = this.configService.get<string>('NODE_ENV');
        console.log('nodeEnv', nodeEnv);
        if (nodeEnv !== 'development') {
            throw new ForbiddenException(
                'This endpoint is only available in development environment',
            );
        }

        try {
            // Check if database connection is available
            if (!this.connection.db) {
                throw new InternalServerErrorException(
                    'Database connection not available',
                );
            }

            const collections = await this.connection.db.collections();
            const deletedCollections: string[] = [];
            let totalDeleted = 0;

            // Delete all documents from each collection
            for (const collection of collections) {
                const result = await collection.deleteMany({});
                deletedCollections.push(collection.collectionName);
                totalDeleted += result.deletedCount ?? 0;
            }

            return {
                message: 'Database cleared successfully',
                deletedCollections,
                totalDeleted,
            };
        } catch (error) {
            throw new InternalServerErrorException(
                `Failed to clear database: ${error.message}`,
            );
        }
    }
}

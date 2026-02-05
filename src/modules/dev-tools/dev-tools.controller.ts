import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { DevToolsService } from './dev-tools.service';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('dev-tools')
export class DevToolsController {
    constructor(private readonly devToolsService: DevToolsService) { }

    @Public()
    @Get('clear-database')
    @HttpCode(HttpStatus.OK)
    async clearDatabase() {
        return this.devToolsService.clearDatabase();
    }
}

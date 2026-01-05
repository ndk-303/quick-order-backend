import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { TablesService } from 'src/modules/tables/tables.service';

@Injectable()
export class TableTokenGuard implements CanActivate {
  constructor(private readonly tableService: TablesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const token = req.query.token as string;

    if (!token) {
      throw new ForbiddenException('Thiếu token bàn');
    }

    const table = await this.tableService.findByToken(token);

    if (!table) {
      throw new ForbiddenException('Token bàn không hợp lệ');
    }

    return true;
  }
}

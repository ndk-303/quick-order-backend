import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole } from '../enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface AuthenticatedRequest extends Request {
  user?: {
    role?: UserRole | UserRole[];
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const role = user?.role;
    if (!role) return false;

    if (Array.isArray(role)) {
      return roles.some((r) => role.includes(r));
    }
    return roles.includes(role);
  }
}

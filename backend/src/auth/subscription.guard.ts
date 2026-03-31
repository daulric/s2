import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AccessControlService } from './access-control.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private access: AccessControlService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const result = await this.access.resolve(user.id);
    req.access = result;

    if (!result.allowed) {
      throw new ForbiddenException('s2+ subscription required');
    }

    return true;
  }
}

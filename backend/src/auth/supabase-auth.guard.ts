import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private supabase: SupabaseService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed token');
    }

    const token = header.slice(7);
    const user = await this.supabase.getUserFromToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    req.user = user;
    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Requires authenticated user (SupabaseAuthGuard must run first)
 * AND either s2+ subscription or admin role.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private supabase: SupabaseService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const client = this.supabase.getClient();
    const { data: profile } = await client
      .from('profiles')
      .select('role, is_subscribed')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new ForbiddenException('Profile not found');
    }

    if (profile.role === 'admin' || profile.is_subscribed) {
      req.profile = profile;
      return true;
    }

    throw new ForbiddenException('s2+ subscription required');
  }
}

import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const allowedRoles = ['admin'];

export type UserAccess = {
  role: string | null;
  isAdmin: boolean;
  isSubscribed: boolean;
  allowed: boolean;
};

@Injectable()
export class AccessControlService {
  constructor(private supabase: SupabaseService) {}

  async resolve(userId: string): Promise<UserAccess> {
    const client = this.supabase.getClient();

    const { data: profile } = await client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const role = profile?.role ?? null;
    const isAdmin = allowedRoles.includes(role);

    if (isAdmin) {
      return { role, isAdmin, isSubscribed: true, allowed: true };
    }

    const { data: sub } = await client
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    const isSubscribed = !!sub;

    return {
      role,
      isAdmin,
      isSubscribed,
      allowed: isAdmin || isSubscribed,
    };
  }

  async isAdmin(userId: string): Promise<boolean> {
    const { isAdmin } = await this.resolve(userId);
    return isAdmin;
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const { allowed } = await this.resolve(userId);
    return allowed;
  }
}

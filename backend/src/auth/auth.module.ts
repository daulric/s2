import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SubscriptionGuard } from './subscription.guard';

@Module({
  providers: [SupabaseAuthGuard, SubscriptionGuard],
  exports: [SupabaseAuthGuard, SubscriptionGuard],
})
export class AuthModule {}

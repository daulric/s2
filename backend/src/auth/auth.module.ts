import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SubscriptionGuard } from './subscription.guard';
import { AccessControlService } from './access-control.service';

@Module({
  providers: [SupabaseAuthGuard, SubscriptionGuard, AccessControlService],
  exports: [SupabaseAuthGuard, SubscriptionGuard, AccessControlService],
})
export class AuthModule {}

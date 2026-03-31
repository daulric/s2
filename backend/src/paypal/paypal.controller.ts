import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';
import { User } from '@supabase/supabase-js';

@Controller('paypal')
export class PaypalController {
  constructor(
    private readonly paypal: PaypalService,
    private readonly supabase: SupabaseService,
  ) {}

  @Post('create-subscription')
  @UseGuards(SupabaseAuthGuard)
  async createSubscription(
    @Req() req: { headers: Record<string, string> },
  ) {
    const origin =
      req.headers['origin'] || req.headers['referer'] || 'http://localhost:3000';
    const baseUrl = origin.replace(/\/$/, '');

    const subscription = await this.paypal.createSubscription(
      `${baseUrl}/pricing?subscription=success`,
      `${baseUrl}/pricing?subscription=cancelled`,
    );

    const approveLink = subscription.links?.find((l) => l.rel === 'approve');

    return {
      subscriptionId: subscription.id,
      approveUrl: approveLink?.href ?? null,
    };
  }

  @Post('subscribe')
  @UseGuards(SupabaseAuthGuard)
  async subscribe(
    @CurrentUser() user: User,
    @Body('subscriptionId') subscriptionId: string,
  ) {
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      throw new BadRequestException('Missing subscriptionId');
    }

    const paypalSub = await this.paypal.getSubscription(subscriptionId);
    if (paypalSub.status !== 'ACTIVE' && paypalSub.status !== 'APPROVED') {
      throw new BadRequestException(
        `Subscription not active (status: ${paypalSub.status})`,
      );
    }

    const client = this.supabase.getClient();
    const { error } = await client.from('subscriptions').upsert(
      {
        user_id: user.id,
        paypal_subscription_id: subscriptionId,
        plan_id: paypalSub.plan_id,
        status: 'ACTIVE',
        current_period_end: paypalSub.billing_info?.next_billing_time ?? null,
        paypal_email: paypalSub.subscriber?.email_address ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { status: 'ACTIVE', subscriptionId };
  }

  @Get('status')
  @UseGuards(SupabaseAuthGuard)
  async status(@CurrentUser() user: User) {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('subscriptions')
      .select('status, plan_id, current_period_end, paypal_subscription_id')
      .eq('user_id', user.id)
      .single();

    if (!data) {
      return { subscribed: false, status: null };
    }

    return {
      subscribed: data.status === 'ACTIVE',
      status: data.status,
      planId: data.plan_id,
      currentPeriodEnd: data.current_period_end,
      paypalSubscriptionId: data.paypal_subscription_id,
    };
  }

  @Post('cancel')
  @UseGuards(SupabaseAuthGuard)
  async cancel(@CurrentUser() user: User) {
    const client = this.supabase.getClient();
    const { data: sub } = await client
      .from('subscriptions')
      .select('paypal_subscription_id, status')
      .eq('user_id', user.id)
      .single();

    if (!sub || sub.status !== 'ACTIVE') {
      throw new NotFoundException('No active subscription found');
    }

    await this.paypal.cancelSubscription(
      sub.paypal_subscription_id,
      'User requested cancellation',
    );

    await client
      .from('subscriptions')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return { status: 'CANCELLED' };
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Headers() headers: Record<string, string>,
    @Req() req: { rawBody?: Buffer },
  ) {
    const body = req.rawBody?.toString('utf-8') ?? '';

    if (this.paypal.getWebhookId()) {
      const valid = await this.paypal.verifyWebhookSignature(headers, body);
      if (!valid) {
        throw new UnauthorizedException('Invalid signature');
      }
    }

    const event = JSON.parse(body);
    const eventType: string = event.event_type;
    const resource = event.resource;
    const client = this.supabase.getClient();

    const statusMap: Record<string, string> = {
      'BILLING.SUBSCRIPTION.ACTIVATED': 'ACTIVE',
      'BILLING.SUBSCRIPTION.SUSPENDED': 'SUSPENDED',
      'BILLING.SUBSCRIPTION.CANCELLED': 'CANCELLED',
      'BILLING.SUBSCRIPTION.EXPIRED': 'EXPIRED',
      'BILLING.SUBSCRIPTION.PAYMENT.FAILED': 'SUSPENDED',
    };

    if (eventType in statusMap) {
      const subId = resource.id;
      const update: Record<string, string | null> = {
        status: statusMap[eventType],
        updated_at: new Date().toISOString(),
      };

      if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
        update.current_period_end =
          resource.billing_info?.next_billing_time ?? null;
      }

      await client
        .from('subscriptions')
        .update(update)
        .eq('paypal_subscription_id', subId);
    }

    if (
      eventType === 'PAYMENT.SALE.COMPLETED' &&
      resource.billing_agreement_id
    ) {
      await client
        .from('subscriptions')
        .update({
          status: 'ACTIVE',
          updated_at: new Date().toISOString(),
        })
        .eq('paypal_subscription_id', resource.billing_agreement_id);
    }

    return { received: true };
  }
}

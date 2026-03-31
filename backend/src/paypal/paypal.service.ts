import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type PayPalSubscriptionStatus =
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface PayPalSubscription {
  id: string;
  status: PayPalSubscriptionStatus;
  plan_id: string;
  subscriber?: {
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
  billing_info?: {
    next_billing_time?: string;
    last_payment?: {
      amount?: { value: string; currency_code: string };
      time?: string;
    };
  };
  links?: { rel: string; href: string }[];
  create_time: string;
  update_time: string;
}

@Injectable()
export class PaypalService {
  private readonly base: string;
  private readonly clientId: string;
  private readonly secret: string;
  private readonly planId: string;
  private readonly webhookId: string;

  constructor(private config: ConfigService) {
    this.base =
      this.config.get('PAYPAL_MODE') === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
    this.clientId = this.config.getOrThrow('PAYPAL_CLIENT_ID');
    this.secret = this.config.getOrThrow('PAYPAL_SECRET');
    this.planId = this.config.getOrThrow('PAYPAL_PLAN_ID');
    this.webhookId = this.config.get('PAYPAL_WEBHOOK_ID') ?? '';
  }

  getClientId(): string {
    return this.clientId;
  }

  getPlanId(): string {
    return this.planId;
  }

  getWebhookId(): string {
    return this.webhookId;
  }

  private validateSubscriptionId(id: string): string {
    const sanitized = id.trim();
    if (!/^I-[A-Za-z0-9]{10,20}$/.test(sanitized)) {
      throw new BadRequestException('Invalid PayPal subscription ID format');
    }
    return sanitized;
  }

  async getAccessToken(): Promise<string> {
    const res = await fetch(`${this.base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PayPal auth failed (${res.status}): ${text}`);
    }

    const json = await res.json();
    return json.access_token;
  }

  async createSubscription(
    returnUrl: string,
    cancelUrl: string,
    paymentMethod?: 'paypal' | 'card',
  ): Promise<PayPalSubscription> {
    const token = await this.getAccessToken();

    const payload: Record<string, unknown> = {
      plan_id: this.planId,
      application_context: {
        brand_name: 's2',
        user_action: 'SUBSCRIBE_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'UNRESTRICTED',
        },
      },
    };

    const res = await fetch(`${this.base}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PayPal createSubscription failed (${res.status}): ${text}`);
    }

    return res.json();
  }

  async getSubscription(subscriptionId: string): Promise<PayPalSubscription> {
    const safeId = this.validateSubscriptionId(subscriptionId);
    const token = await this.getAccessToken();
    const res = await fetch(`${this.base}/v1/billing/subscriptions/${safeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PayPal getSubscription failed (${res.status}): ${text}`);
    }

    return res.json();
  }

  async cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
    const safeId = this.validateSubscriptionId(subscriptionId);
    const token = await this.getAccessToken();
    const res = await fetch(`${this.base}/v1/billing/subscriptions/${safeId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok && res.status !== 204) {
      const text = await res.text();
      throw new Error(`PayPal cancelSubscription failed (${res.status}): ${text}`);
    }
  }

  async verifyWebhookSignature(
    headers: Record<string, string>,
    body: string,
  ): Promise<boolean> {
    if (!this.webhookId) return true;

    const token = await this.getAccessToken();
    const res = await fetch(`${this.base}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: this.webhookId,
        webhook_event: JSON.parse(body),
      }),
    });

    if (!res.ok) return false;
    const json = await res.json();
    return json.verification_status === 'SUCCESS';
  }
}

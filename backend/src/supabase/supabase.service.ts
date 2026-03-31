import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient<any, string>;

  constructor(private config: ConfigService) {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const key = this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
    const schema = this.config.get<string>('SCHEMA') || 'public';
    this.client = createClient(url, key, {
      db: { schema },
    });
  }

  getClient(): SupabaseClient<any, string> {
    return this.client;
  }

  async getUserFromToken(token: string) {
    const { data, error } = await this.client.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  }
}

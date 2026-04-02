import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { PaypalModule } from './paypal/paypal.module';
import { StocksModule } from './stocks/stocks.module';
import { TransportationModule } from './transportation/transportation.module';
import { HealthModule } from './health/health.module';
import { CensusModule } from './census/census.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    PaypalModule,
    StocksModule,
    TransportationModule,
    HealthModule,
    CensusModule,
  ],
})
export class AppModule {}

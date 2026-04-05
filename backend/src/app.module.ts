import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { PaypalModule } from './paypal/paypal.module';
import { TransportationModule } from './transportation/transportation.module';
import { HealthModule } from './health/health.module';
import { CensusModule } from './census/census.module';
import RootController from './controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    PaypalModule,
    TransportationModule,
    HealthModule,
    CensusModule,
  ],
  controllers: [RootController],
})
export class AppModule {}

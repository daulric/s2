import { Module } from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { PaypalController } from './paypal.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [PaypalService],
  controllers: [PaypalController],
  exports: [PaypalService],
})
export class PaypalModule {}

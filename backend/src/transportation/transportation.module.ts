import { Module } from '@nestjs/common';
import { TransportationService } from './transportation.service';
import { TransportationGateway } from './transportation.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [TransportationService, TransportationGateway],
  exports: [TransportationService],
})
export class TransportationModule {}

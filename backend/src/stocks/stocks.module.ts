import { Module } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { StocksController } from './stocks.controller';
import { StocksGateway } from './stocks.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [StocksService, StocksGateway],
  controllers: [StocksController],
  exports: [StocksService],
})
export class StocksModule {}

import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { StocksService } from './stocks.service';
import { StocksGateway } from './stocks.gateway';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller('stocks')
@ApiExcludeController()
export class StocksController {
  constructor(
    private readonly stocks: StocksService,
    private readonly gateway: StocksGateway,
  ) {}

  private verifyCron(authHeader?: string) {
    const secret = this.stocks.getCronSecret();
    if (secret && authHeader !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Invalid cron secret');
    }
  }

  @Get('seed')
  async seed(@Headers('authorization') auth: string) {
    this.verifyCron(auth);
    return this.stocks.seed();
  }

  @Get('ingest')
  async ingest(@Headers('authorization') auth: string) {
    this.verifyCron(auth);
    return this.stocks.ingest();
  }

  @Get('ecse-snapshot')
  async ecseSnapshot(@Headers('authorization') auth: string) {
    this.verifyCron(auth);
    return this.stocks.ecseSnapshot();
  }

  @Get('migrate-exchange')
  async migrateExchange(@Headers('authorization') auth: string) {
    this.verifyCron(auth);
    return this.stocks.migrateExchange();
  }

  @Post('update')
  @UseGuards(SupabaseAuthGuard, SubscriptionGuard)
  async update(@Body('tickers') tickers?: string[]) {
    const updates = await this.stocks.fetchAndPersistPrices(tickers);

    for (const upd of updates) {
      this.gateway.broadcastPriceUpdate(upd.ticker, upd.price, upd.changePct);
    }

    return {
      message: `Updated ${updates.length} stock prices and broadcast to WebSocket clients`,
      updates,
    };
  }
}

import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { StocksService } from './stocks.service';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocks: StocksService) {}

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
}

import { Module } from '@nestjs/common';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';
import { FlightsGateway } from './flights.gateway';

@Module({
  controllers: [FlightsController],
  providers: [FlightsService, FlightsGateway],
  exports: [FlightsService, FlightsGateway],
})
export class FlightsModule {}


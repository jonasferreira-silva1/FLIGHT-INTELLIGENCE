import { Module } from '@nestjs/common';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';
import { FlightsGateway } from './flights.gateway';
import { MlClientModule } from '../ml-client/ml-client.module';

@Module({
  imports: [MlClientModule],
  controllers: [FlightsController],
  providers: [FlightsService, FlightsGateway],
  exports: [FlightsService, FlightsGateway],
})
export class FlightsModule {}


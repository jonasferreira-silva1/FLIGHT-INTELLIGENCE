import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenskyService } from './opensky.service';
import { FlightSyncService } from './flight-sync.service';
import { AlertsModule } from '../alerts/alerts.module';
import { FlightsModule } from '../flights/flights.module';

@Module({
  imports: [HttpModule, AlertsModule, FlightsModule],
  providers: [OpenskyService, FlightSyncService],
})
export class SchedulerModule {}

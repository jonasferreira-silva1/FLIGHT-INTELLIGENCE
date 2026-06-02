import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenskyService } from './opensky.service';
import { FlightSyncService } from './flight-sync.service';

@Module({
  imports: [HttpModule],
  providers: [OpenskyService, FlightSyncService],
})
export class SchedulerModule {}

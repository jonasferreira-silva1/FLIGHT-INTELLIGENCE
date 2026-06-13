import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { FlightsModule } from './flights/flights.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AlertsModule } from './alerts/alerts.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        // Se estiver em ambiente de teste, utiliza o cache padrão em memória para evitar conexões com Redis
        if (process.env.NODE_ENV === 'test') {
          return { ttl: 60000 };
        }
        return {
          store: await redisStore({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            ttl: 60000, // 60 segundos por padrão
          }),
        };
      },
    }),
    PrismaModule,
    FlightsModule,
    SchedulerModule,
    AlertsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

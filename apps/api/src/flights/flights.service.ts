import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FlightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLiveFlights() {
    // Busca todos os voos que tiveram alguma atualização nos últimos 10 minutos e não estão no solo
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    return this.prisma.flight.findMany({
      where: {
        states: {
          some: {
            timestamp: {
              gte: tenMinutesAgo,
            },
            onGround: false,
          },
        },
      },
      include: {
        states: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 1, // Pega apenas o estado mais recente
        },
      },
    });
  }
}

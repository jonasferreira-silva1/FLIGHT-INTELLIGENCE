import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    // Configura o Pool do node-postgres (pg)
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Configura o adapter do Prisma 7
    const adapter = new PrismaPg(pool);
    
    // Passa o adapter para o PrismaClient
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}


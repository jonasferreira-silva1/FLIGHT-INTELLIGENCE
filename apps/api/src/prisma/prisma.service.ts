import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool | null;

  constructor() {
    const url = process.env.DATABASE_URL ?? '';
    let poolInstance: Pool | null = null;
    let config: any = {};

    if (url.startsWith('prisma+postgres://')) {
      config = { accelerateUrl: url };
    } else {
      poolInstance = new Pool({ connectionString: url });
      const adapter = new PrismaPg(poolInstance);
      config = { adapter };
    }

    super(config);
    this.pool = poolInstance;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this.pool) {
      await this.pool.end();
    }
  }
}

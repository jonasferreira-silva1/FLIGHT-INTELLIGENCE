import "dotenv/config";
import { defineConfig } from "prisma/config";

const dbUrl = process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: (
    dbUrl.startsWith("prisma+postgres://")
      ? { accelerateUrl: dbUrl }
      : { url: dbUrl }
  ) as any,
});

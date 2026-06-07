"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config_1 = require("prisma/config");
const dbUrl = process.env["DATABASE_URL"] ?? "";
exports.default = (0, config_1.defineConfig)({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: (dbUrl.startsWith("prisma+postgres://")
        ? { accelerateUrl: dbUrl }
        : { url: dbUrl }),
});
//# sourceMappingURL=prisma.config.js.map
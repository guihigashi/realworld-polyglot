import { DrizzleModule } from "@nestjs/drizzle"
import { Global, Module } from "@nestjs/common"
import type { ConfigType } from "@nestjs/config"
import { drizzle } from "drizzle-orm/node-postgres"
import { databaseConfig } from "@/config/configuration.js"
import * as schema from "@/infrastructure/database/schema.js"

@Global()
@Module({
  imports: [
    DrizzleModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (dbConfig: ConfigType<typeof databaseConfig>) => ({
        drizzle,
        connection: dbConfig.url,
        schema,
      }),
    }),
  ],
  exports: [DrizzleModule],
})
export class DatabaseModule {}

import "dotenv/config"; // this loads .env values in process.env
import { defineConfig } from "drizzle-kit";
import { z } from "zod";

const drizzleConfigSchema = z.object({
    CONNECTION_STRING: z.string(),
});

const config = drizzleConfigSchema.parse(process.env);

export default defineConfig({
    out: "./drizzle",
    dialect: "postgresql",
    schema: "./src/shared-backend/schema.ts",

    driver: "pglite",
    dbCredentials: {
        url: config.CONNECTION_STRING,
    },
});

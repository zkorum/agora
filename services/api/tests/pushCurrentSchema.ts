// Used only against fresh, disposable test containers by cross-service tests.
import { pushSchema } from "drizzle-kit/api-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/shared-backend/schema.js";

const connectionString = process.argv[2];
if (connectionString === undefined)
    throw new Error("Missing test database URL");
const pool = new Pool({ connectionString });
try {
    const db = drizzle({ client: pool });
    const exported = await pushSchema(schema, db);
    await exported.apply();
    if (process.argv[3] === "import-lifecycle") {
        const [analysisSpec] = await db
            .insert(schema.analysisSpecTable)
            .values({ analysisFamily: "opinion_groups" })
            .returning({ id: schema.analysisSpecTable.id });
        if (analysisSpec === undefined)
            throw new Error("Failed to seed import lifecycle analysis spec");
        await db.insert(schema.opinionGroupSpecTable).values({
            analysisSpecId: analysisSpec.id,
            key: "default",
            version: 1,
            reducer: "pca",
            clusterer: "kmeans",
            selectionPolicy: "silhouette_size_balance",
            minClusterableParticipants: 2,
            minVotesPerParticipant: 7,
            maxGroupCount: 6,
        });
    }
} finally {
    await pool.end();
}

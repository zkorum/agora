import test from "node:test";
import { fileURLToPath } from "node:url";
import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { noReplicaRowLocks } from "./replica-routing.mjs";

test("replica locking rule follows reader aliases and saved builders but allows primary exceptions", () => {
    const tester = new RuleTester({
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                projectService: {
                    allowDefaultProject: ["eslint/routing-fixture.ts"],
                },
                tsconfigRootDir: fileURLToPath(new URL("..", import.meta.url)),
            },
        },
    });
    const imports = `
        import { getReplicaDatabase, getPrimaryDatabase, type ReplicaDatabase, type PostgresTransaction } from "../src/shared-backend/db.js";
        import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
        import { pgTable, integer } from "drizzle-orm/pg-core";
        const table = pgTable("routing_fixture", { id: integer() });
        declare const db: PostgresJsDatabase;
        declare const tx: PostgresTransaction;
        declare const reader: ReplicaDatabase;
        type DisplayReader = Pick<PostgresJsDatabase, "select" | "selectDistinct" | "selectDistinctOn" | "$count">;
        declare const renamedReader: DisplayReader;
        declare const mixedReader: ReplicaDatabase | PostgresJsDatabase;
    `;
    tester.run("no-replica-row-locks", noReplicaRowLocks, {
        valid: [
            {
                filename: "eslint/routing-fixture.ts",
                code: `${imports}
                getReplicaDatabase(db).select().from(table);
                reader.select().from(table);
                tx.select().from(table).for("update");
                getPrimaryDatabase(db).select().from(table).for("share");
                const writer = getPrimaryDatabase(db);
                writer.select().from(table).for("update");
            `,
            },
        ],
        invalid: [
            {
                filename: "eslint/routing-fixture.ts",
                code: `${imports}
                getReplicaDatabase(db).select().from(table).for("update");
                reader.select().from(table).for("share");
                const alias = reader;
                alias.select().from(table).for("key share");
                const query = alias.select().from(table);
                query.for("no key update");
                const nested = query.where(undefined);
                nested["for"]("update");
                renamedReader.select().from(table).for("share");
                mixedReader.select().from(table).for("update");
                const wrapped = query satisfies object;
                wrapped.for("update");
                reader["select"]().from(table).for("share");
            `,
                errors: Array.from({ length: 9 }, () => ({
                    messageId: "primaryRequired",
                })),
            },
        ],
    });
});

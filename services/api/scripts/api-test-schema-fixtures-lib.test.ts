import { describe, expect, it } from "vitest";

import {
    generateApiTestSchemaFixtures,
    parseApiTestSchemaFixtureConfig,
} from "./api-test-schema-fixtures-lib.js";

describe("generateApiTestSchemaFixtures", () => {
    it("generates minimal fixture SQL for selected tables", () => {
        const sql = `CREATE TYPE "public"."kept_enum" AS ENUM('one');
CREATE TYPE "public"."unused_enum" AS ENUM('two');

CREATE TABLE "kept" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "value" "kept_enum" NOT NULL
);

CREATE TABLE "other" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "value" "unused_enum" NOT NULL
);

ALTER TABLE "kept" ADD CONSTRAINT "kept_other_id_other_id_fk" FOREIGN KEY ("id") REFERENCES "public"."other"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "kept_value_idx" ON "kept" USING btree ("value");
CREATE INDEX "other_value_idx" ON "other" USING btree ("value");`;

        const fixtures = generateApiTestSchemaFixtures({
            sql,
            config: { demo: ["kept"] },
        });
        const fixtureSql = fixtures.get("demo");

        expect(fixtureSql).toContain("CREATE TYPE \"public\".\"kept_enum\"");
        expect(fixtureSql).not.toContain("unused_enum");
        expect(fixtureSql).toContain("CREATE TABLE \"kept\"");
        expect(fixtureSql).not.toContain("CREATE TABLE \"other\"");
        expect(fixtureSql).not.toContain("ALTER TABLE");
        expect(fixtureSql).toContain("CREATE INDEX \"kept_value_idx\"");
        expect(fixtureSql).not.toContain("other_value_idx");
    });

    it("rejects unsafe fixture names", () => {
        expect(() =>
            parseApiTestSchemaFixtureConfig(
                JSON.stringify({ "../demo": ["kept"] }),
            ),
        ).toThrow();
    });
});

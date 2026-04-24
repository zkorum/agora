import { describe, it, expect } from "vitest";
import {
    parseServiceAnnotations,
    filterTablesForService,
    parseSqlTables,
    parseEnums,
    mapSqlType,
    toPascalCase,
    generateSqlAlchemyModels,
} from "./sync-schema-lib.js";

// === parseServiceAnnotations ===

describe("parseServiceAnnotations", () => {
    it("parses single annotation", () => {
        const input = `/** @service scoring-worker, api */
export const fooTable = pgTable("foo", {`;
        const result = parseServiceAnnotations(input);
        expect(result.get("foo")).toEqual(
            new Set(["scoring-worker", "api"]),
        );
    });

    it("handles comments between annotation and pgTable", () => {
        const input = `/** @service worker */
// Some comment about the table
export const barTable = pgTable("bar", {`;
        const result = parseServiceAnnotations(input);
        expect(result.get("bar")).toEqual(new Set(["worker"]));
    });

    it("returns empty map when no annotations", () => {
        const input = `export const fooTable = pgTable("foo", {`;
        expect(parseServiceAnnotations(input).size).toBe(0);
    });

    it("parses multiple annotations", () => {
        const input = `/** @service a, b */
export const t1 = pgTable("table_one", {
});

/** @service c */
export const t2 = pgTable("table_two", {`;
        const result = parseServiceAnnotations(input);
        expect(result.size).toBe(2);
        expect(result.get("table_one")).toEqual(new Set(["a", "b"]));
        expect(result.get("table_two")).toEqual(new Set(["c"]));
    });
});

describe("filterTablesForService", () => {
    it("filters to matching service", () => {
        const annotations = new Map([
            ["t1", new Set(["a", "b"])],
            ["t2", new Set(["b", "c"])],
            ["t3", new Set(["a"])],
        ]);
        expect(filterTablesForService(annotations, "b")).toEqual(
            new Set(["t1", "t2"]),
        );
    });
});

// === parseSqlTables ===

describe("parseSqlTables", () => {
    it("parses a simple table", () => {
        const sql = `CREATE TABLE "items" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
    "name" varchar(100) NOT NULL,
    "score" real NOT NULL
);`;
        const result = parseSqlTables(sql, new Set(["items"]));
        const cols = result.get("items");
        expect(cols).toBeDefined();
        expect(cols).toHaveLength(3);

        expect(cols![0].name).toBe("id");
        expect(cols![0].sqlType).toBe("integer");
        expect(cols![0].hasDefault).toBe(true);
        expect(cols![0].nullable).toBe(true); // no NOT NULL on PK identity

        expect(cols![1].name).toBe("name");
        expect(cols![1].sqlType).toBe("varchar(100)");
        expect(cols![1].nullable).toBe(false);

        expect(cols![2].name).toBe("score");
        expect(cols![2].sqlType).toBe("real");
    });

    it("skips tables not in allowedTables", () => {
        const sql = `CREATE TABLE "wanted" ("id" integer NOT NULL);
CREATE TABLE "unwanted" ("id" integer NOT NULL);`;
        const result = parseSqlTables(sql, new Set(["wanted"]));
        expect(result.size).toBe(1);
        expect(result.has("wanted")).toBe(true);
    });

    it("parses DEFAULT values", () => {
        const sql = `CREATE TABLE "t" (
    "active" boolean DEFAULT false NOT NULL,
    "count" integer DEFAULT 0 NOT NULL
);`;
        const result = parseSqlTables(sql, new Set(["t"]));
        const cols = result.get("t")!;
        expect(cols[0].hasDefault).toBe(true);
        expect(cols[0].defaultValue).toBe("false");
        expect(cols[1].defaultValue).toBe("0");
    });

    it("parses nullable columns", () => {
        const sql = `CREATE TABLE "t" (
    "required" integer NOT NULL,
    "optional" integer
);`;
        const result = parseSqlTables(sql, new Set(["t"]));
        const cols = result.get("t")!;
        expect(cols[0].nullable).toBe(false);
        expect(cols[1].nullable).toBe(true);
    });

    it("parses text[] array type", () => {
        const sql = `CREATE TABLE "t" (
    "tags" text[] NOT NULL
);`;
        const cols = parseSqlTables(sql, new Set(["t"])).get("t")!;
        expect(cols[0].sqlType).toBe("text[]");
    });

    it("parses quoted enum type, jsonb, uuid, and timestamp columns", () => {
        const sql = `CREATE TABLE "t" (
    "status" "my_enum" NOT NULL,
    "data" jsonb NOT NULL,
    "uid" uuid NOT NULL,
    "created_at" timestamp (0) NOT NULL
);`;
        const cols = parseSqlTables(sql, new Set(["t"])).get("t")!;
        expect(cols[0].sqlType).toBe('"my_enum"');
        expect(cols[1].sqlType).toBe("jsonb");
        expect(cols[2].sqlType).toBe("uuid");
        expect(cols[3].sqlType).toMatch(/^timestamp/);
    });

    it("skips CONSTRAINT lines", () => {
        const sql = `CREATE TABLE "t" (
    "id" integer NOT NULL,
    CONSTRAINT "t_pkey" PRIMARY KEY ("id")
);`;
        const cols = parseSqlTables(sql, new Set(["t"])).get("t")!;
        expect(cols).toHaveLength(1);
        expect(cols[0].name).toBe("id");
    });
});

// === parseEnums ===

describe("parseEnums", () => {
    it("parses enum with public schema prefix", () => {
        const sql = `CREATE TYPE "public"."status" AS ENUM('active', 'inactive');`;
        const result = parseEnums(sql);
        expect(result.get("status")).toEqual(["active", "inactive"]);
    });

    it("parses enum without public prefix", () => {
        const sql = `CREATE TYPE "color" AS ENUM('red', 'blue');`;
        const result = parseEnums(sql);
        expect(result.get("color")).toEqual(["red", "blue"]);
    });

    it("parses multiple enums", () => {
        const sql = `CREATE TYPE "public"."a" AS ENUM('x');
CREATE TYPE "public"."b" AS ENUM('y', 'z');`;
        const result = parseEnums(sql);
        expect(result.size).toBe(2);
    });
});

// === mapSqlType ===

describe("mapSqlType", () => {
    const noEnums = new Map<string, string[]>();

    it("maps varchar to String", () => {
        expect(mapSqlType("varchar(8)", noEnums)).toEqual({
            pyType: "str",
            saType: "String(8)",
        });
    });

    it("maps varchar without length to String(255)", () => {
        expect(mapSqlType("varchar", noEnums)).toEqual({
            pyType: "str",
            saType: "String(255)",
        });
    });

    it("maps text[] to ARRAY(Text)", () => {
        expect(mapSqlType("text[]", noEnums)).toEqual({
            pyType: "list[str]",
            saType: "ARRAY(Text)",
        });
    });

    it("maps jsonb to JSON/Any", () => {
        expect(mapSqlType("jsonb", noEnums)).toEqual({
            pyType: "Any",
            saType: "JSON",
        });
    });

    it("maps uuid", () => {
        expect(mapSqlType("uuid", noEnums)).toEqual({
            pyType: "uuid_pkg.UUID",
            saType: "Uuid",
        });
    });

    it("maps boolean", () => {
        expect(mapSqlType("boolean", noEnums)).toEqual({
            pyType: "bool",
            saType: "Boolean",
        });
    });

    it("maps smallint to Integer", () => {
        expect(mapSqlType("smallint", noEnums)).toEqual({
            pyType: "int",
            saType: "Integer",
        });
    });

    it("maps timestamp with precision", () => {
        expect(mapSqlType("timestamp (0)", noEnums)).toEqual({
            pyType: "datetime",
            saType: "DateTime",
        });
    });

    it("maps quoted enum type", () => {
        const enums = new Map([["my_status", ["a", "b"]]]);
        expect(mapSqlType('"my_status"', enums)).toEqual({
            pyType: "MyStatus",
            saType: "SaEnum(MyStatus, native_enum=False)",
        });
    });

    it("maps integer[] to ARRAY(Integer)", () => {
        expect(mapSqlType("integer[]", noEnums)).toEqual({
            pyType: "list[int]",
            saType: "ARRAY(Integer)",
        });
    });

    it("maps text to Text", () => {
        expect(mapSqlType("text", noEnums)).toEqual({
            pyType: "str",
            saType: "Text",
        });
    });

    it("maps bigint to BigInteger", () => {
        expect(mapSqlType("bigint", noEnums)).toEqual({
            pyType: "int",
            saType: "BigInteger",
        });
    });

    it("falls back to JSON for unknown types", () => {
        expect(mapSqlType("geometry", noEnums)).toEqual({
            pyType: "Any",
            saType: "JSON",
        });
    });
});

// === toPascalCase ===

describe("toPascalCase", () => {
    it("converts snake_case", () => {
        expect(toPascalCase("ranking_score_entity")).toBe(
            "RankingScoreEntity",
        );
    });

    it("handles single word", () => {
        expect(toPascalCase("conversation")).toBe("Conversation");
    });
});

// === generateSqlAlchemyModels ===

describe("generateSqlAlchemyModels", () => {
    it("generates valid output for a simple table", () => {
        const tables = new Map([
            [
                "items",
                [
                    {
                        name: "id",
                        sqlType: "integer",
                        nullable: true,
                        hasDefault: true,
                        defaultValue: null,
                        isPrimaryKey: true,
                    },
                    {
                        name: "name",
                        sqlType: "varchar(100)",
                        nullable: false,
                        hasDefault: false,
                        defaultValue: null,
                        isPrimaryKey: false,
                    },
                    {
                        name: "score",
                        sqlType: "real",
                        nullable: false,
                        hasDefault: false,
                        defaultValue: null,
                        isPrimaryKey: false,
                    },
                ],
            ],
        ]);
        const output = generateSqlAlchemyModels({
            tables,
            enums: new Map(),
            service: "test",
        });

        expect(output).toContain("class Items(Base):");
        expect(output).toContain('__tablename__ = "items"');
        expect(output).toContain(
            "id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)",
        );
        expect(output).toContain(
            "name: Mapped[str] = mapped_column(String(100))",
        );
        expect(output).toContain(
            "score: Mapped[float] = mapped_column(Float)",
        );
    });

    it("includes enum class and SaEnum column", () => {
        const enums = new Map([["my_status", ["active", "done"]]]);
        const tables = new Map([
            [
                "t",
                [
                    {
                        name: "status",
                        sqlType: '"my_status"',
                        nullable: false,
                        hasDefault: false,
                        defaultValue: null,
                        isPrimaryKey: false,
                    },
                ],
            ],
        ]);
        const output = generateSqlAlchemyModels({
            tables,
            enums,
            service: "test",
        });

        expect(output).toContain("class MyStatus(StrEnum):");
        expect(output).toContain('    active = "active"');
        expect(output).toContain('    done = "done"');
        expect(output).toContain("SaEnum(MyStatus, native_enum=False)");
    });

    it("breaks long lines", () => {
        const enums = new Map([
            ["very_long_enum_name", ["value_one", "value_two"]],
        ]);
        const tables = new Map([
            [
                "t",
                [
                    {
                        name: "very_long_column_name",
                        sqlType: '"very_long_enum_name"',
                        nullable: true,
                        hasDefault: false,
                        defaultValue: null,
                        isPrimaryKey: false,
                    },
                ],
            ],
        ]);
        const output = generateSqlAlchemyModels({
            tables,
            enums,
            service: "test",
        });

        // No line should exceed 100 chars
        for (const line of output.split("\n")) {
            expect(line.length).toBeLessThanOrEqual(100);
        }
    });

    it("puts datetime and uuid as runtime imports (SQLAlchemy needs them)", () => {
        const tables = new Map([
            [
                "t",
                [
                    {
                        name: "ts",
                        sqlType: "timestamp",
                        nullable: false,
                        hasDefault: false,
                        defaultValue: null,
                        isPrimaryKey: false,
                    },
                    {
                        name: "uid",
                        sqlType: "uuid",
                        nullable: false,
                        hasDefault: false,
                        defaultValue: null,
                        isPrimaryKey: false,
                    },
                ],
            ],
        ]);
        const output = generateSqlAlchemyModels({
            tables,
            enums: new Map(),
            service: "test",
        });

        // Must be runtime imports (NOT in TYPE_CHECKING)
        // SQLAlchemy evals Mapped[] annotations at class definition time
        expect(output).toContain("from datetime import datetime");
        expect(output).toContain("import uuid as uuid_pkg");
        expect(output).not.toContain("if TYPE_CHECKING:");
    });

    it("generates server_default for boolean and integer defaults", () => {
        const tables = new Map([
            [
                "t",
                [
                    {
                        name: "active",
                        sqlType: "boolean",
                        nullable: false,
                        hasDefault: true,
                        defaultValue: "false",
                        isPrimaryKey: false,
                    },
                    {
                        name: "count",
                        sqlType: "integer",
                        nullable: false,
                        hasDefault: true,
                        defaultValue: "0",
                        isPrimaryKey: false,
                    },
                ],
            ],
        ]);
        const output = generateSqlAlchemyModels({
            tables,
            enums: new Map(),
            service: "test",
        });

        expect(output).toContain('server_default="false"');
        expect(output).toContain('server_default="0"');
    });

    it("includes header comment", () => {
        const output = generateSqlAlchemyModels({
            tables: new Map([
                [
                    "t",
                    [
                        {
                            name: "id",
                            sqlType: "integer",
                            nullable: false,
                            hasDefault: false,
                            defaultValue: null,
                            isPrimaryKey: false,
                        },
                    ],
                ],
            ]),
            enums: new Map(),
            service: "my-svc",
        });
        expect(output).toContain("# WARNING: GENERATED");
        expect(output).toContain("# Service: my-svc");
    });
});

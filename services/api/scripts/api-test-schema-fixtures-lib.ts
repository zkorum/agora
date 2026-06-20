import { z } from "zod";

const fixtureConfigSchema = z.record(
    z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    z.array(z.string().min(1)).min(1),
);

export type ApiTestSchemaFixtureConfig = z.infer<typeof fixtureConfigSchema>;

interface GenerateApiTestSchemaFixturesParams {
    sql: string;
    config: ApiTestSchemaFixtureConfig;
}

const GENERATED_WARNING =
    "-- WARNING: GENERATED FROM services/api/src/shared-backend/schema.ts. DO NOT EDIT.\n" +
    "-- Regenerate with: make sync-api-test-db-fixtures\n";

export function parseApiTestSchemaFixtureConfig(
    rawConfig: string,
): ApiTestSchemaFixtureConfig {
    return fixtureConfigSchema.parse(JSON.parse(rawConfig));
}

function extractCreateTypeStatements(sql: string): Map<string, string> {
    const statements = new Map<string, string>();
    const typeRegex = /^CREATE TYPE\s+"public"\."\w+"\s+AS\s+ENUM\([\s\S]*?\);$/gm;
    const typeNameRegex = /^CREATE TYPE\s+"public"\."(\w+)"/;

    for (const match of sql.matchAll(typeRegex)) {
        const typeName = typeNameRegex.exec(match[0])?.[1];
        if (typeName === undefined) {
            throw new Error("Matched CREATE TYPE without type name");
        }
        statements.set(typeName, match[0]);
    }

    return statements;
}

function extractCreateTableStatements(sql: string): Map<string, string> {
    const statements = new Map<string, string>();
    const tableRegex = /^CREATE TABLE\s+"(\w+)"\s+\([\s\S]*?\n\);$/gm;

    for (const match of sql.matchAll(tableRegex)) {
        const tableName = match[1];
        statements.set(tableName, match[0]);
    }

    return statements;
}

function extractIndexStatements(sql: string): {
    tableName: string;
    statement: string;
}[] {
    const statements: { tableName: string; statement: string }[] = [];
    const indexRegex =
        /^CREATE(?: UNIQUE)? INDEX\s+"\w+"\s+ON\s+"(\w+)"\s+[\s\S]*?;$/gm;

    for (const match of sql.matchAll(indexRegex)) {
        const tableName = match[1];
        statements.push({ tableName, statement: match[0] });
    }

    return statements;
}

function generateFixtureSql({
    fixtureName,
    tableNames,
    typeStatementsByName,
    tableStatements,
    indexStatements,
}: {
    fixtureName: string;
    tableNames: string[];
    typeStatementsByName: Map<string, string>;
    tableStatements: Map<string, string>;
    indexStatements: { tableName: string; statement: string }[];
}): string {
    const selectedTables = new Set(tableNames);
    const missingTables = tableNames.filter(
        (tableName) => !tableStatements.has(tableName),
    );

    if (missingTables.length > 0) {
        throw new Error(
            `Fixture "${fixtureName}" references missing table(s): ${missingTables.join(", ")}`,
        );
    }

    const selectedTableStatements: string[] = [];
    for (const [tableName, statement] of tableStatements) {
        if (selectedTables.has(tableName)) {
            selectedTableStatements.push(statement);
        }
    }

    const selectedTypeStatements: string[] = [];
    for (const [typeName, statement] of typeStatementsByName) {
        const typeReference = `"${typeName}"`;
        if (
            selectedTableStatements.some((tableStatement) =>
                tableStatement.includes(typeReference),
            )
        ) {
            selectedTypeStatements.push(statement);
        }
    }

    const selectedIndexStatements = indexStatements
        .filter(({ tableName }) => selectedTables.has(tableName))
        .map(({ statement }) => statement);

    return `${GENERATED_WARNING}\n${[
        ...selectedTypeStatements,
        ...selectedTableStatements,
        ...selectedIndexStatements,
    ].join("\n\n")}\n`;
}

export function generateApiTestSchemaFixtures({
    sql,
    config,
}: GenerateApiTestSchemaFixturesParams): Map<string, string> {
    const typeStatementsByName = extractCreateTypeStatements(sql);
    const tableStatements = extractCreateTableStatements(sql);
    const indexStatements = extractIndexStatements(sql);
    const fixtures = new Map<string, string>();

    for (const [fixtureName, tableNames] of Object.entries(config)) {
        fixtures.set(
            fixtureName,
            generateFixtureSql({
                fixtureName,
                tableNames,
                typeStatementsByName,
                tableStatements,
                indexStatements,
            }),
        );
    }

    return fixtures;
}

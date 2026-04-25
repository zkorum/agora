/**
 * Pure functions for schema codegen: Drizzle schema.ts → SQLAlchemy models.
 *
 * Zero side effects (no file I/O, no process.exit).
 * CLI entrypoint wires I/O to these functions.
 */

export interface Column {
    name: string;
    sqlType: string;
    nullable: boolean;
    hasDefault: boolean;
    defaultValue: string | null;
    isPrimaryKey: boolean;
}

export interface TypeMapping {
    pyType: string;
    saType: string;
}

export function toPascalCase(snake: string): string {
    return snake
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("");
}

export function parseServiceAnnotations(
    schemaTs: string,
): Map<string, Set<string>> {
    const regex =
        /\/\*\*\s*@service\s+([^*]+)\*\/\s*\n\s*(?:\/\/[^\n]*\n\s*)*export\s+const\s+\w+\s*=\s*pgTable\(\s*"(\w+)"/g;
    const result = new Map<string, Set<string>>();
    let match;
    while ((match = regex.exec(schemaTs)) !== null) {
        const services = match[1]
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        result.set(match[2], new Set(services));
    }
    return result;
}

export function filterTablesForService(
    annotations: Map<string, Set<string>>,
    service: string,
): Set<string> {
    const result = new Set<string>();
    for (const [table, services] of annotations) {
        if (services.has(service)) result.add(table);
    }
    return result;
}

export function parseSqlTables(
    sql: string,
    allowedTables: Set<string>,
): Map<string, Column[]> {
    const tableRegex = /CREATE\s+TABLE\s+"(\w+)"\s*\(([\s\S]*?)\);/g;
    const tables = new Map<string, Column[]>();
    let match;
    while ((match = tableRegex.exec(sql)) !== null) {
        const tableName = match[1];
        if (!allowedTables.has(tableName)) continue;
        const columns: Column[] = [];
        for (const line of match[2].split("\n")) {
            const trimmed = line.trim().replace(/,$/, "");
            if (!trimmed || trimmed.startsWith("CONSTRAINT")) continue;
            const colMatch = trimmed.match(/^"(\w+)"\s+(.+?)$/);
            if (!colMatch) continue;
            const rest = colMatch[2];
            const nullable = !rest.includes("NOT NULL");
            const hasDefault =
                rest.includes("DEFAULT") || rest.includes("GENERATED");
            let defaultValue: string | null = null;
            const defaultMatch = rest.match(
                /DEFAULT\s+(.+?)(?:\s+NOT NULL|\s*$)/i,
            );
            if (defaultMatch) defaultValue = defaultMatch[1].trim();
            const isPrimaryKey = /PRIMARY KEY/i.test(rest);
            let sqlType = rest
                .replace(/\s+NOT NULL/g, "")
                .replace(/\s+NULL/g, "")
                .replace(/DEFAULT\s+\S+/g, "")
                .replace(/PRIMARY KEY/g, "")
                .replace(/GENERATED ALWAYS AS IDENTITY\s*\([^)]*\)/g, "")
                .replace(/UNIQUE/g, "")
                .trim()
                .replace(/\s+/g, " ")
                .trim();
            if (sqlType.length === 0) sqlType = "integer";
            columns.push({
                name: colMatch[1],
                sqlType,
                nullable,
                hasDefault,
                defaultValue,
                isPrimaryKey,
            });
        }
        if (columns.length > 0) tables.set(tableName, columns);
    }
    return tables;
}

export function parseEnums(sql: string): Map<string, string[]> {
    const regex =
        /CREATE\s+TYPE\s+"(?:public"\.)?"?(\w+)"?\s+AS\s+ENUM\s*\(([^)]+)\)/g;
    const enums = new Map<string, string[]>();
    let match;
    while ((match = regex.exec(sql)) !== null) {
        enums.set(
            match[1],
            match[2]
                .split(",")
                .map((v) => v.trim().replace(/^'|'$/g, "")),
        );
    }
    return enums;
}

export function mapSqlType(
    sqlType: string,
    enums: Map<string, string[]>,
): TypeMapping {
    const stripped = sqlType.replace(/^"|"$/g, "").trim();
    const lower = stripped.toLowerCase();
    if (lower.startsWith("varchar")) {
        const m = lower.match(/varchar\((\d+)\)/);
        return { pyType: "str", saType: `String(${m ? m[1] : "255"})` };
    }
    if (lower === "text[]")
        return { pyType: "list[str]", saType: "ARRAY(Text)" };
    if (lower === "integer[]")
        return { pyType: "list[int]", saType: "ARRAY(Integer)" };
    if (lower.startsWith("timestamp"))
        return { pyType: "datetime", saType: "DateTime" };
    if (lower === "uuid")
        return { pyType: "uuid_pkg.UUID", saType: "Uuid" };
    if (lower === "text") return { pyType: "str", saType: "Text" };
    if (lower === "real") return { pyType: "float", saType: "Float" };
    if (lower === "boolean") return { pyType: "bool", saType: "Boolean" };
    if (lower === "smallint" || lower === "smallserial")
        return { pyType: "int", saType: "Integer" };
    if (lower.startsWith("integer") || lower === "serial")
        return { pyType: "int", saType: "Integer" };
    if (lower === "bigint")
        return { pyType: "int", saType: "BigInteger" };
    if (lower.startsWith("numeric") || lower === "double precision")
        return { pyType: "float", saType: "Float" };
    if (lower === "jsonb" || lower === "json")
        return { pyType: "Any", saType: "JSON" };
    for (const [enumName] of enums) {
        if (lower === enumName) {
            const cls = toPascalCase(enumName);
            return {
                pyType: cls,
                saType: `SaEnum(${cls}, native_enum=False)`,
            };
        }
    }
    return { pyType: "Any", saType: "JSON" };
}

export function generateSqlAlchemyModels({
    tables,
    enums,
    service,
}: {
    tables: Map<string, Column[]>;
    enums: Map<string, string[]>;
    service: string;
}): string {
    const usedEnums = new Set<string>();
    const usedSaTypes = new Set<string>();
    let needsDatetime = false;
    let needsUuid = false;
    let needsAny = false;

    for (const columns of tables.values()) {
        for (const col of columns) {
            const { pyType, saType } = mapSqlType(col.sqlType, enums);
            for (const t of [
                "String", "Text", "Integer", "BigInteger", "Float",
                "Boolean", "DateTime", "Uuid", "JSON", "ARRAY",
            ]) {
                if (saType.includes(t)) usedSaTypes.add(t);
            }
            if (pyType === "datetime") needsDatetime = true;
            if (pyType.includes("uuid_pkg")) needsUuid = true;
            if (pyType === "Any") needsAny = true;
            const lower = col.sqlType.replace(/^"|"$/g, "").toLowerCase().trim();
            for (const [enumName] of enums) {
                if (lower === enumName) usedEnums.add(enumName);
            }
        }
    }

    let out = "";
    out += "# WARNING: GENERATED FROM shared-backend/src/schema.ts\n";
    out += "# DO NOT MODIFY -- Re-generate with: make sync\n";
    out += `# Service: ${service}\n\n`;
    out += "from __future__ import annotations\n\n";

    // Stdlib imports (sorted: `import` before `from`, then alphabetical)
    // datetime/uuid MUST be runtime imports (not TYPE_CHECKING) because
    // SQLAlchemy evals Mapped[] annotations at class definition time.
    const stdlib: string[] = [];
    if (needsUuid) stdlib.push("import uuid as uuid_pkg");
    if (needsDatetime) stdlib.push("from datetime import datetime");
    if (usedEnums.size > 0) stdlib.push("from enum import StrEnum");
    if (needsAny) stdlib.push("from typing import Any");
    out += stdlib.join("\n") + "\n\n";

    // SQLAlchemy -- separate `Enum as SaEnum` from other imports (ruff isort)
    // Sort: all-uppercase first, then PascalCase (matches ruff isort)
    const saList = Array.from(usedSaTypes).sort((a, b) => {
        const aUpper = a === a.toUpperCase();
        const bUpper = b === b.toUpperCase();
        if (aUpper && !bUpper) return -1;
        if (!aUpper && bUpper) return 1;
        return a.localeCompare(b);
    });
    if (saList.join(", ").length > 70) {
        out += "from sqlalchemy import (\n";
        for (const t of saList) out += `    ${t},\n`;
        out += ")\n";
    } else {
        out += `from sqlalchemy import ${saList.join(", ")}\n`;
    }
    if (usedEnums.size > 0) {
        out += "from sqlalchemy import Enum as SaEnum\n";
    }
    out += "from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column\n";

    out += "\n\nclass Base(DeclarativeBase):\n    pass\n";

    // Enums
    for (const enumName of usedEnums) {
        const values = enums.get(enumName);
        if (!values) continue;
        out += `\n\nclass ${toPascalCase(enumName)}(StrEnum):\n`;
        for (const v of values) out += `    ${v.replace(/-/g, "_")} = "${v}"\n`;
    }

    // Models
    for (const [tableName, columns] of tables) {
        out += `\n\nclass ${toPascalCase(tableName)}(Base):\n`;
        out += `    __tablename__ = "${tableName}"\n\n`;
        for (const col of columns) {
            const { pyType, saType } = mapSqlType(col.sqlType, enums);
            const mcArgs: string[] = [saType];
            const isPk = col.isPrimaryKey;
            if (isPk) {
                mcArgs.push("primary_key=True");
                if (col.hasDefault && col.sqlType.toLowerCase().includes("integer")) {
                    mcArgs.push("autoincrement=True");
                }
            }
            if (col.nullable && !isPk) mcArgs.push("nullable=True");
            if (col.hasDefault && col.defaultValue !== null) {
                if (col.defaultValue === "true" || col.defaultValue === "false") {
                    mcArgs.push(`server_default="${col.defaultValue}"`);
                } else if (/^-?\d+$/.test(col.defaultValue)) {
                    mcArgs.push(`server_default="${col.defaultValue}"`);
                }
            }
            const isNullable = col.nullable && !isPk;
            const mapped = isNullable ? `Mapped[${pyType} | None]` : `Mapped[${pyType}]`;
            const full = `    ${col.name}: ${mapped} = mapped_column(${mcArgs.join(", ")})`;
            if (full.length <= 100) {
                out += `${full}\n`;
            } else {
                out += `    ${col.name}: ${mapped} = mapped_column(\n`;
                for (const arg of mcArgs) out += `        ${arg},\n`;
                out += "    )\n";
            }
        }
    }

    out += "\n";
    return out;
}

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { z } from "zod";
import {
    DYNAMIC_SQL_EXPRESSION,
    inspectSql,
    type SqlOperation,
} from "./soft-delete-sql.js";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const ignoredDirectories = new Set([
    "node_modules",
    ".venv",
    "dist",
    ".svelte-kit",
    ".quasar",
    ".email-build",
    "__pycache__",
]);
const sourceExtension = /\.(ts|tsx|js|mjs|cjs|py|sql|vue|svelte)$/;
const developmentExercise =
    "services/conversation-email-update-worker/src/devExercise/";

export interface PolicySource {
    readonly path: string;
    readonly source: string;
}

type Operation =
    | SqlOperation
    | "Drizzle delete"
    | "SQLAlchemy delete"
    | "Python .delete"
    | "Historical migration modified"
    | "Approved retirement migration modified";
export interface SourceFinding {
    readonly line: number;
    readonly operation: Operation;
}
export interface PolicyFinding extends SourceFinding {
    readonly path: string;
}

export function isProductionSource(path: string): boolean {
    const normalized = path.replaceAll("\\", "/");
    return (
        !normalized.split("/").some((part) => ignoredDirectories.has(part)) &&
        // App builds and browser reports can contain large bundled JS copies.
        !/^services\/app\/(?:\.netlify|build|storybook-static|playwright-report|test-results)(?:\/|$)/.test(
            normalized,
        ) &&
        !/\.(test|spec)\./.test(normalized) &&
        !/^services\/[^/]+\/(?:tests|test)(?:\/|$)/.test(normalized) &&
        !/(^|\/)test_[^/]+\.py$/.test(normalized) &&
        !normalized.startsWith(developmentExercise) &&
        normalized !== developmentExercise.slice(0, -1) &&
        !normalized.startsWith("services/api/drizzle/") &&
        normalized !== "services/api/drizzle" &&
        !normalized.startsWith("services/deletion-worker/") &&
        normalized !== "services/deletion-worker"
    );
}

export function getHistoricalMigrationFinding({
    source,
    hashes,
}: {
    source: PolicySource;
    hashes: ReadonlyMap<string, string>;
}): SourceFinding | undefined {
    const expected = hashes.get(source.path);
    if (expected === undefined) return undefined;
    return expected === createHash("sha256").update(source.source).digest("hex")
        ? undefined
        : { line: 1, operation: "Historical migration modified" };
}

export async function loadHistoricalMigrationHashes(): Promise<
    ReadonlyMap<string, string>
> {
    const source = await readFile(
        new URL("./historical-destructive-migrations.json", import.meta.url),
        "utf8",
    );
    const schema = z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/));
    return new Map(Object.entries(schema.parse(JSON.parse(source))));
}

// Explicit approval for permanent deletion of retired event-ticket grants.
// Pin the entire migration rather than allowing general table/DELETE exceptions.
export const approvedEntitlementRetirement = {
    path: "services/api/database/flyway/V0115.1__retire_zupass.sql",
    sha256: "178bd7ad290f429453a68683ae488f58fa4a5cded6fce9760a1f5b364745b8b8",
};

export function getApprovedRetirementFinding(
    source: PolicySource,
): SourceFinding | undefined {
    return source.path === approvedEntitlementRetirement.path &&
        createHash("sha256").update(source.source).digest("hex") ===
            approvedEntitlementRetirement.sha256
        ? undefined
        : { line: 1, operation: "Approved retirement migration modified" };
}

function hasDeleteResult(type: ts.Type): boolean {
    if (type.isUnionOrIntersection()) return type.types.some(hasDeleteResult);
    const symbol = type.getSymbol();
    return (
        symbol !== undefined &&
        /^(?:Pg|MySql|SQLite)(?:Async|Sync|Effect)?Delete/.test(symbol.name) &&
        symbol.declarations?.some((declaration) =>
            declaration
                .getSourceFile()
                .fileName.replaceAll("\\", "/")
                .includes("/drizzle-orm/"),
        ) === true
    );
}

function getStringExpression({
    node,
    checker,
    seen,
}: {
    node: ts.Node;
    checker: ts.TypeChecker;
    seen: ReadonlySet<ts.Node>;
}): string | undefined {
    if (seen.has(node)) return undefined;
    const nextSeen = new Set([...seen, node]);
    const value = (child: ts.Node): string | undefined =>
        getStringExpression({ node: child, checker, seen: nextSeen });
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        return node.text;
    if (ts.isParenthesizedExpression(node)) return value(node.expression);
    if (ts.isTemplateExpression(node))
        return (
            node.head.text +
            node.templateSpans
                .map(
                    (span) =>
                        (value(span.expression) ?? DYNAMIC_SQL_EXPRESSION) +
                        span.literal.text,
                )
                .join("")
        );
    if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
        const left = value(node.left);
        const right = value(node.right);
        return left === undefined && right === undefined
            ? undefined
            : (left ?? DYNAMIC_SQL_EXPRESSION) +
                  (right ?? DYNAMIC_SQL_EXPRESSION);
    }
    if (ts.isIdentifier(node)) {
        const declaration = checker.getSymbolAtLocation(node)?.valueDeclaration;
        if (
            declaration !== undefined &&
            ts.isVariableDeclaration(declaration) &&
            ts.isVariableDeclarationList(declaration.parent) &&
            (declaration.parent.flags & ts.NodeFlags.Const) !== 0 &&
            declaration.initializer !== undefined
        ) {
            return value(declaration.initializer);
        }
    }
    return undefined;
}

function isCompoundString(node: ts.Node): boolean {
    return (
        ts.isTemplateExpression(node) ||
        ts.isParenthesizedExpression(node) ||
        (ts.isBinaryExpression(node) &&
            node.operatorToken.kind === ts.SyntaxKind.PlusToken)
    );
}

export function inspectTypeScript({
    sourceFile,
    checker,
}: {
    sourceFile: ts.SourceFile;
    checker: ts.TypeChecker;
}): SourceFinding[] {
    const findings: SourceFinding[] = [];
    const factories = new Map<ts.Type, boolean>();
    const visit = (node: ts.Node): void => {
        const line =
            sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        if (ts.isCallExpression(node)) {
            const callable = checker.getTypeAtLocation(node.expression);
            let deletes = factories.get(callable);
            if (deletes === undefined) {
                deletes = callable
                    .getCallSignatures()
                    .some((signature) =>
                        hasDeleteResult(
                            checker.getReturnTypeOfSignature(signature),
                        ),
                    );
                factories.set(callable, deletes);
            }
            if (deletes) findings.push({ line, operation: "Drizzle delete" });
        }
        // Inspect whole expressions, so split SQL literals cannot evade the check.
        const carrier =
            ts.isStringLiteral(node) ||
            ts.isNoSubstitutionTemplateLiteral(node) ||
            isCompoundString(node);
        if (
            carrier &&
            !isCompoundString(node.parent) &&
            !ts.isLiteralTypeNode(node.parent)
        ) {
            const literal = getStringExpression({
                node,
                checker,
                seen: new Set(),
            });
            if (literal !== undefined)
                findings.push(
                    ...inspectSql(literal).map((finding) => ({
                        ...finding,
                        line,
                    })),
                );
        }
        ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
    return findings;
}

const pythonResultSchema = z.array(
    z.object({
        path: z.string(),
        deletes: z.array(
            z.object({
                line: z.number().int().positive(),
                operation: z.enum(["SQLAlchemy delete", "Python .delete"]),
            }),
        ),
        literals: z.array(
            z.object({ line: z.number().int().positive(), source: z.string() }),
        ),
    }),
);

export function inspectPython(
    sources: readonly PolicySource[],
): PolicyFinding[] {
    let executable = process.env.SOFT_DELETE_PYTHON;
    if (executable === undefined) {
        const discovery = spawnSync("uv", ["python", "find", "3.13"], {
            encoding: "utf8",
            timeout: 30_000,
        });
        if (discovery.status !== 0)
            throw new Error(`Python discovery failed: ${discovery.stderr}`);
        executable = z.string().trim().min(1).parse(discovery.stdout);
    }
    const result = spawnSync(
        executable,
        ["-I", resolve(repositoryRoot, "scripts/check-soft-deletes.py")],
        {
            input: JSON.stringify(sources),
            encoding: "utf8",
            maxBuffer: 32 * 1024 * 1024,
            timeout: 30_000,
        },
    );
    if (result.status !== 0)
        throw new Error(`Python policy parser failed: ${result.stderr}`);
    const parsed = pythonResultSchema
        .length(sources.length)
        .parse(JSON.parse(result.stdout));
    const expected = new Set(sources.map((source) => source.path));
    return parsed.flatMap(({ path, deletes, literals }): PolicyFinding[] => {
        if (!expected.delete(path))
            throw new Error(
                `Unexpected or duplicate Python policy result: ${path}`,
            );
        return [
            ...deletes,
            ...literals.flatMap((literal) =>
                inspectSql(literal.source).map((finding) => ({
                    ...finding,
                    line: literal.line,
                })),
            ),
        ].map((finding) => ({ ...finding, path }));
    });
}

function embeddedScript(source: string): string {
    let cursor = 0;
    let result = "";
    const mask = (text: string): string => text.replace(/[^\r\n]/g, " ");
    const groupsSchema = z.object({ header: z.string(), body: z.string() });
    for (const match of source.matchAll(
        /(?<header><script\b(?:"[^"]*"|'[^']*'|[^'">])*>)((?<body>[\s\S]*?))<\/script\s*>/giu,
    )) {
        const { header, body } = groupsSchema.parse(match.groups);
        const start = match.index + header.length;
        result += mask(source.slice(cursor, start)) + body;
        cursor = start + body.length;
    }
    return result + mask(source.slice(cursor));
}

async function collectSources(directory: string): Promise<string[]> {
    const paths: string[] = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (!isProductionSource(relative(repositoryRoot, path))) continue;
        if (entry.isDirectory()) paths.push(...(await collectSources(path)));
        else if (
            sourceExtension.test(entry.name) &&
            !entry.name.endsWith(".d.ts")
        ) {
            if (entry.isSymbolicLink())
                throw new Error(
                    `Cannot verify a linked production source: ${path}`,
                );
            paths.push(path);
        }
    }
    return paths;
}

export async function checkRepository(): Promise<PolicyFinding[]> {
    const paths = [
        ...(await collectSources(resolve(repositoryRoot, "services"))),
        ...(await collectSources(resolve(repositoryRoot, "scripts"))),
    ];
    const sources = await Promise.all(
        paths.map(
            async (path): Promise<PolicySource> => ({
                path,
                source: await readFile(path, "utf8"),
            }),
        ),
    );
    const config = ts.readConfigFile(
        resolve(repositoryRoot, "services/api/tsconfig.json"),
        (path) => ts.sys.readFile(path),
    );
    if (config.error !== undefined)
        throw new Error(
            ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
        );
    const json: unknown = config.config;
    const parsed = ts.parseJsonConfigFileContent(
        z.record(z.string(), z.unknown()).parse(json),
        ts.sys,
        resolve(repositoryRoot, "services/api"),
    );
    if (parsed.errors.length > 0)
        throw new Error(
            parsed.errors
                .map((error) =>
                    ts.flattenDiagnosticMessageText(error.messageText, "\n"),
                )
                .join("\n"),
        );
    const options: ts.CompilerOptions = {
        ...parsed.options,
        allowJs: true,
        noEmit: true,
        paths: {
            ...parsed.options.paths,
            "*": [resolve(repositoryRoot, "services/api/node_modules/*")],
        },
    };
    const scripts = sources
        .filter((source) =>
            /\.(ts|tsx|js|mjs|cjs|vue|svelte)$/.test(source.path),
        )
        .map((source) => ({
            ...source,
            virtualPath: /\.(vue|svelte)$/.test(source.path)
                ? `${source.path}.ts`
                : source.path,
            script: /\.(vue|svelte)$/.test(source.path)
                ? embeddedScript(source.source)
                : source.source,
        }));
    const virtualSources = new Map(
        scripts.map((source) => [source.virtualPath, source.script]),
    );
    const host = ts.createCompilerHost(options);
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (path, version, onError, fresh) => {
        const source = virtualSources.get(path);
        return source === undefined
            ? getSourceFile(path, version, onError, fresh)
            : ts.createSourceFile(path, source, version, true);
    };
    const program = ts.createProgram({
        rootNames: scripts.map((source) => source.virtualPath),
        options,
        host,
    });
    const checker = program.getTypeChecker();
    const findings: PolicyFinding[] = [];
    for (const script of scripts) {
        const sourceFile = program.getSourceFile(script.virtualPath);
        if (sourceFile === undefined)
            throw new Error(`Policy check could not parse ${script.path}`);
        const errors = program.getSyntacticDiagnostics(sourceFile);
        if (errors.length > 0)
            throw new Error(
                `Cannot analyze ${script.path}: ${errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n")}`,
            );
        findings.push(
            ...inspectTypeScript({ sourceFile, checker }).map((finding) => ({
                ...finding,
                path: script.path,
            })),
        );
    }
    findings.push(
        ...inspectPython(
            sources.filter((source) => source.path.endsWith(".py")),
        ),
    );
    const hashes = await loadHistoricalMigrationHashes();
    for (const source of sources.filter((entry) =>
        entry.path.endsWith(".sql"),
    )) {
        const normalized = {
            ...source,
            path: relative(repositoryRoot, source.path).replaceAll("\\", "/"),
        };
        if (normalized.path === approvedEntitlementRetirement.path) {
            const changed = getApprovedRetirementFinding(normalized);
            if (changed !== undefined)
                findings.push({ ...changed, path: source.path });
        } else if (hashes.has(normalized.path)) {
            const changed = getHistoricalMigrationFinding({
                source: normalized,
                hashes,
            });
            if (changed !== undefined)
                findings.push({ ...changed, path: source.path });
        } else
            findings.push(
                ...inspectSql(source.source).map((finding) => ({
                    ...finding,
                    path: source.path,
                })),
            );
    }
    return findings;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const findings = await checkRepository();
    for (const finding of findings)
        console.error(
            `${relative(repositoryRoot, finding.path)}:${String(finding.line)}: ${finding.operation}`,
        );
    if (findings.length > 0) process.exitCode = 1;
    else
        console.info(
            "Soft-delete policy passed: migration exceptions are hash-pinned; application hard deletes are confined to the deletion worker.",
        );
}

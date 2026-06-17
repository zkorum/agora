const STRING_LITERAL_PATTERN = /"((?:[^"\\]|\\.)*)"/g;

export interface SharedTypesSources {
    languagesTs: string;
    sharedTs: string;
}

export function parseStringLiteralZodEnum({
    source,
    exportName,
}: {
    source: string;
    exportName: string;
}): string[] {
    const enumPattern = new RegExp(
        `export\\s+const\\s+${exportName}\\s*=\\s*z\\.enum\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)`,
        "m",
    );
    const enumMatch = enumPattern.exec(source);
    if (enumMatch === null) {
        throw new Error(`Could not find ${exportName} z.enum([...])`);
    }

    const enumBody = enumMatch[1];
    const values: string[] = [];
    for (const stringMatch of enumBody.matchAll(STRING_LITERAL_PATTERN)) {
        const parsed: unknown = JSON.parse(`"${stringMatch[1]}"`);
        if (typeof parsed !== "string") {
            throw new Error(`${exportName} must contain only string literals`);
        }
        values.push(parsed);
    }

    if (values.length === 0) {
        throw new Error(`${exportName} cannot be empty`);
    }

    return values;
}

export function parseDisplayLanguageCodes(source: string): string[] {
    return parseStringLiteralZodEnum({
        source,
        exportName: "ZodSupportedDisplayLanguageCodes",
    });
}

export function parseNumericExport({
    source,
    exportName,
}: {
    source: string;
    exportName: string;
}): number {
    const exportPattern = new RegExp(
        `export\\s+const\\s+${exportName}\\s*=\\s*(\\d+)`,
        "m",
    );
    const match = exportPattern.exec(source);
    if (match === null) {
        throw new Error(`Could not find numeric export ${exportName}`);
    }
    return Number.parseInt(match[1], 10);
}

function formatPythonTuple({
    name,
    values,
}: {
    name: string;
    values: string[];
}): string {
    const formattedValues = values
        .map((value) => `    ${JSON.stringify(value)},`)
        .join("\n");
    return `${name}: tuple[str, ...] = (\n${formattedValues}\n)`;
}

interface PythonSharedSection {
    title: string;
    body: string;
}

function generateDisplayLanguageSection({
    languagesTs,
}: SharedTypesSources): PythonSharedSection {
    const displayLanguageCodes = parseDisplayLanguageCodes(languagesTs);
    const targetLanguageCodes = displayLanguageCodes.filter(
        (code) => code !== "en",
    );
    return {
        title: "Display Languages",
        body: `${formatPythonTuple({
            name: "SUPPORTED_DISPLAY_LANGUAGE_CODES",
            values: displayLanguageCodes,
        })}\n\n${formatPythonTuple({
            name: "SUPPORTED_TRANSLATION_TARGET_LANGUAGE_CODES",
            values: targetLanguageCodes,
        })}`,
    };
}

function generateLengthConstantsSection({
    sharedTs,
}: SharedTypesSources): PythonSharedSection {
    const constants = [
        "MAX_LENGTH_TITLE",
        "MAX_LENGTH_BODY_HTML",
        "MAX_LENGTH_CONVERSATION_BODY",
        "MAX_LENGTH_CONVERSATION_BODY_HTML",
        "LEGACY_MAX_LENGTH_CONVERSATION_BODY_HTML_OUTPUT",
        "MAX_CONVERSATION_LANGUAGE_DETECTION_BODY_CHARS",
        "MIN_CONVERSATION_LANGUAGE_DETECTION_CHARS",
        "MAX_LENGTH_OPINION_HTML_OUTPUT",
    ];
    return {
        title: "Length Constants",
        body: constants
            .map(
                (name) =>
                    `${name}: int = ${String(
                        parseNumericExport({
                            source: sharedTs,
                            exportName: name,
                        }),
                    )}`,
            )
            .join("\n"),
    };
}

const PYTHON_SHARED_SECTION_GENERATORS = [
    generateDisplayLanguageSection,
    generateLengthConstantsSection,
];

export function generatePythonSharedTypes({
    sources,
    sourcePaths,
}: {
    sources: SharedTypesSources;
    sourcePaths: string[];
}): string {
    const sections = PYTHON_SHARED_SECTION_GENERATORS.map((generateSection) =>
        generateSection(sources),
    );
    const sourceList = sourcePaths.join(", ");
    const sectionBody = sections
        .map((section) => `# ${section.title}\n${section.body}`)
        .join("\n\n");
    return `# WARNING: GENERATED FROM ${sourceList}. DO NOT EDIT.\nfrom __future__ import annotations\n\n${sectionBody}\n`;
}

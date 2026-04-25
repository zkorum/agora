import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import type { ExportFileType } from "@/shared/types/zod.js";
import type { ExportParticipantMap } from "./participantMap.js";

export type ExportAccessLevel = "public" | "owner";

/**
 * Parameters required by all CSV generators
 */
export interface GeneratorParams {
    db: PostgresDatabase;
    conversationId: number;
    conversationSlugId: string;
    participantMap: ExportParticipantMap;
    exportAccessLevel: ExportAccessLevel;
}

/**
 * Result returned by all CSV generators
 */
export interface CsvGeneratorResult {
    csvBuffer: Buffer;
    recordCount: number;
}

/**
 * Base interface for all CSV file generators
 */
export interface CsvGenerator {
    /** The file type this generator produces */
    readonly fileType: ExportFileType;

    /** Minimum access level needed to include this file */
    readonly minimumAccessLevel: ExportAccessLevel;

    /** Generate the CSV file */
    generate(params: GeneratorParams): Promise<CsvGeneratorResult>;
}

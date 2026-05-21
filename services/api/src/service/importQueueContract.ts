import type { EventSlug, ParticipationMode } from "@/shared/types/zod.js";
import { zodEventSlug, zodParticipationMode } from "@/shared/types/zod.js";
import { z } from "zod";
import type { CsvFiles } from "./csvImport.js";
import { zodCsvFiles } from "./csvImport.js";

function withJsonSchemaId<T extends z.ZodType>(id: string, schema: T): T {
    return schema.meta({ id });
}

const zodImportFormData = withJsonSchemaId(
    "ImportFormData",
    z
        .object({
            postAsOrganization: z.string().optional(),
            participationMode: zodParticipationMode,
            isIndexed: z.boolean(),
            requiresEventTicket: zodEventSlug.optional(),
            aiLabelingEnabled: z.boolean().default(true),
        })
        .strict(),
);

const zodImportRequestBase = withJsonSchemaId(
    "ImportRequestBase",
    z
        .object({
            importSlugId: z.string(),
            userId: z.string(),
            formData: zodImportFormData,
            didWrite: z.string(),
            authorId: z.string(),
        })
        .strict(),
);

const zodImportCsvFiles = withJsonSchemaId("CsvFiles", zodCsvFiles);

const zodCsvImportRequest = withJsonSchemaId(
    "CsvImportRequest",
    zodImportRequestBase.extend({
        type: z.literal("csv"),
        files: zodImportCsvFiles,
    }),
);

const zodUrlImportRequest = withJsonSchemaId(
    "UrlImportRequest",
    zodImportRequestBase.extend({
        type: z.literal("url"),
        polisUrl: z.string(),
    }),
);

export const zodImportRequest = z.discriminatedUnion("type", [
    zodCsvImportRequest,
    zodUrlImportRequest,
]);

export const zodMinimalImportRequest = withJsonSchemaId(
    "MinimalImportRequest",
    z
        .object({
            importSlugId: z.string(),
            userId: z.string(),
        })
        .loose(),
);

export const zodImportNotificationEvent = withJsonSchemaId(
    "ImportWorkerEvent",
    z
        .object({
            type: z.literal("import_notification"),
            userId: z.string(),
            notificationSlugId: z.string(),
            importId: z.number().int(),
            conversationId: z.number().int().nullable(),
            broadcastNewConversation: z.boolean().default(false),
        })
        .strict(),
);

export const zodImportWorkerEvent = zodImportNotificationEvent;

export const zodImportWorkerContracts = withJsonSchemaId(
    "ImportWorkerContracts",
    z
        .object({
            importRequest: zodImportRequest,
            minimalImportRequest: zodMinimalImportRequest,
            importWorkerEvent: zodImportWorkerEvent,
        })
        .strict(),
);

interface ImportRequestBase {
    importSlugId: string;
    userId: string;
    formData: {
        postAsOrganization?: string;
        participationMode: ParticipationMode;
        isIndexed: boolean;
        requiresEventTicket?: EventSlug;
        aiLabelingEnabled: boolean;
    };
    didWrite: string;
    authorId: string;
}

export interface CsvImportRequest extends ImportRequestBase {
    type: "csv";
    files: CsvFiles;
}

export interface UrlImportRequest extends ImportRequestBase {
    type: "url";
    polisUrl: string;
}

export type ImportRequest = CsvImportRequest | UrlImportRequest;
export type ImportWorkerEvent = z.infer<typeof zodImportWorkerEvent>;

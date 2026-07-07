import {
    zodEventSlug,
    zodImportFailureReason,
    zodParticipationMode,
} from "@/shared/types/zod.js";
import { ZodSupportedDisplayLanguageCodes } from "@/shared/languages.js";
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
            participationMode: zodParticipationMode,
            isIndexed: z.boolean(),
            requiresEventTicket: zodEventSlug.optional(),
            aiLabelingEnabled: z.boolean().default(true),
            preferredOpinionGroupCount: z
                .number()
                .int()
                .min(2)
                .max(6)
                .nullable()
                .optional(),
            languageTargetPolicy: z.discriminatedUnion("source", [
                z
                    .object({
                        source: z.literal("conversation_override"),
                        dynamicTranslationEnabled: z.boolean(),
                        manualTargetLanguageCodes: z
                            .array(ZodSupportedDisplayLanguageCodes)
                            .max(2)
                            .refine(
                                (languageCodes) =>
                                    new Set(languageCodes).size ===
                                    languageCodes.length,
                                "Manual target languages must be unique",
                            ),
                    })
                    .strict(),
                z
                    .object({
                        source: z.literal("project_inherited"),
                        dynamicTranslationEnabled: z.boolean(),
                        effectiveTargetLanguageCodes: z
                            .array(ZodSupportedDisplayLanguageCodes)
                            .max(3)
                            .refine(
                                (languageCodes) =>
                                    new Set(languageCodes).size ===
                                    languageCodes.length,
                                "Effective target languages must be unique",
                            ),
                    })
                    .strict(),
            ]),
        })
        .strict(),
);

const zodImportRequestBase = withJsonSchemaId(
    "ImportRequestBase",
    z
        .object({
            importSlugId: z.string(),
            userId: z.string(),
            actorUserId: z.string(),
            projectId: z.number().int().positive(),
            formData: zodImportFormData,
            didWrite: z.string(),
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
            notificationCreatedAt: z.string(),
            notificationIsRead: z.boolean(),
            importId: z.number().int(),
            importSlugId: z.string(),
            conversationId: z.number().int().nullable(),
            conversationSlugId: z.string().optional(),
            conversationTitle: z.string().optional(),
            failureReason: zodImportFailureReason.optional(),
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

type ImportFormData = z.infer<typeof zodImportFormData>;

interface ImportRequestBase {
    importSlugId: string;
    userId: string;
    actorUserId: string;
    projectId: number;
    formData: ImportFormData;
    didWrite: string;
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

import { httpErrors } from "@fastify/sensible";
import { z } from "zod";
import { normalizeUserRichTextHtml } from "@/shared/richTextHtml.js";
import type { ParticipationMode } from "@/shared/participationMode.js";
import { Dto } from "@/shared/types/dto.js";
import {
    getManualMultilingualSettingsFromProjectLanguageSettings,
    type InheritableProjectLanguageSettingsInput,
} from "./translationLanguageSetting.js";

export type DraftContent = z.infer<typeof Dto.conversationDraftContent>;

const draftDocument = z.record(z.string(), z.unknown());
const maxDraftDocumentBytes = 1_000_000;

export function readDraftContent({
    content,
    conversationType,
}: {
    content: unknown;
    conversationType: DraftContent["conversationType"];
}): DraftContent {
    return Dto.conversationDraftContent.parse({
        ...draftDocument.parse(content),
        conversationType,
    });
}

function normalizeOptionalHtml(html: string | undefined): string | undefined {
    return html === undefined ? undefined : normalizeUserRichTextHtml(html);
}

function normalizeDraftHtml(draft: DraftContent): DraftContent {
    const body = normalizeOptionalHtml(draft.conversationBody);
    if (
        draft.conversationType === "polis" ||
        (draft.conversationType === "prioritizing" &&
            draft.prioritizationType === "comparisons")
    ) {
        return {
            ...draft,
            conversationBody: body,
            seedOpinionList: draft.seedOpinionList?.map(
                normalizeUserRichTextHtml,
            ),
        };
    }
    if (
        draft.conversationType === "prioritizing" &&
        draft.prioritizationType === "qv"
    ) {
        return {
            ...draft,
            conversationBody: body,
            seedStatements: draft.seedStatements?.map((item) => ({
                title: normalizeOptionalHtml(item.title),
                description: normalizeOptionalHtml(item.description),
            })),
        };
    }
    return { ...draft, conversationBody: body };
}

export function prepareDraftContent(draft: DraftContent): {
    conversationType: DraftContent["conversationType"];
    content: Record<string, unknown>;
} {
    // An omitted source means inheritance. Reject contradictory values rather
    // than reporting a successful save that silently loses an override.
    if (
        (draft.multilingualSetting !== undefined &&
            draft.languageSettingsSource !== "conversation_override") ||
        (draft.participationMode !== undefined &&
            draft.participationModeSettingsSource !== "conversation_override")
    ) {
        throw httpErrors.badRequest(
            "Draft overrides require an explicit settings source",
        );
    }
    const cleaned = Dto.conversationDraftContent.safeParse(
        normalizeDraftHtml(draft),
    );
    if (!cleaned.success) throw httpErrors.badRequest("Invalid draft content");
    const { conversationType, ...content } = cleaned.data;
    const json = JSON.stringify(content, (_key, value: unknown): unknown => {
        // PostgreSQL JSONB cannot represent NUL or lone surrogates.
        if (
            typeof value === "string" &&
            (value.includes("\u0000") || /[\uD800-\uDFFF]/u.test(value))
        ) {
            throw httpErrors.badRequest("Invalid draft content");
        }
        return value;
    });
    if (Buffer.byteLength(json) > maxDraftDocumentBytes) {
        throw httpErrors.badRequest("Draft content exceeds storage limit");
    }
    return { conversationType, content };
}

export function parseDraftPublication({
    content,
    projectSlug,
    postAsOrganization,
    projectParticipationMode,
    projectLanguageSettings,
}: {
    content: DraftContent;
    projectSlug: string;
    postAsOrganization: string | undefined;
    projectParticipationMode: ParticipationMode;
    projectLanguageSettings:
        | InheritableProjectLanguageSettingsInput
        | undefined;
}) {
    const participationModeSettingsSource =
        content.participationModeSettingsSource ?? "project_inherited";
    return Dto.createNewConversationRequest.safeParse({
        ...content,
        projectSlug,
        postAsOrganization,
        languageSettingsSource:
            content.languageSettingsSource ?? "project_inherited",
        multilingualSetting:
            projectLanguageSettings === undefined
                ? content.multilingualSetting
                : getManualMultilingualSettingsFromProjectLanguageSettings({
                      languageSettings: projectLanguageSettings,
                  }),
        participationModeSettingsSource,
        participationMode:
            participationModeSettingsSource === "project_inherited"
                ? projectParticipationMode
                : content.participationMode,
        isIndexed: content.isIndexed ?? true,
        seedOpinionList:
            "seedOpinionList" in content ? (content.seedOpinionList ?? []) : [],
    });
}

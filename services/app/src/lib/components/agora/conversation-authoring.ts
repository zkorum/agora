import type { ConversationSetup } from "#lib/api/agora/conversation-setup.js";
import * as m from "#lib/paraglide/messages.js";
import { gatheringAnswerLimits } from "$logic/agora/gathering-format.js";

import type { ConversationSettings } from "./conversation-settings.js";

type GatheringSetup = Extract<
  ConversationSetup,
  { conversationType: "gathering" }
>;
export type ResponseFormat = GatheringSetup["responseFormat"];
export type Answers = GatheringSetup["seedGatheringResponses"][number];
interface SeedText {
  id: string;
  title: string;
  description: string;
}
interface SeedResponse {
  id: string;
  answers: Answers;
}
export interface AuthoringContent {
  statements: SeedText[];
  format: ResponseFormat;
  responses: SeedResponse[];
}

function defaultResponseFormat(): ResponseFormat {
  return [
    {
      fieldId: crypto.randomUUID(),
      label: m.authoring_title(),
      characterLimit: gatheringAnswerLimits.short,
      required: true,
    },
    {
      fieldId: crypto.randomUUID(),
      label: m.project_create_body(),
      characterLimit: gatheringAnswerLimits.long,
      required: true,
    },
  ];
}

function seedText({
  title,
  description = "",
}: {
  title: string;
  description?: string;
}): SeedText {
  return { id: crypto.randomUUID(), title, description };
}

export function initialContent(
  source: ConversationSettings["participation"]["kind"] | ConversationSetup,
): AuthoringContent {
  if (typeof source === "string") {
    return {
      format: source === "gathering" ? defaultResponseFormat() : [],
      statements: [],
      responses: [],
    };
  }
  if (source.conversationType === "gathering") {
    return {
      format: source.responseFormat,
      statements: [],
      responses: source.seedGatheringResponses.map((answers) => ({
        id: crypto.randomUUID(),
        answers,
      })),
    };
  }
  return {
    format: [],
    responses: [],
    statements:
      "seedStatements" in source
        ? source.seedStatements.map(seedText)
        : source.seedOpinions.map((title) => seedText({ title })),
  };
}
export function composeSetup({
  settings,
  content,
}: {
  settings: ConversationSettings;
  content: AuthoringContent;
}): ConversationSetup | undefined {
  const base = { title: settings.title, description: settings.description };
  const p = settings.participation;
  if (p.kind === "gathering") {
    if (p.gatheringMode === "amend") return undefined;
    return {
      ...base,
      conversationType: "gathering",
      allowNewResponses: p.allowNewResponses,
      responseVisibility: p.responseVisibility,
      responseFormat: content.format,
      seedGatheringResponses: content.responses.map((r) => r.answers),
    };
  }
  if (p.kind === "polis")
    return {
      ...base,
      conversationType: "polis",
      display: p.display,
      allowNewOpinions: p.allowNewOpinions,
      seedOpinions: content.statements.map(({ title }) => title),
    };
  if (p.method === undefined) return undefined;
  if (p.method === "qv")
    return {
      ...base,
      conversationType: "prioritizing",
      prioritizationType: "qv",
      allowOpposition: p.allowOpposition,
      seedStatements: content.statements.map((s) => ({
        title: s.title,
        description: s.description || undefined,
      })),
    };
  return {
    ...base,
    conversationType: "prioritizing",
    prioritizationType: "comparisons",
    comparisonMethod: p.method,
    allowParticipantStatements: p.allowParticipantStatements,
    seedOpinions: content.statements.map(({ title }) => title),
  };
}

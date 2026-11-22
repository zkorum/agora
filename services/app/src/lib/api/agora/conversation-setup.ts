import { z } from "zod";

import { projectSlugSchema } from "$logic/agora/project-creation.js";

import {
  createGatheringAnswerParser,
  gatheringCreation,
} from "../../../../../shared/src/gathering.js";
import { MAX_SEED_GATHERING_RESPONSES_PER_CREATION } from "../../../../../shared/src/gatheringLimits.js";
import {
  getDuplicateSeedOpinionIndexes,
  MAX_SEED_OPINIONS_PER_SUBMISSION,
} from "../../../../../shared/src/seedOpinions.js";
import {
  countUnicodeCodePoints,
  hasVisiblePlainText,
  MAX_LENGTH_BODY,
  MAX_LENGTH_CONVERSATION_BODY,
  MAX_LENGTH_CONVERSATION_TITLE,
  MAX_LENGTH_OPINION,
} from "../../../../../shared/src/shared.js";

const plainText = (max: number) =>
  z
    .string()
    .trim()
    .refine((text) => countUnicodeCodePoints(text) <= max);
const opinion = plainText(MAX_LENGTH_OPINION).refine(hasVisiblePlainText);
const seedOpinions = z.array(opinion);
const details = {
  title: z.string().trim().min(1).max(MAX_LENGTH_CONVERSATION_TITLE),
  description: plainText(MAX_LENGTH_CONVERSATION_BODY),
};

const newGathering = gatheringCreation.options[0];
const newGatheringContent = newGathering.omit({ gatheringMode: true }).extend({
  // A published snapshot may include seeds added in later submissions.
  seedGatheringResponses: newGathering.shape.seedGatheringResponses
    .unwrap()
    .element.array()
    .default([]),
});
const gatheringSetup = z
  .looseObject({ ...details, conversationType: z.literal("gathering") })
  .transform(
    ({ title, description, conversationType, ...content }, context) => {
      // The packages version Zod independently. Share the parsed value rather
      // than embedding a shared-package Zod instance in the app's union.
      const parsed = newGatheringContent.safeParse(content);
      if (!parsed.success) {
        for (const { path, message } of parsed.error.issues)
          context.addIssue({ code: "custom", path, message });
        return z.NEVER;
      }
      const setup = { title, description, conversationType, ...parsed.data };
      if (setup.seedGatheringResponses.length === 0) return setup;
      const parseAnswers = createGatheringAnswerParser(setup.responseFormat);
      const seedGatheringResponses = [];
      for (const [index, answers] of setup.seedGatheringResponses.entries()) {
        try {
          seedGatheringResponses.push(parseAnswers(answers));
        } catch {
          context.addIssue({
            code: "custom",
            path: ["seedGatheringResponses", index],
            message: "Response does not match the Gathering format",
          });
          return z.NEVER;
        }
      }
      return { ...setup, seedGatheringResponses };
    },
  );

export const publishedConversationSetupSchema = z.discriminatedUnion(
  "conversationType",
  [
    gatheringSetup,
    z.strictObject({
      ...details,
      conversationType: z.literal("polis"),
      display: z.enum(["feed", "deck"]),
      allowNewOpinions: z.boolean(),
      seedOpinions,
    }),
    z.discriminatedUnion("prioritizationType", [
      z.strictObject({
        ...details,
        conversationType: z.literal("prioritizing"),
        prioritizationType: z.literal("comparisons"),
        comparisonMethod: z.enum(["pairwise", "bws"]),
        allowParticipantStatements: z.boolean(),
        seedOpinions,
      }),
      z.strictObject({
        ...details,
        conversationType: z.literal("prioritizing"),
        prioritizationType: z.literal("qv"),
        allowOpposition: z.boolean(),
        seedStatements: z
          .array(
            z.strictObject({
              title: opinion,
              description: plainText(MAX_LENGTH_BODY).optional(),
            }),
          )
          .min(1)
          .max(MAX_SEED_OPINIONS_PER_SUBMISSION),
      }),
    ]),
  ],
);

export const conversationSetupSchema =
  publishedConversationSetupSchema.superRefine((setup, context) => {
    if (setup.conversationType === "gathering") {
      if (
        setup.seedGatheringResponses.length >
        MAX_SEED_GATHERING_RESPONSES_PER_CREATION
      )
        context.addIssue({
          code: "custom",
          path: ["seedGatheringResponses"],
          message: "Too many initial Gathering responses",
        });
    } else if ("seedOpinions" in setup) {
      if (setup.seedOpinions.length > MAX_SEED_OPINIONS_PER_SUBMISSION)
        context.addIssue({
          code: "custom",
          path: ["seedOpinions"],
          message: "Too many initial statements",
        });
      const duplicates = getDuplicateSeedOpinionIndexes({
        opinions: setup.seedOpinions.map((plainText, index) => ({
          plainText,
          index,
        })),
        existingOpinions: [],
      });
      for (const index of duplicates)
        context.addIssue({
          code: "custom",
          path: ["seedOpinions", index],
          message: "Duplicate seed statement",
        });
    }
  });

export type ConversationSetup = z.infer<
  typeof publishedConversationSetupSchema
>;
const activityStatus = z.enum(["open", "closed"]);
export const createdProjectConversationSchema = z.strictObject({
  projectSlug: projectSlugSchema,
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  status: activityStatus.default("open"),
  revision: z.number().int().nonnegative().default(0),
  setup: publishedConversationSetupSchema,
});
export type CreatedProjectConversation = z.infer<
  typeof createdProjectConversationSchema
>;
export interface PublishConversationDraftInput {
  projectSlug: string;
  draftId: string;
  setup: ConversationSetup;
}

// Record defaults migrate old storage. Commands must explicitly request a status.
export const updateCreatedConversationSchema = z.strictObject({
  projectSlug: projectSlugSchema,
  conversationId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  change: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("status"), status: activityStatus }),
    z.strictObject({
      kind: z.literal("setup"),
      setup: publishedConversationSetupSchema,
    }),
  ]),
});
export type UpdateCreatedConversationInput = z.infer<
  typeof updateCreatedConversationSchema
>;

function sameItems<T>({
  left,
  right,
  matches,
}: {
  left: readonly T[];
  right: readonly T[];
  matches: (pair: { a: T; b: T }) => boolean;
}): boolean {
  return (
    left.length === right.length &&
    left.every((a, index) => {
      const b = right[index];
      return b !== undefined && matches({ a, b });
    })
  );
}

type GatheringSetup = Extract<
  ConversationSetup,
  { conversationType: "gathering" }
>;

function onlyRemovedResponses({
  previous,
  next,
}: {
  previous: GatheringSetup["seedGatheringResponses"];
  next: GatheringSetup["seedGatheringResponses"];
}): boolean {
  if (next.length > previous.length) return false;
  let kept = 0;
  // There are no server response IDs in the mock. Match normalized answer rows
  // as a subsequence, so removal is legal but replacement and reordering are not.
  for (const row of previous) {
    const candidate = next.at(kept);
    if (!candidate) break;
    if (
      sameItems({
        left: row,
        right: candidate,
        matches: ({ a, b }) => a.fieldId === b.fieldId && a.value === b.value,
      })
    )
      kept++;
  }
  return kept === next.length;
}

// The mock models an authorized facilitator and stores no participant votes.
// Preview responses and demonstration moderation must never affect editability.
export function canApplyPublishedSetup({
  current,
  next,
}: {
  current: CreatedProjectConversation;
  next: ConversationSetup;
}): boolean {
  const previous = current.setup;
  if (next.conversationType === "gathering") {
    if (
      previous.conversationType !== "gathering" ||
      next.responseVisibility !== previous.responseVisibility ||
      !sameItems({
        left: previous.responseFormat,
        right: next.responseFormat,
        matches: ({ a, b }) =>
          a.fieldId === b.fieldId &&
          a.label === b.label &&
          a.required === b.required &&
          a.characterLimit === b.characterLimit,
      })
    )
      return false;
    return (
      current.status === "open" ||
      onlyRemovedResponses({
        previous: previous.seedGatheringResponses,
        next: next.seedGatheringResponses,
      })
    );
  }
  if (next.conversationType !== previous.conversationType) return false;
  if (next.conversationType === "prioritizing") {
    if (previous.conversationType !== "prioritizing") return false;
    if (next.prioritizationType === "qv") {
      return (
        previous.prioritizationType === "qv" &&
        previous.allowOpposition === next.allowOpposition &&
        (current.status === "open" ||
          sameItems({
            left: previous.seedStatements,
            right: next.seedStatements,
            matches: ({ a, b }) =>
              a.title === b.title && a.description === b.description,
          }))
      );
    }
    if (
      previous.prioritizationType !== "comparisons" ||
      next.comparisonMethod !== previous.comparisonMethod
    )
      return false;
  }
  if (!("seedOpinions" in previous)) return false;
  return canChangeSeeds({
    previous: previous.seedOpinions,
    next: next.seedOpinions,
  });
}

function canChangeSeeds({
  previous,
  next,
}: {
  previous: readonly string[];
  next: readonly string[];
}): boolean {
  // Existing mock activities may predate duplicate checks. Only new/edited
  // text can introduce a conflict; an unrelated settings edit must still work.
  const remaining = new Map<string, number>();
  for (const text of previous)
    remaining.set(text, (remaining.get(text) ?? 0) + 1);
  const retained: string[] = [];
  const submitted: { index: number; plainText: string }[] = [];
  for (const [index, text] of next.entries()) {
    const count = remaining.get(text) ?? 0;
    if (count) {
      remaining.set(text, count - 1);
      retained.push(text);
    } else submitted.push({ index, plainText: text });
  }
  // The backend bounds additions separately from edits/deletions. A snapshot
  // needs at least one edit/delete per previously unmatched seed, and one add
  // per net new row; the lifetime number of seeds is not the batch limit.
  if (
    previous.length - retained.length > MAX_SEED_OPINIONS_PER_SUBMISSION ||
    next.length - previous.length > MAX_SEED_OPINIONS_PER_SUBMISSION
  )
    return false;
  return (
    getDuplicateSeedOpinionIndexes({
      opinions: submitted,
      existingOpinions: retained,
    }).length === 0
  );
}

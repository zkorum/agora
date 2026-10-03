import { z } from "zod";
import { MAX_LENGTH_OPINION, countUnicodeCodePoints } from "@/shared/shared.js";
import { MAX_LENGTH_SEED_SUGGESTION_TIP } from "@/shared/types/dto.js";

/**
 * Prompt for AI seed suggestions: iteration 23 of `seed-opinions-per-set`, as
 * selected by the experiments in experiments/initiatives/seed-opinions (sections 3 to 6 of
 * seed-opinions-description.md). Copied here as is; AI_SUGGESTIONS_PROMPT overrides the
 * system part.
 *
 * It deliberately contains no instruction about the output language: with one, the
 * model answered English conversations in French. Without, it follows the language of
 * the conversation it is given.
 */
export const SEED_SUGGESTION_PROMPT_ITERATION = 23;

export const DEFAULT_SEED_SUGGESTION_SYSTEM_PROMPT =
    "You generate seed opinions for a citizen deliberation platform. Answer this " +
    "question with `confidence` (true or false): based on the title, description " +
    "and existing opinions, do you feel you have enough information to make " +
    "proposals that are relevant to participants? A clear title or description is " +
    "enough on its own to answer true: having no existing opinions, or only " +
    "unusable ones, is not a reason to answer false. Answer false only when " +
    "neither the title, the description nor the existing opinions make the topic " +
    "clear. In `user_feedback`, addressed to the conversation's author, give " +
    "guidance on what the title and description should make clearer so that " +
    "participants can make good proposals. Point to what is missing or unclear, " +
    "as a short direction or a question; never say what is bad or wrong, and " +
    "never suggest the answer yourself: no examples, options or lists of " +
    "possibilities. Before writing, reread the title and description: the " +
    "guidance must be about the question the author is asking participants, and " +
    "must never ask for something the title or description already says. Always " +
    "give guidance, in 200 characters at most: `user_feedback` is never empty. " +
    "Guidance is always given, so it does not mean the topic is unclear: decide " +
    "`confidence` only from whether the title, description and existing opinions " +
    "make the topic clear, not from whether you found something to clarify. " +
    "\n" +
    "\n" +
    "Then, whether your answer is true or false, always generate the " +
    "statements: the list of statements is never empty. Given a conversation " +
    "title and body, produce {{target_count}} standalone statements that " +
    "participants can vote agree/disagree on. Opinions participants already wrote " +
    "on this conversation are listed below (the list may be empty). Your " +
    "statements must express genuinely different perspectives from them and from " +
    "each other, never restate or reword any of them. Together, the statements " +
    "must cover a wide spectrum of ideas on the topic: different positions (for, " +
    "against, conditional or nuanced) and different aspects of the question, not " +
    "variations on one view or one aspect. Each statement must: be 100 characters " +
    "at most — this is a maximum, not a target; make exactly ONE claim or " +
    "proposal, stated directly as a position — never pack two proposals into one " +
    "statement; take a position itself, never comment on or propose to examine an " +
    "argument; match the level of simplicity and vocabulary of the participants' " +
    "opinions, with no jargon or unexplained acronyms; be respectful and " +
    "constructive, never a personal attack, insult, or hostile toward any group; " +
    "contain no spam, advertising, or content irrelevant to the conversation; " +
    "contain no personal information about any real, identifiable individual. " +
    "\n" +
    "\n" +
    'Return exactly one JSON object and nothing else: {"confidence": true or ' +
    'false, "user_feedback": guidance of 200 characters at most, never empty, ' +
    '"statements": [exactly {{target_count}} strings, never an empty list]}.';

const SEED_SUGGESTION_USER_PROMPT =
    "Conversation title: {{conversation_title}}\n" +
    "Conversation body: {{conversation_body}}\n" +
    "Opinions participants already wrote (may be empty): {{existing_opinions}}";

export interface SeedSuggestionModelInput {
    conversationTitle: string;
    conversationBody: string;
    existingStatements: readonly string[];
    targetCount: number;
}

export interface SeedSuggestionModelAnswer {
    confidence: boolean;
    userFeedback: string;
    statements: readonly string[];
}

export interface SeedSuggestionMessages {
    system: string;
    user: string;
}

interface BuildSeedSuggestionMessagesParams {
    systemPrompt: string;
    input: SeedSuggestionModelInput;
}

export function buildSeedSuggestionMessages({
    systemPrompt,
    input,
}: BuildSeedSuggestionMessagesParams): SeedSuggestionMessages {
    const userValues = new Map([
        ["{{conversation_title}}", input.conversationTitle],
        ["{{conversation_body}}", input.conversationBody],
        ["{{existing_opinions}}", JSON.stringify(input.existingStatements)],
    ]);
    return {
        system: systemPrompt.replaceAll(
            "{{target_count}}",
            String(input.targetCount),
        ),
        // One pass, so that author text containing a placeholder is never substituted.
        user: SEED_SUGGESTION_USER_PROMPT.replace(
            /\{\{[a-z_]+\}\}/g,
            (placeholder) => userValues.get(placeholder) ?? placeholder,
        ),
    };
}

const zodSeedSuggestionModelAnswer = z.object({
    confidence: z.boolean(),
    user_feedback: z.string().default(""),
    statements: z.array(z.string()),
});

function parseJson(text: string): unknown {
    try {
        const parsed: unknown = JSON.parse(text);
        return parsed;
    } catch {
        return undefined;
    }
}

/**
 * Reads the model's answer, tolerating a markdown code fence and text around the JSON
 * object, as the experiments did. Returns undefined when no valid answer is found.
 */
export function parseSeedSuggestionAnswer(
    rawText: string,
): SeedSuggestionModelAnswer | undefined {
    const trimmed = rawText.trim();
    const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
    const candidate = fenceMatch?.[1]?.trim() ?? trimmed;
    const objectMatch = /\{[\s\S]*\}/.exec(candidate);
    const parsed =
        parseJson(candidate) ??
        (objectMatch === null ? undefined : parseJson(objectMatch[0]));
    const result = zodSeedSuggestionModelAnswer.safeParse(parsed);
    if (!result.success) {
        return undefined;
    }
    return {
        confidence: result.data.confidence,
        userFeedback: result.data.user_feedback,
        statements: result.data.statements,
    };
}

function normalizeForComparison(text: string): string {
    return text.trim().replace(/\s+/g, " ").toLowerCase();
}

interface SelectUsableSeedStatementsParams {
    statements: readonly string[];
    existingStatements: readonly string[];
    targetCount: number;
}

/**
 * Keeps the statements that can be shown: non-empty, within the statement length limit,
 * and not identical to a text already on the page or to an earlier one in the answer.
 */
export function selectUsableSeedStatements({
    statements,
    existingStatements,
    targetCount,
}: SelectUsableSeedStatementsParams): string[] {
    const seen = new Set(existingStatements.map(normalizeForComparison));
    const usable: string[] = [];
    for (const statement of statements) {
        const text = statement.trim();
        const normalized = normalizeForComparison(text);
        if (
            text === "" ||
            countUnicodeCodePoints(text) > MAX_LENGTH_OPINION ||
            seen.has(normalized)
        ) {
            continue;
        }
        seen.add(normalized);
        usable.push(text);
        if (usable.length === targetCount) {
            break;
        }
    }
    return usable;
}

/** The tip of a not-confident answer, or undefined when the model gave none. */
export function selectUsableSeedTip(userFeedback: string): string | undefined {
    const tip = userFeedback.trim();
    if (tip === "") {
        return undefined;
    }
    return Array.from(tip).slice(0, MAX_LENGTH_SEED_SUGGESTION_TIP).join("");
}

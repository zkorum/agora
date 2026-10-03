import {
    BedrockRuntimeClient,
    ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
    buildSeedSuggestionMessages,
    parseSeedSuggestionAnswer,
    type SeedSuggestionMessages,
    type SeedSuggestionModelAnswer,
    type SeedSuggestionModelInput,
} from "./seedSuggestionPrompt.js";
import type { SeedSuggestionSourceName } from "./seedSuggestionSourceName.js";

export type SeedSuggestionFailureReason =
    | "source_unavailable"
    | "model_failure"
    | "invalid_answer"
    | "timeout";

export type SeedSuggestionModelResult =
    | { success: true; answer: SeedSuggestionModelAnswer }
    | {
          success: false;
          reason: SeedSuggestionFailureReason;
          detail: string;
      };

export interface SeedSuggestionSource {
    name: SeedSuggestionSourceName;
    /** Model identifier, recorded with each request. */
    modelId: string;
    generate: (
        input: SeedSuggestionModelInput,
    ) => Promise<SeedSuggestionModelResult>;
}

// The answer is about 150 tokens; this only guards against a runaway generation.
const MAX_OUTPUT_TOKENS = 1024;
// About 1 Bedrock call in 20 got no answer at all in testing, while the next one
// answered in seconds (slowest normal answer: 7 s). An attempt that takes longer than
// this is abandoned and tried once more, within the overall timeout.
const BEDROCK_ATTEMPT_TIMEOUT_MS = 12_000;

function isTimeoutError(error: unknown): boolean {
    return (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
    );
}

function describeError(error: unknown): string {
    return error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
}

function toModelResult(rawText: string): SeedSuggestionModelResult {
    const answer = parseSeedSuggestionAnswer(rawText);
    if (answer === undefined) {
        return {
            success: false,
            reason: "invalid_answer",
            detail: "the model's answer is not the expected JSON object",
        };
    }
    return { success: true, answer };
}

interface CompleteParams {
    messages: SeedSuggestionMessages;
    signal: AbortSignal;
}

/** Sends the two messages to a model and returns the text of its answer. */
type Complete = (params: CompleteParams) => Promise<string>;

interface CreateModelSeedSuggestionSourceParams {
    name: SeedSuggestionSourceName;
    modelId: string;
    systemPrompt: string;
    timeoutMs: number;
    complete: Complete;
}

function createModelSeedSuggestionSource({
    name,
    modelId,
    systemPrompt,
    timeoutMs,
    complete,
}: CreateModelSeedSuggestionSourceParams): SeedSuggestionSource {
    const generate = async (
        input: SeedSuggestionModelInput,
    ): Promise<SeedSuggestionModelResult> => {
        try {
            const rawText = await complete({
                messages: buildSeedSuggestionMessages({ systemPrompt, input }),
                signal: AbortSignal.timeout(timeoutMs),
            });
            return toModelResult(rawText);
        } catch (error: unknown) {
            return {
                success: false,
                reason: isTimeoutError(error) ? "timeout" : "model_failure",
                detail: describeError(error),
            };
        }
    };
    return { name, modelId, generate };
}

export interface BedrockConverseParams {
    modelId: string;
    messages: SeedSuggestionMessages;
    temperature: number;
    signal: AbortSignal;
}

/** One Bedrock Converse call, returning the text of the answer. Faked in tests. */
export type BedrockConverse = (
    params: BedrockConverseParams,
) => Promise<string>;

/** Uses the normal AWS credentials of the process, like the analysis workers. */
export function createBedrockConverse(region: string): BedrockConverse {
    // Created on first use: the client is not needed while the feature is off.
    let client: BedrockRuntimeClient | undefined;

    return async ({ modelId, messages, temperature, signal }) => {
        client ??= new BedrockRuntimeClient({ region });
        const output = await client.send(
            new ConverseCommand({
                modelId,
                system: [{ text: messages.system }],
                messages: [
                    { role: "user", content: [{ text: messages.user }] },
                ],
                inferenceConfig: { temperature, maxTokens: MAX_OUTPUT_TOKENS },
            }),
            { abortSignal: signal },
        );
        const text = (output.output?.message?.content ?? [])
            .map((block) => block.text ?? "")
            .join("");
        if (text === "") {
            throw new Error("Bedrock returned no text");
        }
        return text;
    };
}

export interface BedrockSeedSuggestionSourceParams {
    modelId: string;
    systemPrompt: string;
    temperature: number;
    /** Overall limit for a generation, retry included. */
    timeoutMs: number;
    /** Limit for one Bedrock call before it is tried once more. */
    attemptTimeoutMs?: number;
    converse: BedrockConverse;
}

export function createBedrockSeedSuggestionSource({
    modelId,
    systemPrompt,
    temperature,
    timeoutMs,
    attemptTimeoutMs = BEDROCK_ATTEMPT_TIMEOUT_MS,
    converse,
}: BedrockSeedSuggestionSourceParams): SeedSuggestionSource {
    const complete: Complete = async ({ messages, signal }) => {
        const attempt = (): Promise<string> =>
            converse({
                modelId,
                messages,
                temperature,
                signal: AbortSignal.any([
                    signal,
                    AbortSignal.timeout(attemptTimeoutMs),
                ]),
            });
        try {
            return await attempt();
        } catch (error: unknown) {
            // Retry only when this attempt's own limit expired: not on other
            // failures, and not once the overall timeout has passed.
            if (signal.aborted || !isTimeoutError(error)) {
                throw error;
            }
            return await attempt();
        }
    };
    return createModelSeedSuggestionSource({
        name: "bedrock",
        modelId,
        systemPrompt,
        timeoutMs,
        complete,
    });
}

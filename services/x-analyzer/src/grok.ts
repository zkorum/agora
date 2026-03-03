import OpenAI from "openai";
import { z } from "zod";
import type { TweetData, Reply } from "./fetch.js";

// Author entry type matching fetch.ts's authorEntrySchema (not exported)
interface AuthorEntry {
    username: string;
    bio?: string;
    followerCount?: number;
    followingCount?: number;
    tweetCount?: number;
    verifiedType?: string;
    accountCreatedAt?: string;
    repliesInThread: number;
    totalLikesInThread: number;
    replyIds: string[];
}

// --- Zod schemas for Grok responses ---

const campSchema = z.object({
    label: z.string(),
    estimatedSize: z.enum(["majority", "significant-minority", "small-minority"]),
    keyVoices: z.array(z.string()),
});

export const scoutResultSchema = z.object({
    topic: z.string(),
    camps: z.array(campSchema),
    faultLines: z.array(z.string()),
    qualityScore: z.number().min(0).max(10),
    estimatedBotPrevalence: z.number().min(0).max(1),
    priorityAuthors: z.array(z.string()),
    priorityReplyIds: z.array(z.string()),
    priorityQuoteTweetIds: z.array(z.string()),
    suggestedBudget: z.number().min(0),
    suggestedAutoPct: z.number().min(1),
});

export type ScoutResult = z.infer<typeof scoutResultSchema>;

const botAssessmentSchema = z.object({
    authorId: z.string(),
    username: z.string(),
    isBot: z.boolean(),
    confidence: z.enum(["high", "medium", "low"]),
    reasoning: z.string(),
});

export const botDetectionResultSchema = z.object({
    assessments: z.array(botAssessmentSchema),
    botAuthorIds: z.array(z.string()),
    totalAssessed: z.number(),
    totalFlagged: z.number(),
});

export type BotDetectionResult = z.infer<typeof botDetectionResultSchema>;

const salvageReplySchema = z.object({
    replyId: z.string(),
    reason: z.string(),
});

export const enrichResultSchema = z.object({
    relatedThreads: z.array(
        z.object({
            url: z.string(),
            summary: z.string(),
            relevance: z.string(),
        }),
    ),
    participantContext: z.array(
        z.object({
            username: z.string(),
            contextSummary: z.string(),
        }),
    ),
    visualContentInsights: z.array(
        z.object({
            replyId: z.string(),
            description: z.string(),
            inferredStance: z.string().optional(),
        }),
    ),
    semanticHighlights: z.array(
        z.object({
            replyId: z.string(),
            reason: z.string(),
        }),
    ),
    salvaged: z.array(salvageReplySchema),
});

export type EnrichResult = z.infer<typeof enrichResultSchema>;

// --- Grok client ---

const MODEL = "grok-4-1-fast-non-reasoning";
const TIMEOUT_MS = 120_000;

export interface GrokClient {
    scout: (params: {
        tweetUrl: string;
        originalTweet: TweetData;
    }) => Promise<ScoutResult | null>;
    detectBots: (params: {
        authors: Map<string, AuthorEntry>;
        replies: Reply[];
    }) => Promise<BotDetectionResult | null>;
    enrich: (params: {
        originalTweet: TweetData;
        topAuthors?: {
            username: string;
            authorId: string;
            replyCount: number;
            totalLikes: number;
        }[];
        topReplyChains?: {
            rootReplyId: string;
            totalEngagement: number;
            depth: number;
            messages: {
                replyId: string;
                authorUsername: string;
                text: string;
                likeCount: number;
                depth: number;
            }[];
        }[];
        filteredOutReplies?: Reply[];
    }) => Promise<EnrichResult | null>;
}

export function createGrokClient({ apiKey }: { apiKey: string }): GrokClient {
    const client = new OpenAI({
        apiKey,
        baseURL: "https://api.x.ai/v1",
        timeout: TIMEOUT_MS,
    });

    async function callGrok({
        systemPrompt,
        userPrompt,
        useXSearch = false,
    }: {
        systemPrompt: string;
        userPrompt: string;
        useXSearch?: boolean;
    }): Promise<string | null> {
        const apiPath = useXSearch ? "responses" : "chat/completions";
        console.log(
            `  [Grok] callGrok: using ${apiPath} (model=${MODEL}, timeout=${TIMEOUT_MS}ms)`,
        );
        console.log(
            `  [Grok] callGrok: systemPrompt=${systemPrompt.length} chars, userPrompt=${userPrompt.length} chars`,
        );
        const callStart = Date.now();
        try {
            // Use responses API for x_search, chat completions otherwise
            if (useXSearch) {
                // The Responses API supports server-side x_search tool.
                // We use the raw HTTP endpoint since the OpenAI SDK doesn't
                // natively support xAI's x_search server-side tool type.
                const response = await fetch("https://api.x.ai/v1/responses", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: MODEL,
                        input: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt },
                        ],
                        tools: [
                            {
                                type: "x_search",
                                enable_image_understanding: true,
                                enable_video_understanding: true,
                            },
                        ],
                    }),
                    signal: AbortSignal.timeout(TIMEOUT_MS),
                });

                console.log(
                    `  [Grok] Responses API: HTTP ${response.status} (${Date.now() - callStart}ms)`,
                );
                if (!response.ok) {
                    const errorText = await response.text();
                    console.warn(
                        `  [Grok] Responses API error ${response.status}: ${errorText.slice(0, 500)}`,
                    );
                    return null;
                }

                const data = (await response.json()) as {
                    output?: {
                        type: string;
                        content?: { type: string; text?: string }[];
                    }[];
                };

                const outputEntries = data.output ?? [];
                console.log(
                    `  [Grok] Responses API: ${outputEntries.length} output entries, types=[${outputEntries.map((e) => e.type).join(", ")}]`,
                );

                // Extract text from the response output array
                for (const entry of outputEntries) {
                    if (entry.type === "message" && entry.content) {
                        for (const block of entry.content) {
                            if (block.type === "output_text" && block.text) {
                                console.log(
                                    `  [Grok] Responses API: extracted text output (${block.text.length} chars)`,
                                );
                                return block.text;
                            }
                        }
                    }
                }
                console.warn(
                    `  [Grok] No text output in Responses API response. Full output structure: ${JSON.stringify(data.output?.map((e) => ({ type: e.type, contentTypes: e.content?.map((c) => c.type) })))}`,
                );
                return null;
            }

            // Standard chat completions (no x_search needed)
            const completion = await client.chat.completions.create({
                model: MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0]?.message?.content ?? null;
            console.log(
                `  [Grok] Chat completions: ${Date.now() - callStart}ms, ` +
                    `finish_reason=${completion.choices[0]?.finish_reason ?? "none"}, ` +
                    `content=${content ? `${content.length} chars` : "null"}`,
            );
            if (completion.usage) {
                console.log(
                    `  [Grok] Token usage: prompt=${completion.usage.prompt_tokens}, completion=${completion.usage.completion_tokens}, total=${completion.usage.total_tokens}`,
                );
            }
            return content;
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : String(error);
            const stack =
                error instanceof Error ? error.stack : undefined;
            console.warn(
                `  [Grok] API call failed (${Date.now() - callStart}ms): ${message}`,
            );
            if (stack) {
                console.warn(`  [Grok] Stack: ${stack}`);
            }
            return null;
        }
    }

    function parseJsonResponse<T>(
        raw: string | null,
        schema: z.ZodType<T>,
        label: string,
    ): T | null {
        if (!raw) {
            console.log(`  [Grok] parseJsonResponse(${label}): raw input is null`);
            return null;
        }

        console.log(
            `  [Grok] parseJsonResponse(${label}): raw input ${raw.length} chars, preview: ${raw.slice(0, 200)}...`,
        );

        // Extract JSON from markdown code blocks if present
        let jsonStr = raw;
        const codeBlockMatch = /```(?:json)?\s*\n?([\s\S]*?)\n?```/.exec(
            raw,
        );
        if (codeBlockMatch?.[1]) {
            jsonStr = codeBlockMatch[1];
            console.log(
                `  [Grok] parseJsonResponse(${label}): extracted from code block (${jsonStr.length} chars)`,
            );
        }

        try {
            const parsed: unknown = JSON.parse(jsonStr);
            const result = schema.parse(parsed);
            console.log(`  [Grok] parseJsonResponse(${label}): parsed and validated OK`);
            return result;
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                console.warn(
                    `  [Grok] Failed to validate ${label} response (Zod):`,
                );
                for (const issue of error.issues) {
                    console.warn(
                        `    - path=${issue.path.join(".")}, code=${issue.code}, message=${issue.message}`,
                    );
                }
            } else {
                const message =
                    error instanceof Error ? error.message : String(error);
                console.warn(
                    `  [Grok] Failed to parse ${label} response: ${message}`,
                );
            }
            console.warn(
                `  [Grok] Raw response that failed parsing:\n${raw}`,
            );
            return null;
        }
    }

    const scout: GrokClient["scout"] = async ({
        tweetUrl,
        originalTweet,
    }) => {
        console.log("  [Grok] Scouting thread...");

        const systemPrompt = `You are an expert X (Twitter) thread analyst. Your job is to quickly assess an X thread for its potential to produce meaningful opinion clustering (Polis-style analysis).

You will be given a tweet URL and basic metadata. Use your x_search capability to understand the thread, then return a structured JSON assessment.

Focus on:
1. Identifying the TOPIC and main CAMPS (positions people take)
2. Finding FAULT LINES (where people genuinely disagree)
3. Identifying KEY VOICES — especially minority opinion holders who represent genuine alternative viewpoints (not just the most popular voices)
4. Assessing QUALITY — will this thread produce meaningful clusters, or is it mostly noise/memes/bots?
5. Estimating BOT PREVALENCE — what fraction of replies appear to be bots/spam?
6. Identifying PRIORITY REPLIES — specific replies that articulate key arguments regardless of engagement
7. Identifying PRIORITY QUOTES — quote tweets worth exploring for their substantive commentary

Return ONLY valid JSON matching this schema:
{
  "topic": "one-line topic summary",
  "camps": [{ "label": "camp name", "estimatedSize": "majority"|"significant-minority"|"small-minority", "keyVoices": ["@username"] }],
  "faultLines": ["description of disagreement axis"],
  "qualityScore": 0-10,
  "estimatedBotPrevalence": 0.0-1.0,
  "priorityAuthors": ["@username"],
  "priorityReplyIds": ["tweet_id"],
  "priorityQuoteTweetIds": ["tweet_id"],
  "suggestedBudget": dollar_amount,
  "suggestedAutoPct": sensitivity_number
}

Guidelines for suggestedBudget: $3-5 for low-quality threads, $5-15 for medium, $15-25 for high-quality threads rich in genuine debate.
Guidelines for suggestedAutoPct: 5 for noisy threads (more selective filtering), 10 for average, 15-20 for high-quality threads (more permissive).`;

        const userPrompt = `Analyze this X thread:
URL: ${tweetUrl}
Author: @${originalTweet.authorUsername}
Text: "${originalTweet.text}"
Engagement: ${originalTweet.likeCount} likes, ${originalTweet.replyCount} replies, ${originalTweet.quoteCount} quotes

Scout this thread and return your structured JSON assessment.`;

        const raw = await callGrok({
            systemPrompt,
            userPrompt,
            useXSearch: true,
        });
        const result = parseJsonResponse(raw, scoutResultSchema, "scout");

        if (result) {
            console.log(
                `  [Grok] Scout complete: "${result.topic}" (quality: ${result.qualityScore}/10, ${result.camps.length} camps, ~${Math.round(result.estimatedBotPrevalence * 100)}% bots)`,
            );
            console.log(
                `  [Grok] Priority: ${result.priorityAuthors.length} authors, ${result.priorityReplyIds.length} replies, ${result.priorityQuoteTweetIds.length} quotes`,
            );
            console.log(
                `  [Grok] Scout camps: ${JSON.stringify(result.camps)}`,
            );
            console.log(
                `  [Grok] Scout fault lines: ${JSON.stringify(result.faultLines)}`,
            );
            console.log(
                `  [Grok] Scout priority authors: ${JSON.stringify(result.priorityAuthors)}`,
            );
            console.log(
                `  [Grok] Scout priority reply IDs: ${JSON.stringify(result.priorityReplyIds)}`,
            );
            console.log(
                `  [Grok] Scout priority quote IDs: ${JSON.stringify(result.priorityQuoteTweetIds)}`,
            );
            console.log(
                `  [Grok] Scout suggested: budget=$${result.suggestedBudget}, autoPct=${result.suggestedAutoPct}`,
            );
        } else {
            console.warn("  [Grok] Scout returned null result");
        }

        return result;
    };

    const detectBots: GrokClient["detectBots"] = async ({
        authors,
        replies,
    }) => {
        console.log(
            `  [Grok] Running bot detection on ${authors.size} authors (${replies.length} replies)...`,
        );

        // Build author summary for Grok
        const authorSummaries: string[] = [];
        let skippedCount = 0;
        for (const [authorId, author] of authors) {
            // Only assess authors with suspicious signals — no need to
            // send every author (saves tokens)
            const noBio = !author.bio;
            const suspiciousRatio =
                (author.followingCount ?? 0) > 1000 &&
                (author.followerCount ?? 0) < 50;
            const highReplyCount = author.repliesInThread >= 5;
            const lowTweetCount =
                author.tweetCount !== undefined && author.tweetCount < 10;
            const suspicious =
                noBio || suspiciousRatio || highReplyCount || lowTweetCount;

            if (!suspicious) {
                skippedCount++;
            }

            if (suspicious) {
                const signals = [
                    noBio && "no_bio",
                    suspiciousRatio && "high_following_low_followers",
                    highReplyCount && `${author.repliesInThread}_replies_in_thread`,
                    lowTweetCount && `only_${author.tweetCount ?? 0}_tweets`,
                ].filter(Boolean);
                console.log(
                    `  [Grok] Suspicious: @${author.username} (id:${authorId}) signals=[${signals.join(", ")}]`,
                );
                const repliesText = author.replyIds
                    .slice(0, 3)
                    .map((id: string) => {
                        const reply = replies.find((r) => r.id === id);
                        return reply
                            ? `"${reply.text.slice(0, 100)}"`
                            : `[reply ${id}]`;
                    })
                    .join("; ");

                authorSummaries.push(
                    `- @${author.username} (id:${authorId}): bio="${author.bio ?? "none"}", ` +
                        `followers=${author.followerCount ?? "?"}, following=${author.followingCount ?? "?"}, ` +
                        `tweets=${author.tweetCount ?? "?"}, account_created=${author.accountCreatedAt ?? "?"}, ` +
                        `replies_in_thread=${author.repliesInThread}, total_likes=${author.totalLikesInThread}, ` +
                        `sample_replies: ${repliesText}`,
                );
            }
        }

        console.log(
            `  [Grok] Bot detection: ${authorSummaries.length} suspicious, ${skippedCount} clean, ${authors.size} total`,
        );

        if (authorSummaries.length === 0) {
            console.log("  [Grok] No suspicious authors to assess");
            return {
                assessments: [],
                botAuthorIds: [],
                totalAssessed: 0,
                totalFlagged: 0,
            };
        }

        const systemPrompt = `You are an expert at identifying bot accounts on X (Twitter). Assess each author for bot likelihood based on their profile metadata and posting behavior.

Signals of bot accounts:
- No bio combined with suspicious follower/following ratios
- Very new accounts with generic usernames
- Repetitive text patterns across replies
- Promotional content, link spam, auto-generated text
- Extremely high posting volume relative to account age

Signals of REAL accounts (don't flag these):
- Has a coherent bio relevant to the topic
- Organic engagement patterns
- Unique, thoughtful replies even if low engagement
- Verified accounts

When in doubt, mark as NOT a bot — false negatives (missing a bot) are less harmful than false positives (excluding a real person).

Return ONLY valid JSON:
{
  "assessments": [{ "authorId": "id", "username": "@name", "isBot": true/false, "confidence": "high"|"medium"|"low", "reasoning": "brief explanation" }],
  "botAuthorIds": ["id1", "id2"],
  "totalAssessed": N,
  "totalFlagged": N
}`;

        const userPrompt = `Assess these ${authorSummaries.length} suspicious accounts for bot likelihood:\n\n${authorSummaries.join("\n")}`;

        const raw = await callGrok({ systemPrompt, userPrompt });
        const result = parseJsonResponse(
            raw,
            botDetectionResultSchema,
            "bot detection",
        );

        if (result) {
            console.log(
                `  [Grok] Bot detection: ${result.totalFlagged}/${result.totalAssessed} flagged as bots`,
            );
            for (const assessment of result.assessments) {
                console.log(
                    `  [Grok] Bot assessment: @${assessment.username} (id:${assessment.authorId}) → isBot=${assessment.isBot}, confidence=${assessment.confidence}, reason="${assessment.reasoning}"`,
                );
            }
            console.log(
                `  [Grok] Bot author IDs to exclude: ${JSON.stringify(result.botAuthorIds)}`,
            );
        } else {
            console.warn("  [Grok] Bot detection returned null result");
        }

        return result;
    };

    const enrich: GrokClient["enrich"] = async ({
        originalTweet,
        topAuthors,
        topReplyChains,
        filteredOutReplies,
    }) => {
        console.log(
            `  [Grok] Enriching thread data: topAuthors=${topAuthors?.length ?? 0}, ` +
                `topReplyChains=${topReplyChains?.length ?? 0}, filteredOutReplies=${filteredOutReplies?.length ?? 0}`,
        );

        const topAuthorsStr = topAuthors
            ? topAuthors
                  .slice(0, 10)
                  .map(
                      (a) =>
                          `@${a.username} (${a.totalLikes} likes, ${a.replyCount} replies)`,
                  )
                  .join(", ")
            : "N/A";

        const chainsStr = topReplyChains
            ? topReplyChains
                  .slice(0, 5)
                  .map(
                      (c) =>
                          `Chain ${c.rootReplyId}: ${c.messages.map((m) => `@${m.authorUsername}: "${m.text.slice(0, 60)}"`).join(" → ")}`,
                  )
                  .join("\n")
            : "N/A";

        const filteredOutStr =
            filteredOutReplies && filteredOutReplies.length > 0
                ? filteredOutReplies
                      .slice(0, 50)
                      .map(
                          (r) =>
                              `[${r.id}] @${r.authorUsername} (${r.likeCount} likes): "${r.text.slice(0, 100)}"`,
                      )
                      .join("\n")
                : "None";

        const systemPrompt = `You are enriching an X thread analysis with contextual intelligence. Use x_search to gather additional context.

Return ONLY valid JSON:
{
  "relatedThreads": [{ "url": "https://...", "summary": "...", "relevance": "..." }],
  "participantContext": [{ "username": "@name", "contextSummary": "what they've said elsewhere about this topic" }],
  "visualContentInsights": [{ "replyId": "id", "description": "what the image/video shows", "inferredStance": "agree/disagree/neutral" }],
  "semanticHighlights": [{ "replyId": "id", "reason": "why this reply is substantive despite low engagement" }],
  "salvaged": [{ "replyId": "id", "reason": "why this filtered-out reply represents a genuine minority opinion worth re-including" }]
}

For the "salvaged" field: review the filtered-out replies and identify any that represent genuine minority opinions from real (non-bot) users. These are replies that engagement filtering removed but that articulate a unique viewpoint not represented elsewhere.`;

        const userPrompt = `Thread: @${originalTweet.authorUsername}: "${originalTweet.text}"
Topic engagement: ${originalTweet.likeCount} likes, ${originalTweet.replyCount} replies

Top authors: ${topAuthorsStr}

Key reply chains:
${chainsStr}

Filtered-out replies to review for minority opinion salvage:
${filteredOutStr}

Please:
1. Search for related threads on this topic
2. Look up what the top authors have said elsewhere about this topic
3. Identify any filtered-out replies that represent genuine minority opinions worth salvaging`;

        const raw = await callGrok({
            systemPrompt,
            userPrompt,
            useXSearch: true,
        });
        const result = parseJsonResponse(raw, enrichResultSchema, "enrich");

        if (result) {
            console.log(
                `  [Grok] Enrichment: ${result.relatedThreads.length} related threads, ` +
                    `${result.participantContext.length} author profiles, ` +
                    `${result.visualContentInsights.length} visual insights, ` +
                    `${result.semanticHighlights.length} semantic highlights, ` +
                    `${result.salvaged.length} salvaged minority replies`,
            );
            for (const thread of result.relatedThreads) {
                console.log(
                    `  [Grok] Related thread: ${thread.url} — ${thread.summary} (relevance: ${thread.relevance})`,
                );
            }
            for (const ctx of result.participantContext) {
                console.log(
                    `  [Grok] Author context: @${ctx.username} — ${ctx.contextSummary}`,
                );
            }
            for (const salvaged of result.salvaged) {
                console.log(
                    `  [Grok] Salvaged reply: ${salvaged.replyId} — ${salvaged.reason}`,
                );
            }
        } else {
            console.warn("  [Grok] Enrichment returned null result");
        }

        return result;
    };

    return { scout, detectBots, enrich };
}

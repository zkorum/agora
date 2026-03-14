import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { rawThreadDataSchema } from "./fetch.js";
import type { RawThreadData } from "./fetch.js";

/**
 * Convert x-analyzer JSON output to Polis-compatible CSV files for Agora import.
 *
 * Produces 3 files in the same output directory:
 *   {tweetId}-summary.csv   — key-value pairs (no headers)
 *   {tweetId}-comments.csv  — one row per statement
 *   {tweetId}-votes.csv     — vote matrix (agree/disagree/pass per voter per statement)
 *
 * ## Modes
 *
 * **Enriched mode** (when {tweetId}-analysis.json exists):
 *   Uses manually curated statements, opinion groups, and inferred votes.
 *   The analysis file is produced by a human or Claude analyzing the thread data.
 *
 * **Simple mode** (fallback):
 *   Each direct reply becomes a statement. Only self-agree votes are generated.
 *
 * ## CSV Format Reference (Agora import)
 *
 * ### Summary CSV (key-value, no headers)
 *   topic,<string 1-140 chars>
 *   url,<valid URL or empty>
 *   voters,<int >= 0>
 *   voters-in-conv,<int >= 0>
 *   commenters,<int >= 0>
 *   comments,<int >= 0>
 *   groups,<int >= 0>
 *   conversation-description,<string, optional>
 *
 * ### Comments CSV (headers: timestamp,datetime,comment-id,author-id,agrees,disagrees,moderated,comment-body)
 *   timestamp     — unix timestamp (integer)
 *   datetime      — ISO 8601 string
 *   comment-id    — integer (sequential, starting at 0)
 *   author-id     — integer (mapped from Twitter author IDs)
 *   agrees        — integer >= 0
 *   disagrees     — integer >= 0
 *   moderated     — -1 (unmoderated), 0 (rejected), 1 (accepted)
 *   comment-body  — the statement text
 *
 * ### Votes CSV (headers: timestamp,datetime,comment-id,voter-id,vote)
 *   timestamp     — unix timestamp (integer)
 *   datetime      — ISO 8601 string
 *   comment-id    — integer (matches comments CSV)
 *   voter-id      — integer (mapped from Twitter author IDs)
 *   vote          — -1 (disagree), 0 (pass), 1 (agree)
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIR = resolve(__dirname, "..", "output");

// --- Analysis file schema ---

const analysisSchema = z.object({
    tweetId: z.string(),
    topic: z.string(),
    statements: z.array(
        z.object({
            id: z.number(),
            originalReplyId: z.string(),
            authorId: z.string(),
            text: z.string(),
        }),
    ),
    groups: z.array(
        z.object({
            id: z.number(),
            label: z.string(),
            authorIds: z.array(z.string()),
        }),
    ),
    groupVotes: z.array(
        z.object({
            groupId: z.number(),
            statementId: z.number(),
            vote: z.enum(["agree", "disagree", "pass"]),
        }),
    ),
});

type AnalysisFile = z.infer<typeof analysisSchema>;

// --- Utilities ---

function escapeCsvField(value: string): string {
    if (
        value.includes(",") ||
        value.includes('"') ||
        value.includes("\n") ||
        value.includes("\r")
    ) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function voteToNumber(vote: "agree" | "disagree" | "pass"): number {
    if (vote === "agree") return 1;
    if (vote === "disagree") return -1;
    return 0;
}

// --- Enriched mode (with analysis file) ---

function generateEnrichedCsvFiles({
    data,
    analysis,
    tweetId,
    outputDir,
}: {
    data: RawThreadData;
    analysis: AnalysisFile;
    tweetId: string;
    outputDir: string;
}): void {
    console.log(
        `  Enriched mode: ${analysis.statements.length} statements, ${analysis.groups.length} groups`,
    );

    // Build author ID mapping (Twitter string IDs -> sequential integers)
    const authorIdMap = new Map<string, number>();
    let nextAuthorId = 0;
    const getAuthorId = (twitterAuthorId: string): number => {
        const existing = authorIdMap.get(twitterAuthorId);
        if (existing !== undefined) return existing;
        const id = nextAuthorId++;
        authorIdMap.set(twitterAuthorId, id);
        return id;
    };

    // Build group membership lookup: authorId -> groupId
    const authorGroupMap = new Map<string, number>();
    for (const group of analysis.groups) {
        for (const authorId of group.authorIds) {
            authorGroupMap.set(authorId, group.id);
            getAuthorId(authorId);
        }
    }

    // Build group vote lookup: "groupId:statementId" -> vote
    const groupVoteMap = new Map<string, "agree" | "disagree" | "pass">();
    for (const gv of analysis.groupVotes) {
        groupVoteMap.set(`${gv.groupId}:${gv.statementId}`, gv.vote);
    }

    // Build reply lookup for timestamps
    const replyById = new Map<string, { createdAt: string }>();
    for (const r of data.replies) {
        replyById.set(r.id, { createdAt: r.createdAt });
    }

    // Collect all voters (all authors across all groups)
    const allVoterIds = Array.from(authorGroupMap.keys());

    // Build voter timestamp lookup: use their first direct reply's createdAt
    const voterTimestamps = new Map<string, string>();
    const directReplies = data.replies.filter(
        (r) =>
            r.inReplyToTweetId === tweetId ||
            r.inReplyToTweetId === null ||
            r._depth === 0,
    );
    for (const r of directReplies) {
        if (!voterTimestamps.has(r.authorId)) {
            voterTimestamps.set(r.authorId, r.createdAt);
        }
    }

    // Compute agree/disagree counts per statement from the full vote matrix
    const agreeCounts = new Map<number, number>();
    const disagreeCounts = new Map<number, number>();
    for (const stmt of analysis.statements) {
        agreeCounts.set(stmt.id, 0);
        disagreeCounts.set(stmt.id, 0);
    }

    for (const voterId of allVoterIds) {
        const groupId = authorGroupMap.get(voterId);
        if (groupId === undefined) continue;

        for (const stmt of analysis.statements) {
            // Author override: statement author always agrees with their own statement
            const isOwnStatement = stmt.authorId === voterId;
            const vote = isOwnStatement
                ? "agree"
                : (groupVoteMap.get(`${groupId}:${stmt.id}`) ?? "pass");

            if (vote === "agree") {
                agreeCounts.set(stmt.id, (agreeCounts.get(stmt.id) ?? 0) + 1);
            } else if (vote === "disagree") {
                disagreeCounts.set(
                    stmt.id,
                    (disagreeCounts.get(stmt.id) ?? 0) + 1,
                );
            }
        }
    }

    const uniqueStatementAuthors = new Set(
        analysis.statements.map((s) => s.authorId),
    );

    // --- Summary CSV ---
    const topic = analysis.topic;
    const tweetUrl = data.tweetUrl;
    const description = `X Thread Analysis: @${data.originalTweet.authorUsername} — ${analysis.topic}`;

    const summaryRows = [
        `topic,${escapeCsvField(topic)}`,
        `url,${escapeCsvField(tweetUrl)}`,
        `voters,${allVoterIds.length}`,
        `voters-in-conv,${allVoterIds.length}`,
        `commenters,${uniqueStatementAuthors.size}`,
        `comments,${analysis.statements.length}`,
        `groups,${analysis.groups.length}`,
        `conversation-description,${escapeCsvField(description)}`,
    ];

    const summaryPath = resolve(outputDir, `${tweetId}-summary.csv`);
    writeFileSync(summaryPath, summaryRows.join("\n") + "\n");
    console.log(`  Wrote ${summaryPath}`);

    // --- Comments CSV ---
    const commentHeader =
        "timestamp,datetime,comment-id,author-id,agrees,disagrees,moderated,comment-body";
    const commentRows = analysis.statements.map((stmt) => {
        const reply = replyById.get(stmt.originalReplyId);
        const createdAt = reply?.createdAt ?? data.fetchedAt;
        const ts = Math.floor(new Date(createdAt).getTime() / 1000);
        const authorId = getAuthorId(stmt.authorId);
        return [
            ts,
            createdAt,
            stmt.id,
            authorId,
            agreeCounts.get(stmt.id) ?? 0,
            disagreeCounts.get(stmt.id) ?? 0,
            1, // moderated = accepted
            escapeCsvField(stmt.text),
        ].join(",");
    });

    const commentsPath = resolve(outputDir, `${tweetId}-comments.csv`);
    writeFileSync(
        commentsPath,
        commentHeader + "\n" + commentRows.join("\n") + "\n",
    );
    console.log(`  Wrote ${commentsPath} (${commentRows.length} statements)`);

    // --- Votes CSV ---
    const voteHeader = "timestamp,datetime,comment-id,voter-id,vote";
    const voteRows: string[] = [];

    for (const voterId of allVoterIds) {
        const groupId = authorGroupMap.get(voterId);
        if (groupId === undefined) continue;

        const voterIdNum = getAuthorId(voterId);
        const voterTime =
            voterTimestamps.get(voterId) ?? data.fetchedAt;
        const voterTs = Math.floor(new Date(voterTime).getTime() / 1000);

        for (const stmt of analysis.statements) {
            // Author override: statement author always agrees with their own
            const isOwnStatement = stmt.authorId === voterId;
            const vote = isOwnStatement
                ? "agree"
                : (groupVoteMap.get(`${groupId}:${stmt.id}`) ?? "pass");

            voteRows.push(
                [
                    voterTs,
                    voterTime,
                    stmt.id,
                    voterIdNum,
                    voteToNumber(vote),
                ].join(","),
            );
        }
    }

    const votesPath = resolve(outputDir, `${tweetId}-votes.csv`);
    writeFileSync(
        votesPath,
        voteHeader + "\n" + voteRows.join("\n") + "\n",
    );
    console.log(`  Wrote ${votesPath} (${voteRows.length} votes)`);

    // Vote breakdown
    let agreeTotal = 0;
    let disagreeTotal = 0;
    let passTotal = 0;
    for (const row of voteRows) {
        const vote = parseInt(row.split(",")[4]);
        if (vote === 1) agreeTotal++;
        else if (vote === -1) disagreeTotal++;
        else passTotal++;
    }

    console.log(
        `\nCSV export complete (enriched mode):` +
            `\n  ${analysis.statements.length} statements, ${allVoterIds.length} voters` +
            `\n  ${voteRows.length} votes (${agreeTotal} agree, ${disagreeTotal} disagree, ${passTotal} pass)` +
            `\n  ${analysis.groups.length} opinion groups: ${analysis.groups.map((g) => `"${g.label}" (${g.authorIds.length})`).join(", ")}`,
    );
}

// --- Simple mode (no analysis file) ---

function generateSimpleCsvFiles({
    data,
    tweetId,
    outputDir,
}: {
    data: RawThreadData;
    tweetId: string;
    outputDir: string;
}): void {
    // Use filtered data if available, otherwise use raw data
    const filteredPath = resolve(outputDir, `${tweetId}.filtered.json`);
    let replies = data.replies;
    let usingFiltered = false;
    try {
        const filteredRaw = readFileSync(filteredPath, "utf-8");
        const filteredData = rawThreadDataSchema.parse(
            JSON.parse(filteredRaw),
        );
        replies = filteredData.replies;
        usingFiltered = true;
    } catch {
        // No filtered file or parse error — use raw replies
    }

    console.log(
        `  Simple mode (no analysis file): using ${usingFiltered ? "filtered" : "raw"} data, ${replies.length} replies`,
    );

    // Filter to direct replies only (depth 0) — these are the "statements"
    const directReplies = replies.filter(
        (r) =>
            r.inReplyToTweetId === tweetId ||
            r.inReplyToTweetId === null ||
            r._depth === 0,
    );

    console.log(
        `  Direct replies (statements): ${directReplies.length} of ${replies.length} total`,
    );

    // Exclude bot replies if bot detection data is available
    const botIds = new Set(data._botDetection?.botAuthorIds ?? []);
    const filteredDirectReplies = directReplies.filter(
        (r) => !botIds.has(r.authorId),
    );
    if (botIds.size > 0) {
        console.log(
            `  After bot exclusion: ${filteredDirectReplies.length} statements (${directReplies.length - filteredDirectReplies.length} bots removed)`,
        );
    }

    // Build author ID mapping (Twitter string IDs -> sequential integers)
    const authorIdMap = new Map<string, number>();
    let nextAuthorId = 0;
    const getAuthorId = (twitterAuthorId: string): number => {
        const existing = authorIdMap.get(twitterAuthorId);
        if (existing !== undefined) return existing;
        const id = nextAuthorId++;
        authorIdMap.set(twitterAuthorId, id);
        return id;
    };

    for (const reply of filteredDirectReplies) {
        getAuthorId(reply.authorId);
    }

    const uniqueAuthors = new Set(
        filteredDirectReplies.map((r) => r.authorId),
    );

    // --- Summary CSV ---
    const topic = data.tweetUrl;
    const tweetUrl = data.tweetUrl;
    const description = `X Thread Analysis: @${data.originalTweet.authorUsername}`;

    const summaryRows = [
        `topic,${escapeCsvField(topic)}`,
        `url,${escapeCsvField(tweetUrl)}`,
        `voters,${uniqueAuthors.size}`,
        `voters-in-conv,${uniqueAuthors.size}`,
        `commenters,${uniqueAuthors.size}`,
        `comments,${filteredDirectReplies.length}`,
        `groups,0`,
        `conversation-description,${escapeCsvField(description)}`,
    ];

    const summaryPath = resolve(outputDir, `${tweetId}-summary.csv`);
    writeFileSync(summaryPath, summaryRows.join("\n") + "\n");
    console.log(`  Wrote ${summaryPath}`);

    // --- Comments CSV ---
    const commentHeader =
        "timestamp,datetime,comment-id,author-id,agrees,disagrees,moderated,comment-body";
    const commentRows = filteredDirectReplies.map((reply, idx) => {
        const ts = Math.floor(new Date(reply.createdAt).getTime() / 1000);
        const authorId = getAuthorId(reply.authorId);
        return [
            ts,
            reply.createdAt,
            idx,
            authorId,
            reply.likeCount,
            0, // no dislikes on X
            1, // moderated = accepted
            escapeCsvField(reply.text),
        ].join(",");
    });

    const commentsPath = resolve(outputDir, `${tweetId}-comments.csv`);
    writeFileSync(
        commentsPath,
        commentHeader + "\n" + commentRows.join("\n") + "\n",
    );
    console.log(`  Wrote ${commentsPath} (${commentRows.length} comments)`);

    // --- Votes CSV ---
    const voteHeader = "timestamp,datetime,comment-id,voter-id,vote";
    const voteRows: string[] = [];

    for (
        let commentIdx = 0;
        commentIdx < filteredDirectReplies.length;
        commentIdx++
    ) {
        const reply = filteredDirectReplies[commentIdx];
        const ts = Math.floor(new Date(reply.createdAt).getTime() / 1000);
        const voterId = getAuthorId(reply.authorId);

        // Author implicitly agrees with their own statement
        voteRows.push(
            [ts, reply.createdAt, commentIdx, voterId, 1].join(","),
        );
    }

    const votesPath = resolve(outputDir, `${tweetId}-votes.csv`);
    writeFileSync(
        votesPath,
        voteHeader + "\n" + voteRows.join("\n") + "\n",
    );
    console.log(`  Wrote ${votesPath} (${voteRows.length} votes)`);

    console.log(
        `\nCSV export complete (simple mode): ${filteredDirectReplies.length} statements, ${uniqueAuthors.size} authors, ${voteRows.length} votes`,
    );
}

// --- Main ---

function printUsage(): void {
    console.log(
        "Convert x-analyzer JSON to Polis CSV files for Agora import.\n",
    );
    console.log("Usage:");
    console.log("  pnpm to-csv <tweet-id>");
    console.log(
        "  pnpm to-csv              (converts most recent JSON)\n",
    );
    console.log(
        "Reads output/{tweetId}.json and optionally {tweetId}-analysis.json",
    );
    console.log(
        "Produces: {tweetId}-summary.csv, {tweetId}-comments.csv, {tweetId}-votes.csv",
    );
}

function main(): void {
    const args = process.argv.slice(2);

    if (args.includes("--help") || args.includes("-h")) {
        printUsage();
        process.exit(0);
    }

    const outputDir = DEFAULT_OUTPUT_DIR;
    let tweetId = args[0];

    if (!tweetId) {
        // Find the most recent .json file (not .filtered, not .bak, not -analysis)
        const files = readdirSync(outputDir)
            .filter(
                (f) =>
                    f.endsWith(".json") &&
                    !f.includes(".filtered") &&
                    !f.includes(".bak") &&
                    !f.includes(".tmp") &&
                    !f.includes("-analysis"),
            )
            .sort()
            .reverse();
        if (files.length === 0) {
            console.error(
                "No JSON files found in output/. Run x-fetch first.",
            );
            process.exit(1);
        }
        tweetId = files[0].replace(".json", "");
        console.log(`  Auto-selected: ${tweetId}`);
    }

    const jsonPath = resolve(outputDir, `${tweetId}.json`);
    console.log(`  Reading ${jsonPath}...`);

    let raw: string;
    try {
        raw = readFileSync(jsonPath, "utf-8");
    } catch {
        console.error(`Error: ${jsonPath} not found. Run x-fetch first.`);
        process.exit(1);
    }

    const data = rawThreadDataSchema.parse(JSON.parse(raw));
    console.log(
        `  Loaded: ${data.replies.length} replies, ${data.quotes?.length ?? 0} quotes`,
    );

    // Check for analysis file (enriched mode)
    const analysisPath = resolve(outputDir, `${tweetId}-analysis.json`);
    if (existsSync(analysisPath)) {
        console.log(`  Found analysis file: ${analysisPath}`);
        const analysisRaw = readFileSync(analysisPath, "utf-8");
        const analysis = analysisSchema.parse(JSON.parse(analysisRaw));
        generateEnrichedCsvFiles({ data, analysis, tweetId, outputDir });
    } else {
        generateSimpleCsvFiles({ data, tweetId, outputDir });
    }
}

main();

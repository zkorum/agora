import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ImportPolisResults } from "@/shared/types/polis.js";
import {
    parseSummaryCsv,
    parseCommentsCsv,
    parseVotesCsv,
} from "./polisCsvParser.js";
import { CSV_UPLOAD_FIELD_NAMES } from "@/shared-app-api/csvUpload.js";
import * as importService from "./import.js";
import type { VoteBuffer } from "./voteBuffer.js";
import type { ValidateCsvResponse } from "@/shared/types/dto.js";
import type { EventSlug } from "@/shared/types/zod.js";
import { z } from "zod";

/**
 * Zod schema for CSV file contents
 * Requires all three files with string content, rejects extra fields
 * Use .safeParse() or .parse() to convert unknown input to typed CsvFiles
 */
export const zodCsvFiles = z
    .object({
        [CSV_UPLOAD_FIELD_NAMES.SUMMARY_FILE]: z.string(),
        [CSV_UPLOAD_FIELD_NAMES.COMMENTS_FILE]: z.string(),
        [CSV_UPLOAD_FIELD_NAMES.VOTES_FILE]: z.string(),
    })
    .strict();

export type CsvFiles = z.infer<typeof zodCsvFiles>;

interface ProcessCsvImportProps {
    db: PostgresJsDatabase;
    voteBuffer: VoteBuffer;
    files: CsvFiles;
    proof: string;
    didWrite: string;
    authorId: string;
    postAsOrganization: string | undefined;
    indexConversationAt?: string;
    isLoginRequired: boolean;
    isIndexed: boolean;
    requiresEventTicket?: EventSlug;
}

/**
 * Process CSV files to import a Polis conversation
 * Parses CSV content, transforms to ImportPolisResults format,
 * and uses existing import logic
 */
export async function processCsvImport(props: ProcessCsvImportProps) {
    // Files are already parsed and validated via zodCsvFiles
    const summaryContent = props.files[CSV_UPLOAD_FIELD_NAMES.SUMMARY_FILE];
    const commentsContent = props.files[CSV_UPLOAD_FIELD_NAMES.COMMENTS_FILE];
    const votesContent = props.files[CSV_UPLOAD_FIELD_NAMES.VOTES_FILE];

    // Parse and validate all CSV files
    const summary = await parseSummaryCsv(summaryContent);
    const comments = await parseCommentsCsv(commentsContent);
    const votes = await parseVotesCsv(votesContent);

    // 4. Deduplicate votes by (voter-id, comment-id), keeping the most recent vote by timestamp
    // This handles cases where users changed their vote over time in the original Polis conversation
    // Sort by timestamp first to ensure chronological order
    const sortedVotes = votes.sort((a, b) => a.timestamp - b.timestamp);
    const voteMap = new Map<string, (typeof votes)[0]>();
    for (const vote of sortedVotes) {
        const key = `${String(vote["voter-id"])}_${String(vote["comment-id"])}`;
        voteMap.set(key, vote); // Later votes (by timestamp) overwrite earlier ones
    }
    const deduplicatedVotes = Array.from(voteMap.values());

    // 5. Transform to ImportPolisResults format
    const importedPolisConversation: ImportPolisResults = {
        report_id: null,
        conversation_id: null, // Will be generated
        conversation_data: {
            topic: summary.topic,
            description: summary["conversation-description"] ?? "",
            ownername: null, // CSV imports don't have original author info
            created: null, // CSV imports don't have original creation date
            participant_count: summary.voters,
            link_url: summary.url ?? null,
            conversation_id: null,
            auth_needed_to_vote: null,
            auth_needed_to_write: null,
            auth_opt_allow_3rdparty: null,
            auth_opt_fb: null,
            auth_opt_tw: null,
            bgcolor: null,
            context: null,
            course_id: null,
            dataset_explanation: null,
            email_domain: null,
            help_bgcolor: null,
            help_color: null,
            help_type: null,
            importance_enabled: null,
            is_active: null,
            is_anon: null,
            is_curated: null,
            is_data_open: null,
            is_draft: null,
            is_mod: null,
            is_owner: null,
            is_public: null,
            modified: null,
            need_suzinvite: null,
            org_id: null,
            owner: null,
            owner_sees_participation_stats: null,
            parent_url: null,
            prioritize_seed: null,
            profanity_filter: null,
            site_id: null,
            socialbtn_type: null,
            spam_filter: null,
            strict_moderation: null,
            style_btn: null,
            subscribe_type: null,
            translations: null,
            upvotes: null,
            use_xid_whitelist: null,
            vis_type: null,
            write_hint_type: null,
            write_type: null,
        },
        comments_data: comments.map((c) => ({
            statement_id: c["comment-id"],
            participant_id: c["author-id"],
            txt: c["comment-body"],
            moderated: c.moderated,
            active: true,
            agree_count: c.agrees,
            disagree_count: c.disagrees,
            pass_count: null,
            conversation_id: null,
            created: c.datetime,
            datetime: c.datetime,
            count: null,
            is_meta: null,
            is_seed: null,
            lang: null,
            quote_src_url: null,
            tweet_id: null,
            velocity: null,
        })),
        votes_data: deduplicatedVotes.map((v) => ({
            statement_id: v["comment-id"],
            participant_id: v["voter-id"],
            vote: v.vote,
            conversation_id: null,
            datetime: v.datetime,
            modified: null,
            weight_x_32767: null,
        })),
    };

    // 6. Use existing import logic with CSV source
    return await importService.loadImportedPolisConversation({
        db: props.db,
        voteBuffer: props.voteBuffer,
        importedPolisConversation,
        importConfig: {
            method: "csv",
        },
        proof: props.proof,
        didWrite: props.didWrite,
        authorId: props.authorId,
        postAsOrganization: props.postAsOrganization,
        indexConversationAt: props.indexConversationAt,
        isLoginRequired: props.isLoginRequired,
        isIndexed: props.isIndexed,
        requiresEventTicket: props.requiresEventTicket,
    });
}

/**
 * Validate individual CSV files without importing
 * Accepts 1, 2, or all 3 CSV files and validates each independently
 * Returns per-file validation results with helpful error messages
 */
export async function validateIndividualCsvFiles({
    files,
}: {
    files: Partial<Record<string, string>>;
}): Promise<ValidateCsvResponse> {
    const result: ValidateCsvResponse = {};

    // Validate summary file if provided
    const summaryContent = files[CSV_UPLOAD_FIELD_NAMES.SUMMARY_FILE];
    if (summaryContent !== undefined) {
        try {
            await parseSummaryCsv(summaryContent);
            result.summaryFile = {
                isValid: true,
            };
        } catch (error) {
            result.summaryFile = {
                isValid: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to parse summary file",
            };
        }
    }

    // Validate comments file if provided
    const commentsContent = files[CSV_UPLOAD_FIELD_NAMES.COMMENTS_FILE];
    if (commentsContent !== undefined) {
        try {
            await parseCommentsCsv(commentsContent);
            result.commentsFile = {
                isValid: true,
            };
        } catch (error) {
            result.commentsFile = {
                isValid: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to parse comments file",
            };
        }
    }

    // Validate votes file if provided
    const votesContent = files[CSV_UPLOAD_FIELD_NAMES.VOTES_FILE];
    if (votesContent !== undefined) {
        try {
            await parseVotesCsv(votesContent);
            result.votesFile = {
                isValid: true,
            };
        } catch (error) {
            result.votesFile = {
                isValid: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to parse votes file",
            };
        }
    }

    return result;
}

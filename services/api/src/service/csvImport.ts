import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ImportPolisResults } from "@/shared/types/polis.js";
import {
    parseSummaryCsv,
    parseCommentsCsv,
    parseVotesCsv,
} from "./polisCsvParser.js";
import {
    validateCsvFieldNames,
    CSV_UPLOAD_FIELD_NAMES,
} from "@/shared-app-api/csvUpload.js";
import * as importService from "./import.js";
import type { VoteBuffer } from "./voteBuffer.js";

interface ProcessCsvImportProps {
    db: PostgresJsDatabase;
    voteBuffer: VoteBuffer;
    files: Record<string, string>; // fieldname -> content
    proof: string;
    didWrite: string;
    authorId: string;
    postAsOrganization: string | undefined;
    indexConversationAt?: string;
    isLoginRequired: boolean;
    isIndexed: boolean;
}

/**
 * Process CSV files to import a Polis conversation
 * Validates field names, parses CSV content, transforms to ImportPolisResults format,
 * and uses existing import logic
 */
export async function processCsvImport(props: ProcessCsvImportProps) {
    // 1. Validate field names
    const fieldNames = Object.keys(props.files);
    const validation = validateCsvFieldNames(fieldNames);

    if (!validation.isValid) {
        const errors: string[] = [];
        if (validation.missingFields.length > 0) {
            errors.push(
                `Missing required fields: ${validation.missingFields.join(", ")}`,
            );
        }
        if (validation.unexpectedFields.length > 0) {
            errors.push(
                `Unexpected fields: ${validation.unexpectedFields.join(", ")}`,
            );
        }
        throw new Error(`CSV field validation failed: ${errors.join("; ")}`);
    }

    // 2. Extract file contents using type-safe field names
    const summaryContent = props.files[CSV_UPLOAD_FIELD_NAMES.SUMMARY_FILE];
    const commentsContent = props.files[CSV_UPLOAD_FIELD_NAMES.COMMENTS_FILE];
    const votesContent = props.files[CSV_UPLOAD_FIELD_NAMES.VOTES_FILE];

    // 3. Parse and validate all CSV files
    const summary = await parseSummaryCsv(summaryContent);
    const comments = await parseCommentsCsv(commentsContent);
    const votes = await parseVotesCsv(votesContent);

    // 4. Deduplicate votes by (voter-id, comment-id), keeping the last vote
    // This handles cases where users changed their vote over time in the original Polis conversation
    const voteMap = new Map<string, (typeof votes)[0]>();
    for (const vote of votes) {
        const key = `${String(vote["voter-id"])}_${String(vote["comment-id"])}`;
        voteMap.set(key, vote); // Later votes overwrite earlier ones
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
    });
}

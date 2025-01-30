import { log } from "@/app.js";
import type { VotingAction } from "@/shared/types/zod.js";
import type { AxiosInstance } from "axios";
import { setTimeout } from "timers/promises";

interface PolisCreateUserProps {
    userId: string;
    axiosPolis: AxiosInstance;
    polisUserPassword: string;
    polisUserEmailLocalPart: string;
    polisUserEmailDomain: string;
}

interface PolisCreateConversationProps {
    userId: string;
    conversationSlugId: string;
    axiosPolis: AxiosInstance;
}

interface PolisCreateOpinionProps {
    userId: string;
    conversationSlugId: string;
    opinionSlugId: string;
    axiosPolis: AxiosInstance;
}

interface PolisCreateOrUpdateVoteProps {
    userId: string;
    conversationSlugId: string;
    opinionSlugId: string;
    axiosPolis: AxiosInstance;
    votingAction: VotingAction;
}

interface PolisGetMathResultsProps {
    axiosPolis: AxiosInstance;
    conversationSlugId: string;
}

interface PCA {
    comps: number[][];
    center: number[];
    "comment-extremity": number[];
    "comment-projection": number[][];
}

interface RepnessEntry {
    tid: number;
    "p-test": number;
    repness: number;
    "n-trials": number;
    "n-success": number;
    "p-success": number;
    "repful-for": "agree" | "disagree";
    "repness-test": number;
}

type Repness = Record<string, RepnessEntry[]>;

interface ConsensusEntry {
    tid: number;
    "p-test": number;
    "n-trials": number;
    "n-success": number;
    "p-success": number;
}

interface Consensus {
    agree: ConsensusEntry[];
    disagree: ConsensusEntry[];
}

interface VotesBase {
    A: number[];
    D: number[];
    S: number[];
}

type VotesBaseMap = Record<string, VotesBase>;

type GroupVotesMap = Record<
    string,
    {
        votes: Record<
            string,
            {
                A: number;
                D: number;
                S: number;
            }
        >;
        "n-members": number;
        id: number;
    }
>;

interface BaseClusters {
    x: number[];
    y: number[];
    id: number[];
    count: number[];
    members: number[][];
}

interface GroupCluster {
    id: number;
    center: number[];
    members: number[];
}

type UserVoteCounts = Record<string, number>;
type CommentPriorities = Record<string, number>;
type GroupAwareConsensus = Record<string, number>;

interface MathResults {
    n: number;
    pca: PCA;
    tids: number[];
    "mod-in": unknown[];
    "n-cmts": number;
    "in-conv": number[];
    "mod-out": unknown[];
    repness: Repness;
    consensus: Consensus;
    "meta-tids": number[];
    "votes-base": VotesBaseMap;
    "group-votes": GroupVotesMap;
    "base-clusters": BaseClusters;
    "group-clusters": GroupCluster[];
    lastModTimestamp: number | null;
    "user-vote-counts": UserVoteCounts;
    lastVoteTimestamp: number;
    "comment-priorities": CommentPriorities;
    "group-aware-consensus": GroupAwareConsensus;
    math_tick: number;
}

interface PolisMathAndMetadata {
    pca: MathResults;
    pidToHnames: Record<number, string>;
    tidToTxts: Record<number, string>;
}

export async function createUser({
    axiosPolis,
    polisUserEmailLocalPart,
    polisUserEmailDomain,
    polisUserPassword,
    userId,
}: PolisCreateUserProps) {
    log.info("Registering a new user in Polis...");
    const postCreateUserUrl = "/api/v3/auth/new";
    const body = {
        hname: userId,
        email: `${polisUserEmailLocalPart}admin+${userId}@${polisUserEmailDomain}`,
        password: polisUserPassword,
        gatekeeperTosPrivacy: true,
    };
    await axiosPolis.post(postCreateUserUrl, body, {
        headers: {
            "Content-Type": "application/json",
        },
    });
}

export async function createConversation({
    axiosPolis,
    userId,
    conversationSlugId,
}: PolisCreateConversationProps) {
    log.info("Creating a new conversation in Polis...");
    const postCreateConversationUrl = "/api/v3/conversations";
    const body = {
        is_draft: true,
        is_active: true,
        ownername: userId,
        is_mod: true,
        is_owner: true,

        topic: "dummy",
        description: "dummy",
        conversation_id: conversationSlugId,

        is_anon: false,
        is_public: true,
        is_data_open: true,
        profanity_filter: false,
        spam_filter: false,
        strict_moderation: false,
        prioritize_seed: false,
        lti_users_only: false,
        owner_sees_participation_stats: true,
        auth_needed_to_vote: false,
        auth_needed_to_write: false,
        auth_opt_fb: false,
        auth_opt_tw: false,
        auth_opt_allow_3rdparty: true,
        auth_opt_fb_computed: false,
        auth_opt_tw_computed: false,
    };
    await axiosPolis.post(postCreateConversationUrl, body, {
        headers: {
            "Content-Type": "application/json",
        },
    });
}

export async function createOpinion({
    axiosPolis,
    userId,
    conversationSlugId,
    opinionSlugId,
}: PolisCreateOpinionProps) {
    log.info("Creating a new opinion in Polis...");
    const postCreateOpinionUrl = "/api/v3/comments";
    const body = {
        txt: opinionSlugId,
        pid: "mypid",
        ownername: userId,
        conversation_id: conversationSlugId,
        vote: -1, // make opinion author automatically agrees on its own opinion. Yes -1 is agree in stock Polis...
        is_meta: false,
    };
    await axiosPolis.post(postCreateOpinionUrl, body, {
        headers: {
            "Content-Type": "application/json",
        },
    });
}

export async function createOrUpdateVote({
    axiosPolis,
    userId,
    conversationSlugId,
    opinionSlugId,
    votingAction,
}: PolisCreateOrUpdateVoteProps) {
    log.info("Creating a new vote in Polis...");
    const postCreateOrUpdateVote = "/api/v3/votes";
    const polisVote =
        votingAction === "agree" ? -1 : votingAction === "disagree" ? 1 : 0; // Yes, -1 is agree in stock Polis...
    const body = {
        lang: "en",
        weight: 0,
        vote: polisVote,
        ownername: userId,
        txt: opinionSlugId,
        pid: "mypid",
        conversation_id: conversationSlugId,
        agid: 1,
    };
    await axiosPolis.post(postCreateOrUpdateVote, body, {
        headers: {
            "Content-Type": "application/json",
        },
    });
}

async function getMathResults({
    axiosPolis,
    conversationSlugId,
}: PolisGetMathResultsProps): Promise<PolisMathAndMetadata> {
    const getMathResultsRequest = `/api/v3/participationInit?conversation_id=${conversationSlugId}`;
    const response = await axiosPolis.get<PolisMathAndMetadata>(
        getMathResultsRequest,
    );
    return response.data;
}

interface DelayedPolisGetAndUpdateMathProps {
    conversationSlugId: string;
    axiosPolis: AxiosInstance;
    polisDelayToFetch: number;
}

export async function delayedPolisGetAndUpdateMath({
    conversationSlugId,
    axiosPolis,
    polisDelayToFetch,
}: DelayedPolisGetAndUpdateMathProps) {
    await setTimeout(polisDelayToFetch);
    const polisMathResults = await getMathResults({
        axiosPolis,
        conversationSlugId,
    });
    console.log(polisMathResults);
    // TODO: insert to update results in database
}

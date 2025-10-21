interface GetConversationEngagementScoreProps {
    createdAt: Date;
    lastReactedAt: Date;
    opinionCount: number;
    voteCount: number;
    participantCount: number;
}

export function getConversationEngagementScore({
    createdAt,
    lastReactedAt,
    opinionCount,
    voteCount,
    participantCount,
}: GetConversationEngagementScoreProps) {
    // Scores place weights between 0.01 - 1.0 the higher value the higher impact
    const weightCreatedAt = 0.4; // Increased from 0.2 - rewards newer conversations
    const weightLastReactedAt = 0.3; // New - rewards recent activity
    const weightOpinionCount = 0.6;
    const weightVoteCount = 0.5; // New - rewards vote engagement
    const weightParticipantCount = 0.4;

    const now = new Date();
    const createdAtAgeInDays =
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const lastReactedAtAgeInDays =
        (now.getTime() - lastReactedAt.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential functions for each variable
    // createdAt: penalizes old conversations (even if they get new comments)
    const scoreCreatedAt = Math.exp(-weightCreatedAt * createdAtAgeInDays);
    // lastReactedAt: rewards recent activity
    const scoreLastReactedAt = Math.exp(-weightLastReactedAt * lastReactedAtAgeInDays);
    const scoreOpinionCount = Math.exp(weightOpinionCount * opinionCount);
    const scoreVoteCount = Math.exp(weightVoteCount * voteCount);
    const scoreParticipantCount = Math.exp(
        weightParticipantCount * participantCount,
    );

    return scoreCreatedAt + scoreLastReactedAt + scoreOpinionCount + scoreVoteCount + scoreParticipantCount;
}

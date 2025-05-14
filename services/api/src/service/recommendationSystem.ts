interface GetConversationEngagementScoreProps {
    createdAt: Date;
    opinionCount: number;
    participantCount: number;
}

export function getConversationEngagementScore({
    createdAt,
    opinionCount,
    participantCount,
}: GetConversationEngagementScoreProps) {
    // Scores place weights between 0.01 - 1.0 the higher value the higher impact
    const weightCreatedAt = 0.2;
    const weightOpinionCount = 0.6;
    const weightParticipantCount = 0.4;

    const now = new Date();
    const ageInDays =
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential functions for each variable
    const scoreCreatedAt = Math.exp(-weightCreatedAt * ageInDays);
    const scoreOpinionCount = Math.exp(weightOpinionCount * opinionCount);
    const scoreParticipantCount = Math.exp(
        weightParticipantCount * participantCount,
    );

    return scoreCreatedAt + scoreOpinionCount + scoreParticipantCount;
}

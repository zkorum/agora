export const surveyQuestionHeaders = [
    "question-id",
    "question-slug-id",
    "question-order",
    "question-type",
    "question-text",
    "is-required",
    "question-semantic-version",
] as const;

export const surveyQuestionOptionHeaders = [
    "option-id",
    "option-slug-id",
    "question-id",
    "option-order",
    "option-text",
] as const;

export const surveyAggregateHeaders = [
    "scope",
    "cluster-id",
    "cluster-label",
    "question-id",
    "option-id",
    "count",
    "percentage",
    "is-suppressed",
    "suppression-reason",
] as const;

export const surveyParticipantResponseHeaders = [
    "participant-id",
    "response-status",
    "is-currently-counted",
    "created-at",
    "updated-at",
    "completed-at",
    "question-id",
    "answer-semantic-version",
    "option-id",
    "answer-text-html",
    "answer-text-plain",
] as const;

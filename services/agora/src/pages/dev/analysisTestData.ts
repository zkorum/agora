import type {
  AnalysisCheckpoint,
  AnalysisFrameKey,
  AnalysisViewState,
  SurveyResultsAggregatedResponse,
} from "src/shared/types/dto";
import type {
  AnalysisOpinionItem,
  AnalysisView,
  ClusterStats,
  PolisClusters,
  PolisKey,
  SurveyAggregateRow,
  SurveyAggregateSuppressionReason,
} from "src/shared/types/zod";
import type { AnalysisData } from "src/utils/api/comment/comment";

export const longAiLabels = [
  "Écologistes progressistes pour la transition énergétique",
  "Conservateurs fiscaux attachés aux traditions institutionnelles",
  "Réformistes sociaux-démocrates pour un État-providence renforcé",
  "Libertariens technophiles pour la décentralisation numérique",
  "Pragmatiques communautaires axés sur les compromis locaux",
  "Militants pour la décentralisation radicale des institutions",
];

export const shortAiLabels = [
  "Green Transition",
  "Fiscal Conservatives",
  "Social Democrats",
  "Digital Libertarians",
  "Local Pragmatists",
  "Radical Decentralists",
];

export const aiSummaries = [
  "Ce groupe soutient des politiques environnementales progressistes et une transition énergétique rapide vers les énergies renouvelables.",
  "Ce groupe favorise la prudence fiscale et le respect des traditions institutionnelles établies.",
  "Ce groupe promeut des réformes sociales-démocrates avec un État-providence renforcé et des services publics de qualité.",
  "Ce groupe valorise la liberté individuelle et les solutions technologiques décentralisées pour la gouvernance.",
  "Ce groupe privilégie le pragmatisme communautaire et les compromis locaux basés sur l'expérience du terrain.",
  "Ce groupe milite pour une décentralisation radicale des institutions existantes et un transfert massif de pouvoir vers les citoyens.",
];

export const mockStatements = [
  "Établir un budget participatif annuel représentant au moins 10% du budget communal.",
  "Pour développer la participation citoyenne, il est essentiel de créer des assemblées de quartier régulières.",
  "La transparence totale des décisions du conseil municipal est une condition préalable à toute forme de gouvernance participative.",
  "Il faudrait mettre en place une plateforme numérique de consultation citoyenne accessible à tous.",
  "Les associations locales devraient avoir un rôle consultatif officiel dans les décisions d'urbanisme.",
  "Créer un observatoire citoyen indépendant pour évaluer l'impact des politiques publiques.",
  "Organiser des forums citoyens trimestriels sur les grands projets d'infrastructure.",
  "Instaurer un droit d'initiative citoyenne permettant de proposer des délibérations au conseil municipal.",
  "Développer des programmes d'éducation civique dans les écoles pour former les futurs citoyens.",
  "Mettre en place un système de pétition en ligne avec obligation de réponse du conseil municipal.",
];

export const polisKeys: PolisKey[] = ["0", "1", "2", "3", "4", "5"];

const fixedAnalysisViews = [
  "2",
  "3",
  "4",
  "5",
  "6",
] satisfies AnalysisView[];

export const surveySuppressionThreshold = 5;

function getStatement({ index }: { index: number }): string {
  return (
    mockStatements[index % mockStatements.length] ?? "Dev analysis statement"
  );
}

function buildMockClusterStats({
  clusterCount,
}: {
  clusterCount: number;
}): ClusterStats[] {
  return polisKeys.slice(0, clusterCount).map((key) => {
    const index = Number(key);
    return {
      key,
      isAuthorInCluster: key === "0",
      numUsers: 24 + index * 7,
      numAgrees: 12 + index,
      numDisagrees: 5 + index,
      numPasses: 3,
    };
  });
}

function buildMockAnalysisOpinion({
  index,
  clusterCount,
  suffix = "",
}: {
  index: number;
  clusterCount: number;
  suffix?: string;
}): AnalysisOpinionItem {
  const participantCount = 52 + index * 3;
  const suffixText = suffix === "" ? "" : ` (${suffix})`;
  return {
    opinionSlugId: `mock-op-${suffix}-${String(index)}`,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    opinion: `${getStatement({ index })}${suffixText}`,
    sourceLanguageCode: null,
    displayContent: {
      sourceVersion: "00000000-0000-4000-8000-000000000001",
      status: "available",
      mode: "original",
      content: { content: `${getStatement({ index })}${suffixText}` },
      translationControl: null,
    },
    numParticipants: participantCount,
    numAgrees: Math.floor(participantCount * 0.62),
    numDisagrees: Math.floor(participantCount * 0.25),
    numPasses: Math.floor(participantCount * 0.13),
    username: `dev-user-${String(index + 1)}`,
    moderation: { status: "unmoderated" },
    isSeed: false,
    clustersStats: buildMockClusterStats({ clusterCount }),
    groupAwareConsensusAgree: 0.6 + index * 0.01,
    groupAwareConsensusDisagree: 0.58 + index * 0.01,
    divisiveScore: 1.2 + index * 0.2,
  };
}

function buildMockPolisClusters({
  clusterCount,
  aiLabelMode,
  scaleMultiplier = 1,
  representativeCount = 5,
}: {
  clusterCount: number;
  aiLabelMode: AiLabelMode;
  scaleMultiplier?: number;
  representativeCount?: number;
}): Partial<PolisClusters> {
  const clusters: Partial<PolisClusters> = {};
  const aiLabels =
    aiLabelMode === "long"
      ? longAiLabels
      : aiLabelMode === "short"
        ? shortAiLabels
        : undefined;
  const baseSizes = [145, 112, 87, 63, 48, 35].map(
    (size) => size * scaleMultiplier
  );

  for (const key of polisKeys.slice(0, clusterCount)) {
    const index = Number(key);
    const representative = Array.from(
      { length: representativeCount },
      (_, offset) =>
        buildMockAnalysisOpinion({
          index: index * representativeCount + offset,
          clusterCount,
          suffix: `${String(clusterCount)} groups`,
        })
    );

    clusters[key] = {
      key,
      numUsers: baseSizes[index] ?? 5,
      aiLabel: aiLabels?.[index],
      aiSummary: aiLabels === undefined ? undefined : aiSummaries[index],
      isUserInCluster: key === "0",
      representative,
    };
  }

  return clusters;
}

function getMockAnalysisResolvedGroupCount(view: AnalysisView): number {
  switch (view) {
    case "2":
      return 2;
    case "3":
      return 3;
    case "4":
      return 4;
    case "5":
      return 5;
    case "6":
      return 6;
    case "facilitator_preference":
      return 3;
    case "auto":
      return 4;
  }
}

function getMockAnalysisResolvedBy(
  view: AnalysisView
): AnalysisViewState["resolvedBy"] {
  switch (view) {
    case "facilitator_preference":
      return "facilitator_preference";
    case "auto":
      return "auto";
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
      return "fixed_count";
  }
}

function buildMockAnalysisFrameKey(groupCount: number): AnalysisFrameKey {
  return {
    conversationViewSnapshotId: 100,
    analysisSnapshotId: 10,
    candidateId: groupCount,
  };
}

function buildMockAnalysisViewState({
  view,
}: {
  view: AnalysisView;
}): AnalysisViewState {
  const fixedOptions: AnalysisViewState["options"] = fixedAnalysisViews.map(
    (fixedView) => {
      const groupCount = Number(fixedView);
      return {
        view: fixedView,
        status: groupCount === 4 ? "recommended" : "available",
        candidate: {
          candidateId: groupCount,
          groupCount,
          assessment: {
            selectionScore: groupCount === 4 ? 0.91 : 0.58 + groupCount * 0.04,
            silhouetteScore: 0.18 + groupCount * 0.05,
            balanceScore: 0.5 + groupCount * 0.06,
          },
        },
      };
    }
  );

  return {
    requestedView: view,
    canonicalView: view,
    resolvedGroupCount: getMockAnalysisResolvedGroupCount(view),
    resolvedCandidateId: getMockAnalysisResolvedGroupCount(view),
    resolvedBy: getMockAnalysisResolvedBy(view),
    variantsEnabled: true,
    options: [
      {
        view: "facilitator_preference",
        resolvesToView: "3",
        status: "available",
        candidate: {
          candidateId: 3,
          groupCount: 3,
          assessment: {
            selectionScore: 0.72,
            silhouetteScore: 0.34,
            balanceScore: 0.66,
          },
        },
      },
      {
        view: "auto",
        resolvesToView: "4",
        status: "recommended",
        candidate: {
          candidateId: 4,
          groupCount: 4,
          assessment: {
            selectionScore: 0.91,
            silhouetteScore: 0.48,
            balanceScore: 0.82,
          },
        },
      },
      ...fixedOptions,
    ],
  };
}

export function buildMockAnalysisData({
  view,
}: {
  view: AnalysisView;
}): AnalysisData {
  const clusterCount = getMockAnalysisResolvedGroupCount(view);
  const frameKey = buildMockAnalysisFrameKey(clusterCount);
  const conversationViewSnapshot = {
    conversationViewSnapshotId: frameKey.conversationViewSnapshotId,
    analysisSnapshotId: frameKey.analysisSnapshotId,
    opinionCount: 128,
    voteCount: 4230,
    participantCount: 271,
    totalOpinionCount: 301,
    totalVoteCount: 11000,
    totalParticipantCount: 271,
    moderatedOpinionCount: 0,
    hiddenOpinionCount: 0,
    isClosed: false,
  };
  const agreementItems = Array.from({ length: 4 }, (_, index) =>
    buildMockAnalysisOpinion({
      index,
      clusterCount,
      suffix: `${String(clusterCount)} groups agree`,
    })
  );
  const disagreementItems = Array.from({ length: 4 }, (_, index) =>
    buildMockAnalysisOpinion({
      index: index + 4,
      clusterCount,
      suffix: `${String(clusterCount)} groups disagree`,
    })
  );
  const divisiveItems = Array.from({ length: 3 }, (_, index) =>
    buildMockAnalysisOpinion({
      index: index + 8,
      clusterCount,
      suffix: `${String(clusterCount)} groups divisive`,
    })
  );
  const analysisViewState = buildMockAnalysisViewState({ view });

  return {
    consensusAgree: agreementItems,
    consensusDisagree: disagreementItems,
    controversial: divisiveItems,
    polisClusters: buildMockPolisClusters({
      clusterCount,
      aiLabelMode: "short",
      representativeCount: 1,
    }),
    frameKey,
    manifest: {
      frameKey,
      conversationViewSnapshot,
      counters: conversationViewSnapshot,
      analysisViewResolution: analysisViewState,
      aiLabelsExpected: true,
      hasVotedOnAllAvailableOpinions: false,
    },
    conversationViewSnapshotId: frameKey.conversationViewSnapshotId,
    analysisSnapshotId: frameKey.analysisSnapshotId,
    conversationViewSnapshot,
    analysisViewState,
    displayableGroupCounts: [2, 3, 4, 5, 6],
    hasVotedOnAllAvailableOpinions: false,
  };
}

export function buildMockAnalysisCheckpoints(): AnalysisCheckpoint[] {
  return [
    {
      conversationViewSnapshotId: 20,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      activatedAt: new Date("2026-01-01T00:00:00Z"),
      opinionCount: 25,
      voteCount: 200,
      participantCount: 30,
      totalOpinionCount: 25,
      totalVoteCount: 200,
      totalParticipantCount: 30,
      moderatedOpinionCount: 0,
      hiddenOpinionCount: 0,
      isClosed: false,
      reasons: [
        {
          reason: "first_displayable_analysis",
          groupCount: null,
          previousGroupCount: null,
          participantCount: 30,
          participantMilestone: null,
          voteCount: 200,
          voteMilestone: null,
        },
      ],
    },
    {
      conversationViewSnapshotId: 60,
      createdAt: new Date("2026-01-02T00:00:00Z"),
      activatedAt: new Date("2026-01-02T00:00:00Z"),
      opinionCount: 80,
      voteCount: 1700,
      participantCount: 120,
      totalOpinionCount: 90,
      totalVoteCount: 1900,
      totalParticipantCount: 120,
      moderatedOpinionCount: 0,
      hiddenOpinionCount: 0,
      isClosed: false,
      reasons: [3, 4, 5, 6].map((groupCount) => ({
        reason: "first_group_count_available",
        groupCount,
        previousGroupCount: null,
        participantCount: 120,
        participantMilestone: null,
        voteCount: 1700,
        voteMilestone: null,
      })),
    },
    {
      conversationViewSnapshotId: 100,
      createdAt: new Date("2026-01-03T00:00:00Z"),
      activatedAt: new Date("2026-01-03T00:00:00Z"),
      opinionCount: 128,
      voteCount: 4230,
      participantCount: 271,
      totalOpinionCount: 301,
      totalVoteCount: 11000,
      totalParticipantCount: 271,
      moderatedOpinionCount: 0,
      hiddenOpinionCount: 0,
      isClosed: false,
      reasons: [
        {
          reason: "default_group_count_changed",
          groupCount: 4,
          previousGroupCount: 3,
          participantCount: 271,
          participantMilestone: null,
          voteCount: 4230,
          voteMilestone: null,
        },
      ],
    },
  ];
}

interface SurveyCounts {
  dominant: number;
  minority: number;
}

const visibleSurveyCounts = {
  dominant: 8,
  minority: 5,
} as const;

const suppressedSurveyCounts = {
  dominant: 4,
  minority: 1,
} as const;

export type AiLabelMode = "long" | "short" | "none";

export type SurveyScenario =
  | "visible"
  | "suppressed"
  | "overallSuppressed"
  | "mixed"
  | "empty"
  | "absent";

const surveyQuestions = [
  {
    questionId: "survey-q-1",
    question: "Which participation channel do you trust the most?",
    dominantOption: "Neighborhood assemblies",
    minorityOption: "Online platform",
  },
  {
    questionId: "survey-q-2",
    question: "What should be prioritized first?",
    dominantOption: "Housing",
    minorityOption: "Mobility",
  },
  {
    questionId: "survey-q-3",
    question: "How often should citizens be consulted?",
    dominantOption: "Every quarter",
    minorityOption: "Only on major projects",
  },
  {
    questionId: "survey-q-4",
    question: "Which format feels most accessible?",
    dominantOption: "In-person workshops",
    minorityOption: "Mobile-first surveys",
  },
] as const;

function getClusterLabel({
  clusterIndex,
  aiLabelMode,
}: {
  clusterIndex: number;
  aiLabelMode: AiLabelMode;
}): string {
  if (aiLabelMode === "long") {
    return longAiLabels[clusterIndex] ?? `Group ${String(clusterIndex + 1)}`;
  }

  if (aiLabelMode === "short") {
    return shortAiLabels[clusterIndex] ?? `Group ${String(clusterIndex + 1)}`;
  }

  return String.fromCharCode(65 + clusterIndex);
}

function getClusterSurveyCounts({
  clusterIndex,
  surveyScenario,
  responseScaleMultiplier,
}: {
  clusterIndex: number;
  surveyScenario: Exclude<SurveyScenario, "empty" | "absent">;
  responseScaleMultiplier: number;
}): {
  dominant: number;
  minority: number;
} {
  const scaledVisibleCounts = {
    dominant: visibleSurveyCounts.dominant * responseScaleMultiplier,
    minority: visibleSurveyCounts.minority * responseScaleMultiplier,
  };

  switch (surveyScenario) {
    case "visible":
      if (clusterIndex % 2 === 0) {
        return scaledVisibleCounts;
      }

      return {
        dominant: scaledVisibleCounts.minority,
        minority: scaledVisibleCounts.dominant,
      };
    case "suppressed":
    case "overallSuppressed":
      if (clusterIndex % 2 === 0) {
        return suppressedSurveyCounts;
      }

      return {
        dominant: suppressedSurveyCounts.minority,
        minority: suppressedSurveyCounts.dominant,
      };
    case "mixed":
      if (clusterIndex % 2 === 0) {
        return scaledVisibleCounts;
      }

      return suppressedSurveyCounts;
    default:
      return scaledVisibleCounts;
  }
}

function shouldSuppressSurveyBlock({
  dominantCount,
  minorityCount,
}: {
  dominantCount: number;
  minorityCount: number;
}): boolean {
  return [dominantCount, minorityCount].some(
    (count) => count > 0 && count < surveySuppressionThreshold
  );
}

function buildSurveyAggregateBlockRows({
  scope,
  clusterId,
  clusterLabel,
  questionId,
  question,
  dominantOption,
  minorityOption,
  dominantCount,
  minorityCount,
  isPublicAggregateSuppressionEnabled,
  suppressionReason,
}: {
  scope: "overall" | "cluster";
  clusterId: string;
  clusterLabel: string;
  questionId: string;
  question: string;
  dominantOption: string;
  minorityOption: string;
  dominantCount: number;
  minorityCount: number;
  isPublicAggregateSuppressionEnabled: boolean;
  suppressionReason: SurveyAggregateSuppressionReason | undefined;
}): SurveyAggregateRow[] {
  const total = dominantCount + minorityCount;
  const isSuppressed = suppressionReason !== undefined;

  return [
    {
      scope,
      clusterId,
      clusterLabel,
      questionId,
      questionType: "choice",
      question,
      optionId: `${questionId}-${clusterId || "overall"}-dominant`,
      option: dominantOption,
      count: isSuppressed ? undefined : dominantCount,
      percentage: isSuppressed
        ? undefined
        : (dominantCount / Math.max(total, 1)) * 100,
      isSuppressed,
      isPublicAggregateSuppressionEnabled,
      suppressionReason,
    },
    {
      scope,
      clusterId,
      clusterLabel,
      questionId,
      questionType: "choice",
      question,
      optionId: `${questionId}-${clusterId || "overall"}-minority`,
      option: minorityOption,
      count: isSuppressed ? undefined : minorityCount,
      percentage: isSuppressed
        ? undefined
        : (minorityCount / Math.max(total, 1)) * 100,
      isSuppressed,
      isPublicAggregateSuppressionEnabled,
      suppressionReason,
    },
  ];
}

export function buildMockSurveyResults({
  clusterCount,
  aiLabelMode,
  surveyViewerAccess,
  surveyScenario,
  responseScaleMultiplier = 1,
}: {
  clusterCount: number;
  aiLabelMode: AiLabelMode;
  surveyViewerAccess: "public" | "owner";
  surveyScenario: SurveyScenario;
  responseScaleMultiplier?: number;
}): SurveyResultsAggregatedResponse {
  if (surveyScenario === "absent") {
    return {
      hasSurvey: false,
      accessLevel: surveyViewerAccess,
      suppressionThreshold: surveySuppressionThreshold,
      suppressedRows: [],
    };
  }

  if (surveyScenario === "empty") {
    return {
      hasSurvey: true,
      accessLevel: surveyViewerAccess,
      suppressionThreshold: surveySuppressionThreshold,
      suppressedRows: [],
      fullRows: surveyViewerAccess === "owner" ? [] : undefined,
    };
  }

  const fullRows: SurveyAggregateRow[] = [];
  const suppressedRows: SurveyAggregateRow[] = [];
  const effectiveClusterCount = Math.max(clusterCount, 1);
  const isPublicAggregateSuppressionEnabled = surveyScenario !== "visible";

  for (const surveyQuestion of surveyQuestions) {
    const overallCounts = Array.from({
      length: effectiveClusterCount,
    }).reduce<SurveyCounts>(
      (acc, _, clusterIndex) => {
        const counts = getClusterSurveyCounts({
          clusterIndex,
          surveyScenario,
          responseScaleMultiplier,
        });

        return {
          dominant: acc.dominant + counts.dominant,
          minority: acc.minority + counts.minority,
        };
      },
      { dominant: 0, minority: 0 }
    );

    fullRows.push(
      ...buildSurveyAggregateBlockRows({
        scope: "overall",
        clusterId: "",
        clusterLabel: "",
        questionId: surveyQuestion.questionId,
        question: surveyQuestion.question,
        dominantOption: surveyQuestion.dominantOption,
        minorityOption: surveyQuestion.minorityOption,
        dominantCount: overallCounts.dominant,
        minorityCount: overallCounts.minority,
        isPublicAggregateSuppressionEnabled,
        suppressionReason: undefined,
      })
    );

    suppressedRows.push(
      ...buildSurveyAggregateBlockRows({
        scope: "overall",
        clusterId: "",
        clusterLabel: "",
        questionId: surveyQuestion.questionId,
        question: surveyQuestion.question,
        dominantOption: surveyQuestion.dominantOption,
        minorityOption: surveyQuestion.minorityOption,
        dominantCount: overallCounts.dominant,
        minorityCount: overallCounts.minority,
        isPublicAggregateSuppressionEnabled,
        suppressionReason:
          surveyScenario === "overallSuppressed" ||
          shouldSuppressSurveyBlock({
            dominantCount: overallCounts.dominant,
            minorityCount: overallCounts.minority,
          })
            ? "count_below_threshold"
            : undefined,
      })
    );

    for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex++) {
      const clusterId = polisKeys[clusterIndex] ?? String(clusterIndex);
      const clusterLabel = getClusterLabel({ clusterIndex, aiLabelMode });
      const counts = getClusterSurveyCounts({
        clusterIndex,
        surveyScenario,
        responseScaleMultiplier,
      });

      fullRows.push(
        ...buildSurveyAggregateBlockRows({
          scope: "cluster",
          clusterId,
          clusterLabel,
          questionId: surveyQuestion.questionId,
          question: surveyQuestion.question,
          dominantOption: surveyQuestion.dominantOption,
          minorityOption: surveyQuestion.minorityOption,
          dominantCount: counts.dominant,
          minorityCount: counts.minority,
          isPublicAggregateSuppressionEnabled,
          suppressionReason: undefined,
        })
      );

      suppressedRows.push(
        ...buildSurveyAggregateBlockRows({
          scope: "cluster",
          clusterId,
          clusterLabel,
          questionId: surveyQuestion.questionId,
          question: surveyQuestion.question,
          dominantOption: surveyQuestion.dominantOption,
          minorityOption: surveyQuestion.minorityOption,
          dominantCount: counts.dominant,
          minorityCount: counts.minority,
          isPublicAggregateSuppressionEnabled,
          suppressionReason: shouldSuppressSurveyBlock({
            dominantCount: counts.dominant,
            minorityCount: counts.minority,
          })
            ? "cluster_deductive_disclosure"
            : undefined,
        })
      );
    }
  }

  return {
    hasSurvey: true,
    accessLevel: surveyViewerAccess,
    suppressionThreshold: surveySuppressionThreshold,
    suppressedRows,
    fullRows: surveyViewerAccess === "owner" ? fullRows : undefined,
  };
}

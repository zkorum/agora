import type { SurveyResultsAggregatedResponse } from "src/shared/types/dto";
import type {
  PolisKey,
  SurveyAggregateRow,
  SurveyAggregateSuppressionReason,
} from "src/shared/types/zod";

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

export const surveySuppressionThreshold = 5;

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
      questionType: "mono_choice",
      question,
      optionId: `${questionId}-${clusterId || "overall"}-dominant`,
      option: dominantOption,
      count: isSuppressed ? undefined : dominantCount,
      percentage: isSuppressed
        ? undefined
        : (dominantCount / Math.max(total, 1)) * 100,
      isSuppressed,
      suppressionReason,
    },
    {
      scope,
      clusterId,
      clusterLabel,
      questionId,
      questionType: "mono_choice",
      question,
      optionId: `${questionId}-${clusterId || "overall"}-minority`,
      option: minorityOption,
      count: isSuppressed ? undefined : minorityCount,
      percentage: isSuppressed
        ? undefined
        : (minorityCount / Math.max(total, 1)) * 100,
      isSuppressed,
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

  for (const surveyQuestion of surveyQuestions) {
    const overallCounts = Array.from({ length: effectiveClusterCount }).reduce<SurveyCounts>(
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

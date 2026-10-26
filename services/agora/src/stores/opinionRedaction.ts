import { defineStore } from "pinia";
import type { AnalysisFrameGroups } from "src/shared/types/dto";
import type { SSEEventDataByType } from "src/shared/types/sse";
import type {
  AnalysisOpinionItem,
  PolisClusters,
  PolisKey,
} from "src/shared/types/zod";
import type { AnalysisData } from "src/utils/api/comment/analysisData";
import { computed, ref } from "vue";

const groupKeys: PolisKey[] = ["0", "1", "2", "3", "4", "5"];
type RedactionAction =
  SSEEventDataByType["opinion_redacted"]["opinions"][number]["action"];

export const useOpinionRedactionStore = defineStore("opinionRedaction", () => {
  const actions = ref(new Map<string, RedactionAction>());
  const revision = ref(0);

  function record(
    opinions: SSEEventDataByType["opinion_redacted"]["opinions"]
  ): void {
    const next = new Map(actions.value);
    for (const opinion of opinions) {
      if (next.get(opinion.opinionSlugId) !== "redact")
        next.set(opinion.opinionSlugId, opinion.action);
    }
    actions.value = next;
    revision.value += 1;
  }

  function projectOpinion(opinion: AnalysisOpinionItem): AnalysisOpinionItem {
    const action = actions.value.get(opinion.opinionSlugId);
    if (action === undefined) return opinion;
    return {
      ...opinion,
      username: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      isEdited: action === "redact" ? undefined : opinion.isEdited,
      clustersStats: opinion.clustersStats.map((stats) => ({
        ...stats,
        isAuthorInCluster: undefined,
      })),
      content:
        action === "redact"
          ? { status: "redacted", reason: "statement_deleted" }
          : opinion.content,
    };
  }

  function projectGroups(groups: AnalysisFrameGroups): AnalysisFrameGroups {
    const clusters: AnalysisFrameGroups["clusters"] = {};
    for (const key of groupKeys) {
      const group = groups.clusters[key];
      if (group !== undefined)
        clusters[key] = {
          ...group,
          representative: group.representative.map(projectOpinion),
        };
    }
    return { ...groups, clusters };
  }

  function projectAnalysis(data: AnalysisData): AnalysisData {
    if (actions.value.size === 0) return data;
    const clusters: Partial<PolisClusters> = {};
    for (const key of groupKeys) {
      const group = data.polisClusters[key];
      if (group !== undefined)
        clusters[key] = {
          ...group,
          representative: group.representative.map(projectOpinion),
        };
    }
    return {
      ...data,
      consensusAgree: data.consensusAgree.map(projectOpinion),
      consensusDisagree: data.consensusDisagree.map(projectOpinion),
      controversial: data.controversial.map(projectOpinion),
      polisClusters: clusters,
      groups:
        data.groups === undefined ? undefined : projectGroups(data.groups),
      agreements:
        data.agreements === undefined
          ? undefined
          : {
              ...data.agreements,
              items: data.agreements.items.map(projectOpinion),
            },
      disagreements:
        data.disagreements === undefined
          ? undefined
          : {
              ...data.disagreements,
              items: data.disagreements.items.map(projectOpinion),
            },
      divisive:
        data.divisive === undefined
          ? undefined
          : {
              ...data.divisive,
              items: data.divisive.items.map(projectOpinion),
            },
    };
  }

  return {
    record,
    projectOpinion,
    projectGroups,
    projectAnalysis,
    version: computed(() => revision.value),
  };
});

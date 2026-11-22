import { defineStore } from "pinia";
import type {
  AnalysisFrameContent,
  AnalysisFrameGroups,
  AnalysisFrameKey,
  AnalysisFrameOpinionList,
} from "src/shared/types/dto";
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
type RedactionState = Exclude<RedactionAction, "restore_account">;

export const useOpinionRedactionStore = defineStore("opinionRedaction", () => {
  const actions = ref(new Map<string, RedactionState>());
  const revision = ref(0);
  const resyncRevision = ref(0);

  function requireResync(): void {
    // The caller discards cached frames before an authoritative refetch. A lost
    // recovery event must not let reversible account hiding override that data.
    actions.value = new Map(
      [...actions.value].filter(([, action]) => action === "redact")
    );
    revision.value += 1;
    resyncRevision.value += 1;
  }

  function record(
    opinions: SSEEventDataByType["opinion_redacted"]["opinions"]
  ): void {
    const next = new Map(actions.value);
    for (const opinion of opinions) {
      if (next.get(opinion.opinionSlugId) === "redact") continue;
      if (opinion.action === "restore_account") {
        next.delete(opinion.opinionSlugId);
      } else if (
        opinion.action !== "unlink_author" ||
        next.get(opinion.opinionSlugId) !== "hide_account"
      ) {
        next.set(opinion.opinionSlugId, opinion.action);
      }
    }
    actions.value = next;
    revision.value += 1;
  }

  function projectOpinion({
    opinion,
    frameMode,
  }: {
    opinion: AnalysisOpinionItem;
    frameMode: AnalysisFrameKey["mode"];
  }): AnalysisOpinionItem {
    const action = actions.value.get(opinion.opinionSlugId);
    if (action === undefined) return opinion;
    const redact =
      action === "redact" ||
      (action === "hide_account" && frameMode === "live");
    return {
      ...opinion,
      username: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      isEdited: redact ? undefined : opinion.isEdited,
      clustersStats: opinion.clustersStats.map((stats) => ({
        ...stats,
        isAuthorInCluster: undefined,
      })),
      content: redact
        ? { status: "redacted", reason: "statement_deleted" }
        : opinion.content.status === "visible" && action === "hide_account"
          ? {
              ...opinion.content,
              displayContent: {
                ...opinion.content.displayContent,
                translationControl: null,
              },
            }
          : opinion.content,
    };
  }

  function projectGroups(groups: AnalysisFrameGroups): AnalysisFrameGroups {
    if (actions.value.size === 0) return groups;
    const clusters: AnalysisFrameGroups["clusters"] = {};
    for (const key of groupKeys) {
      const group = groups.clusters[key];
      if (group !== undefined)
        clusters[key] = {
          ...group,
          representative: projectOpinions({
            opinions: group.representative,
            frameMode: groups.frameKey.mode,
          }),
        };
    }
    return { ...groups, clusters };
  }

  function projectList<Kind extends AnalysisFrameOpinionList["kind"]>(
    list: AnalysisFrameOpinionList & { kind: Kind }
  ) {
    if (actions.value.size === 0) return list;
    return {
      ...list,
      items: projectOpinions({
        opinions: list.items,
        frameMode: list.frameKey.mode,
      }),
    };
  }

  function projectFrameContent(
    content: AnalysisFrameContent
  ): AnalysisFrameContent {
    if (actions.value.size === 0) return content;
    return {
      groups: projectGroups(content.groups),
      agreements: projectList(content.agreements),
      disagreements: projectList(content.disagreements),
      divisive: projectList(content.divisive),
    };
  }
  function projectOpinions({
    opinions,
    frameMode,
  }: {
    opinions: AnalysisOpinionItem[];
    frameMode: AnalysisFrameKey["mode"];
  }): AnalysisOpinionItem[] {
    const projected: AnalysisOpinionItem[] = [];
    for (const opinion of opinions) {
      if (
        frameMode === "live" &&
        actions.value.get(opinion.opinionSlugId) === "hide_account"
      )
        continue;
      projected.push(projectOpinion({ opinion, frameMode }));
    }
    return projected;
  }

  function projectAnalysis(data: AnalysisData): AnalysisData {
    if (actions.value.size === 0) return data;
    // Legacy/paused live frames must not inherit historical display permissions.
    const frameMode = data.frameKey?.mode ?? "live";
    const clusters: Partial<PolisClusters> = {};
    for (const key of groupKeys) {
      const group = data.polisClusters[key];
      if (group !== undefined)
        clusters[key] = {
          ...group,
          representative: projectOpinions({
            opinions: group.representative,
            frameMode,
          }),
        };
    }
    return {
      ...data,
      consensusAgree: projectOpinions({
        opinions: data.consensusAgree,
        frameMode,
      }),
      consensusDisagree: projectOpinions({
        opinions: data.consensusDisagree,
        frameMode,
      }),
      controversial: projectOpinions({
        opinions: data.controversial,
        frameMode,
      }),
      polisClusters: clusters,
      groups:
        data.groups === undefined ? undefined : projectGroups(data.groups),
      agreements:
        data.agreements === undefined
          ? undefined
          : projectList(data.agreements),
      disagreements:
        data.disagreements === undefined
          ? undefined
          : projectList(data.disagreements),
      divisive:
        data.divisive === undefined ? undefined : projectList(data.divisive),
    };
  }

  return {
    record,
    projectOpinion,
    projectGroups,
    projectList,
    projectAnalysis,
    projectFrameContent,
    requireResync,
    resyncVersion: computed(() => resyncRevision.value),
    version: computed(() => revision.value),
  };
});

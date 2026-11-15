import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { UpdateConversationRequest } from "src/shared/types/dto";
import type { ExtendedConversation } from "src/shared/types/zod";
import { applyConversationTypeConfig } from "src/shared/utils/conversationTypeConfig";
import { applyParticipantStatements } from "src/shared/utils/participantStatements";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import { useUserStore } from "src/stores/user";
import { cacheCreatedSeedOpinions } from "src/utils/api/comment/createdOpinionCache";
import type { OpinionQueryScope } from "src/utils/api/comment/opinionQueryScope";
import { invalidateConversationContentQueries } from "src/utils/api/contentTranslation/conversationContentQuery";
import { applyConversationProjectAssignment } from "src/utils/api/post/conversationProjectCache";
import { useBackendPostApi } from "src/utils/api/post/post";
import { useBackendPostEditApi } from "src/utils/api/post/postEdit";
import { createSavedSeedOpinionChanges } from "src/utils/api/post/savedSeedOpinionChanges";
import {
  type ConversationMutationsTranslations,
  conversationMutationsTranslations,
} from "src/utils/api/post/useConversationMutations.i18n";
import {
  type ConversationDetail,
  updateConversationQueryCache,
} from "src/utils/api/post/useConversationQuery";
import {
  isQueryForViewerScope,
  useViewerQueryScope,
  type ViewerQueryScope,
} from "src/utils/query/viewerScope";
import { useNotify } from "src/utils/ui/notify";
import { onScopeDispose, watch } from "vue";

import {
  beginQvLifecycleChange,
  getQvCalculationFrontier,
  settleQvLifecycleChange,
} from "./qvCalculationState";

async function beginConversationLifecycleMutation({
  queryClient,
  conversationSlugId,
  scope,
  isClosed,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
  scope: ViewerQueryScope;
  isClosed: boolean;
}) {
  const filter = {
    queryKey: ["conversation", conversationSlugId],
    predicate: (query: { queryKey: readonly unknown[] }) =>
      isQueryForViewerScope({ queryKey: query.queryKey, viewerScope: scope }),
  };
  const isQv = queryClient
    .getQueriesData<ExtendedConversation | ConversationDetail>(filter)
    .some(([, data]) => {
      const metadata =
        data === undefined
          ? undefined
          : "conversationData" in data
            ? data.conversationData.metadata
            : data.metadata;
      return (
        metadata?.conversationType === "prioritizing" &&
        metadata.prioritizationType === "qv"
      );
    });
  const qvChange = isQv
    ? beginQvLifecycleChange({ queryClient, slug: conversationSlugId })
    : undefined;
  if (qvChange !== undefined) {
    await queryClient.cancelQueries({
      queryKey: ["qv-results", conversationSlugId],
    });
    await queryClient.cancelQueries({
      queryKey: ["qv-load", conversationSlugId],
    });
  }
  await queryClient.cancelQueries(filter);
  const previous = queryClient.getQueriesData<
    ExtendedConversation | ConversationDetail
  >(filter);
  updateConversationQueryCache({
    queryClient,
    conversationSlugId,
    viewerScope: scope,
    updateConversation: (data) => ({
      metadata: { ...data.metadata, isClosed },
      interaction: {
        ...data.interaction,
        conversationCapabilities: {
          ...data.interaction.conversationCapabilities,
          canClose: false,
          canReopen: false,
        },
      },
    }),
  });
  const snapshots = previous.map(([queryKey, data]) => ({
    queryKey,
    previous: data,
    optimistic: queryClient.getQueryData<
      ExtendedConversation | ConversationDetail
    >(queryKey),
  }));
  return {
    scope,
    qvChange,
    rollback: () => {
      if (
        qvChange !== undefined &&
        getQvCalculationFrontier({ queryClient, slug: conversationSlugId })
          .epoch !== qvChange.epoch
      )
        return;
      for (const snapshot of snapshots) {
        // A newer SSE/read/command wins over this rollback. Never repopulate
        // cleared caches or restore old counts/permissions over newer data.
        queryClient.setQueryData<ExtendedConversation | ConversationDetail>(
          snapshot.queryKey,
          (current) =>
            current !== undefined && current === snapshot.optimistic
              ? snapshot.previous
              : current
        );
      }
    },
  };
}

function settleConversationLifecycleMutation({
  queryClient,
  conversationSlugId,
  context,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
  context:
    | Awaited<ReturnType<typeof beginConversationLifecycleMutation>>
    | undefined;
}) {
  if (context?.qvChange !== undefined) {
    settleQvLifecycleChange({
      queryClient,
      slug: conversationSlugId,
      change: context.qvChange,
    });
    // Re-enabling a fresh cached query alone does not fetch. Every settlement,
    // including transport uncertainty, must cross the writer-read barrier.
    void queryClient.invalidateQueries({
      queryKey: ["qv-results", conversationSlugId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["qv-load", conversationSlugId],
    });
  }
  void queryClient.invalidateQueries({
    queryKey: ["conversation", conversationSlugId],
  });
}

export function useCloseConversationMutation() {
  const queryClient = useQueryClient();
  const viewerScope = useViewerQueryScope();
  const { closeConversation } = useBackendPostApi();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<ConversationMutationsTranslations>(
    conversationMutationsTranslations
  );

  return useMutation({
    mutationFn: ({ conversationSlugId }: { conversationSlugId: string }) => {
      return closeConversation({ conversationSlugId });
    },

    onMutate: ({ conversationSlugId }) =>
      beginConversationLifecycleMutation({
        queryClient,
        conversationSlugId,
        scope: viewerScope.value,
        isClosed: true,
      }),

    onSuccess: (data, _variables, context) => {
      if (data.success) {
        showNotifyMessage(t("closeSuccess"));

        // Optimistic update was correct, mark feed as stale for next visit
        void queryClient.invalidateQueries({
          queryKey: ["feed"],
          refetchType: "none",
        });
      } else {
        if (context?.scope.userId === viewerScope.value.userId)
          context?.rollback();
        // Handle error reasons
        if (data.reason === "not_allowed") {
          showNotifyMessage(t("closeNotAllowed"));
        } else if (data.reason === "already_closed") {
          showNotifyMessage(t("alreadyClosed"));
        }
      }
    },

    onError: (_error, _variables, context) => {
      if (
        context !== undefined &&
        context.scope.userId === viewerScope.value.userId
      ) {
        context.rollback();
      }

      showNotifyMessage(t("closeError"));
    },
    onSettled: (_data, _error, { conversationSlugId }, context) =>
      settleConversationLifecycleMutation({
        queryClient,
        conversationSlugId,
        context,
      }),

    retry: false,
  });
}

export function useOpenConversationMutation() {
  const queryClient = useQueryClient();
  const viewerScope = useViewerQueryScope();
  const { openConversation } = useBackendPostApi();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<ConversationMutationsTranslations>(
    conversationMutationsTranslations
  );

  return useMutation({
    mutationFn: ({ conversationSlugId }: { conversationSlugId: string }) => {
      return openConversation({ conversationSlugId });
    },

    onMutate: ({ conversationSlugId }) =>
      beginConversationLifecycleMutation({
        queryClient,
        conversationSlugId,
        scope: viewerScope.value,
        isClosed: false,
      }),

    onSuccess: (data, _variables, context) => {
      if (data.success) {
        showNotifyMessage(t("openSuccess"));

        // Optimistic update was correct, mark feed as stale for next visit
        void queryClient.invalidateQueries({
          queryKey: ["feed"],
          refetchType: "none",
        });
      } else {
        if (context?.scope.userId === viewerScope.value.userId)
          context?.rollback();
        // Handle error reasons
        if (data.reason === "not_allowed") {
          showNotifyMessage(t("openNotAllowed"));
        } else if (data.reason === "already_open") {
          showNotifyMessage(t("alreadyOpen"));
        }
      }
    },

    onError: (_error, _variables, context) => {
      if (
        context !== undefined &&
        context.scope.userId === viewerScope.value.userId
      ) {
        context.rollback();
      }

      showNotifyMessage(t("openError"));
    },
    onSettled: (_data, _error, { conversationSlugId }, context) =>
      settleConversationLifecycleMutation({
        queryClient,
        conversationSlugId,
        context,
      }),

    retry: false,
  });
}

export function useUpdateConversationMutation() {
  const auth = useAuthenticationStore();
  const queryClient = useQueryClient();
  const { updateConversation, refreshConversationMetadata } =
    useBackendPostEditApi();
  const viewerScope = useViewerQueryScope();
  const userStore = useUserStore();
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  let seedSaveGeneration = 0;
  watch(
    [
      () => auth.userId,
      () => auth.isLoggedIn,
      displayLanguage,
      spokenLanguages,
    ],
    () => {
      seedSaveGeneration += 1;
    },
    { flush: "sync", deep: true }
  );
  onScopeDispose(() => {
    seedSaveGeneration += 1;
  });

  return useMutation({
    mutationFn: (data: UpdateConversationRequest) => updateConversation(data),

    onMutate: async (variables) => {
      const viewerUserId = auth.userId;
      const generation = seedSaveGeneration;
      const changedSeedSlugs = new Set(
        (variables.seedOpinionChanges ?? []).map((change) => change.slugId)
      );
      const profileBeforeSave = new Map(
        (changedSeedSlugs.size === 0
          ? []
          : userStore.profileData.userCommentList
        )
          .filter((item) =>
            changedSeedSlugs.has(item.opinionItem.opinionSlugId)
          )
          .map((item) => [
            item.opinionItem.opinionSlugId,
            { ...item.opinionItem },
          ])
      );
      const opinionScope: OpinionQueryScope = {
        viewerUserId,
        displayLanguage: displayLanguage.value,
        spokenLanguages: [...spokenLanguages.value],
      };
      const polisSettings =
        variables.conversationTypeConfig.conversationType === "polis"
          ? variables.conversationTypeConfig
          : undefined;
      await queryClient.cancelQueries({
        queryKey: ["conversation", variables.conversationSlugId],
      });

      const previousConversations = queryClient.getQueriesData<
        ExtendedConversation | ConversationDetail
      >({ queryKey: ["conversation", variables.conversationSlugId] });
      const previousMetadata = previousConversations.flatMap(([, previous]) =>
        previous === undefined
          ? []
          : [
              "conversationData" in previous
                ? previous.conversationData.metadata
                : previous.metadata,
            ]
      );
      const aiLabelingEnabledChanged =
        polisSettings?.aiLabelingEnabled !== undefined &&
        (previousMetadata.length === 0 ||
          previousMetadata.some(
            (metadata) =>
              metadata.aiLabelingEnabled !== polisSettings.aiLabelingEnabled
          ));
      const preferredOpinionGroupCountChanged =
        polisSettings?.preferredOpinionGroupCount !== undefined &&
        (previousMetadata.length === 0 ||
          previousMetadata.some(
            (metadata) =>
              metadata.preferredOpinionGroupCount !==
              polisSettings.preferredOpinionGroupCount
          ));

      updateConversationQueryCache({
        queryClient,
        conversationSlugId: variables.conversationSlugId,
        updateConversation: (oldData) => {
          const updatedData = {
            metadata: {
              ...oldData.metadata,
              ...(oldData.metadata.conversationType === "polis" &&
              polisSettings !== undefined
                ? { votingPresentation: polisSettings.votingPresentation }
                : {}),
              isIndexed: variables.isIndexed,
              aiLabelingEnabled:
                polisSettings?.aiLabelingEnabled ??
                oldData.metadata.aiLabelingEnabled,
              preferredOpinionGroupCount:
                polisSettings?.preferredOpinionGroupCount === undefined
                  ? oldData.metadata.preferredOpinionGroupCount
                  : polisSettings.preferredOpinionGroupCount,
              participationMode: variables.participationMode,
            },
          };

          if (!("payload" in oldData)) {
            return updatedData;
          }

          return {
            ...updatedData,
            payload: {
              ...oldData.payload,
              title: variables.conversationTitle,
              body: variables.conversationBody,
            },
          };
        },
      });

      return {
        rollback: () => {
          if (auth.userId !== viewerUserId) return;
          for (const [queryKey, previous] of previousConversations) {
            // A failed request must not repopulate caches cleared during logout.
            queryClient.setQueryData<ExtendedConversation | ConversationDetail>(
              queryKey,
              (current) => {
                if (current === undefined || previous === undefined)
                  return undefined;
                const participantStatements =
                  "conversationData" in current
                    ? current.conversationData.metadata.participantStatements
                    : current.metadata.participantStatements;
                if ("conversationData" in previous)
                  return {
                    ...previous,
                    conversationData: {
                      ...previous.conversationData,
                      metadata: applyParticipantStatements({
                        metadata: previous.conversationData.metadata,
                        participantStatements,
                      }),
                    },
                  };
                return {
                  ...previous,
                  metadata: applyParticipantStatements({
                    metadata: previous.metadata,
                    participantStatements,
                  }),
                };
              }
            );
          }
        },
        aiLabelingEnabledChanged,
        preferredOpinionGroupCountChanged,
        viewerUserId,
        opinionScope,
        generation,
        profileBeforeSave,
      };
    },

    onSuccess: async (data, variables, context) => {
      if (data.success) {
        if (
          context !== undefined &&
          context.viewerUserId === auth.userId &&
          context.generation === seedSaveGeneration
        )
          updateConversationQueryCache({
            queryClient,
            conversationSlugId: variables.conversationSlugId,
            updateConversation: (conversation) => ({
              metadata: applyParticipantStatements({
                metadata: conversation.metadata,
                participantStatements: data.participantStatements,
              }),
            }),
          });
        if (data.conversationTypeConfig !== undefined) {
          const config = data.conversationTypeConfig;
          updateConversationQueryCache({
            queryClient,
            conversationSlugId: variables.conversationSlugId,
            updateConversation: (conversation) => ({
              metadata: applyConversationTypeConfig({
                metadata: conversation.metadata,
                config,
              }),
            }),
          });
        }
        if (variables.qvStatementUpdate !== undefined) {
          void queryClient.invalidateQueries({
            queryKey: ["prioritization-items", variables.conversationSlugId],
          });
        }
        await cacheCreatedSeedOpinions({
          queryClient,
          conversationSlugId: variables.conversationSlugId,
          opinions: data.addedOpinions ?? [],
          viewerUserId: context?.viewerUserId,
        });
        const hasExistingSeedChanges =
          (variables.seedOpinionChanges?.length ?? 0) > 0;
        if (
          (data.addedSeedOpinions?.length ?? 0) > 0 ||
          hasExistingSeedChanges
        ) {
          for (const family of [
            "commentStats",
            "analysisFrameManifest",
            "comparison-items",
            "comparison-load",
            "ranking-stats-checkpoints",
          ]) {
            void queryClient.invalidateQueries({
              queryKey: [family, variables.conversationSlugId],
              refetchType: "none",
            });
          }
          void queryClient.invalidateQueries({
            queryKey: ["comments", variables.conversationSlugId],
            predicate: ({ queryKey, state }) =>
              hasExistingSeedChanges ||
              state.data === undefined ||
              !["discover", "new"].includes(String(queryKey[2])),
            refetchType: "none",
          });
          if (hasExistingSeedChanges) {
            for (const change of variables.seedOpinionChanges ?? []) {
              void queryClient.invalidateQueries({
                queryKey: ["opinionTarget", change.slugId],
                refetchType: "none",
              });
            }
            if (
              context !== undefined &&
              context.generation === seedSaveGeneration &&
              auth.userId === context.viewerUserId
            ) {
              const saved = createSavedSeedOpinionChanges({
                changes: variables.seedOpinionChanges ?? [],
                opinions: data.updatedOpinions ?? [],
              });
              saved.updateCache({
                queryClient,
                conversationSlugId: variables.conversationSlugId,
                scope: context.opinionScope,
              });
              userStore.profileData.userCommentList = saved.updateProfile({
                items: userStore.profileData.userCommentList,
                beforeSave: context.profileBeforeSave,
              });
            }
          }
        }
        await invalidateConversationContentQueries({
          queryClient,
          conversationSlugId: variables.conversationSlugId,
        });
        if (data.projectAssignment !== undefined) {
          // Keep the committed scope authoritative over an immediate replica refresh.
          void applyConversationProjectAssignment({
            queryClient,
            conversationSlugId: variables.conversationSlugId,
            assignment: data.projectAssignment,
            viewerScope: viewerScope.value,
            isCurrent: () => auth.userId === context?.viewerUserId,
            refreshMetadata: () =>
              refreshConversationMetadata({
                conversationSlugId: variables.conversationSlugId,
                authenticated: auth.isGuestOrLoggedIn,
              }),
          });
        }
        void queryClient.invalidateQueries({
          queryKey: ["feed"],
          refetchType: "none",
        });
        if (
          context?.preferredOpinionGroupCountChanged === true ||
          context?.aiLabelingEnabledChanged === true
        ) {
          void queryClient.invalidateQueries({
            queryKey: ["analysisFrameManifest", variables.conversationSlugId],
            refetchType: "none",
          });
        }
        if (context?.aiLabelingEnabledChanged === true) {
          void queryClient.invalidateQueries({
            queryKey: [
              "analysisFrameGroupLabels",
              variables.conversationSlugId,
            ],
            refetchType: "none",
          });
        }
        void queryClient.invalidateQueries({
          queryKey: ["analysis", variables.conversationSlugId],
        });
      } else {
        context?.rollback();
        void queryClient.invalidateQueries({
          queryKey: ["conversation", variables.conversationSlugId],
        });
      }
    },

    onError: (_error, _variables, context) => {
      context?.rollback();
    },

    retry: false,
  });
}

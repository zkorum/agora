import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import {
  type ConversationEmailUpdateConversationSummaryResponse,
  type ConversationEmailUpdatePreferenceUpdateResponse,
  Dto,
} from "src/shared/types/dto";
import { useAuthenticationStore } from "src/stores/authentication";
import {
  computed,
  type MaybeRefOrGetter,
  toValue,
} from "vue";

import { useBackendConversationEmailUpdatesApi } from "./conversationEmailUpdates";

type ConversationEmailUpdateSummarySuccess = Extract<
  ConversationEmailUpdateConversationSummaryResponse,
  { success: true }
>;

type ConversationEmailUpdateSummaryQueryKey = readonly [
  "conversationEmailUpdateSummary",
  string | undefined,
  boolean,
  string,
];

const conversationEmailUpdateSummaryQueryKeys = {
  identity: ({
    userId,
    hasEmailVerification,
  }: {
    userId: string | undefined;
    hasEmailVerification: boolean;
  }) =>
    [
      "conversationEmailUpdateSummary",
      userId,
      hasEmailVerification,
    ] as const,
  conversation: ({
    conversationSlugId,
    userId,
    hasEmailVerification,
  }: {
    conversationSlugId: string;
    userId: string | undefined;
    hasEmailVerification: boolean;
  }): ConversationEmailUpdateSummaryQueryKey => [
    "conversationEmailUpdateSummary",
    userId,
    hasEmailVerification,
    conversationSlugId,
  ],
};

export type ConversationEmailUpdateOnboardingAction = NonNullable<
  NonNullable<
    ConversationEmailUpdateSummarySuccess["participantPreference"]
  >["onboardingAction"]
>;

export type ConversationEmailUpdateOnboardingResolution =
  | { status: "loading" }
  | { status: "not_required" }
  | { status: "required"; action: ConversationEmailUpdateOnboardingAction }
  | { status: "transient_error" };

function getConversationEmailUpdateSummaryQueryKey({
  conversationSlugId,
  userId,
  hasEmailVerification,
}: {
  conversationSlugId: string;
  userId: string | undefined;
  hasEmailVerification: boolean;
}): ConversationEmailUpdateSummaryQueryKey {
  return conversationEmailUpdateSummaryQueryKeys.conversation({
    conversationSlugId,
    userId,
    hasEmailVerification,
  });
}

export function useConversationEmailUpdateSummaryQuery({
  conversationSlugId,
  enabled,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  enabled: MaybeRefOrGetter<boolean>;
}) {
  const queryClient = useQueryClient();
  const { getConversationSummary } = useBackendConversationEmailUpdatesApi();
  const { isAuthInitialized, userId, hasEmailVerification } = storeToRefs(
    useAuthenticationStore()
  );
  const resolvedConversationSlugId = computed(() =>
    toValue(conversationSlugId)
  );
  const queryEnabled = computed(
    () =>
      toValue(enabled) &&
      isAuthInitialized.value &&
      userId.value !== undefined &&
      hasEmailVerification.value &&
      resolvedConversationSlugId.value !== ""
  );
  const queryKey = computed(() =>
    getConversationEmailUpdateSummaryQueryKey({
      conversationSlugId: resolvedConversationSlugId.value,
      userId: userId.value,
      hasEmailVerification: hasEmailVerification.value,
    })
  );
  const query = useQuery({
    queryKey,
    queryFn: () =>
      getConversationSummary({
        conversationSlugId: resolvedConversationSlugId.value,
      }),
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
  const onboardingResolution = computed<ConversationEmailUpdateOnboardingResolution>(
    () => {
      if (!queryEnabled.value) return { status: "not_required" };
      const response = query.data.value;
      if (response !== undefined) {
        if (!response.success) return { status: "not_required" };
        const action = response.participantPreference?.onboardingAction;
        return action === undefined
          ? { status: "not_required" }
          : { status: "required", action };
      }
      return query.isError.value
        ? { status: "transient_error" }
        : { status: "loading" };
    }
  );

  function markPreferenceAnswered({
    state,
  }: {
    state: "disabled" | "enabled";
  }): void {
    const updateResponse = (
      response: ConversationEmailUpdateConversationSummaryResponse | undefined
    ): ConversationEmailUpdateConversationSummaryResponse | undefined => {
        if (!response?.success || response.participantPreference === undefined) {
          return response;
        }
        return {
          ...response,
          participantPreference: {
            ...response.participantPreference,
            state,
            onboardingAction: undefined,
          },
        };
    };
    const response = queryClient.getQueryData<ConversationEmailUpdateConversationSummaryResponse>(
      queryKey.value
    );
    const action = response?.success
      ? response.participantPreference?.onboardingAction
      : undefined;
    if (action?.operation === "set_project_preference") {
      queryClient.setQueriesData<ConversationEmailUpdateConversationSummaryResponse>(
        {
          queryKey: conversationEmailUpdateSummaryQueryKeys.identity({
            userId: userId.value,
            hasEmailVerification: hasEmailVerification.value,
          }),
        },
        (candidate) => {
          const candidateAction = candidate?.success
            ? candidate.participantPreference?.onboardingAction
            : undefined;
          return candidateAction?.operation === "set_project_preference" &&
            candidateAction.projectSlug === action.projectSlug
            ? updateResponse(candidate)
            : candidate;
        }
      );
      return;
    }
    queryClient.setQueryData<ConversationEmailUpdateConversationSummaryResponse>(
      queryKey.value,
      updateResponse
    );
  }

  return {
    ...query,
    onboardingResolution,
    markPreferenceAnswered,
  };
}

type ConversationEmailUpdatePreferenceUpdateResult = Extract<
  ConversationEmailUpdatePreferenceUpdateResponse,
  { success: true }
>["result"];

export function useRemoveConversationEmailUpdateSummaryQueries(): (
  result: ConversationEmailUpdatePreferenceUpdateResult
) => void {
  const queryClient = useQueryClient();
  const { userId, hasEmailVerification } = storeToRefs(useAuthenticationStore());
  const identityQueryKey = () =>
    conversationEmailUpdateSummaryQueryKeys.identity({
      userId: userId.value,
      hasEmailVerification: hasEmailVerification.value,
    });

  function removeConversation(conversationSlugId: string): void {
    queryClient.removeQueries({
      queryKey: conversationEmailUpdateSummaryQueryKeys.conversation({
        conversationSlugId,
        userId: userId.value,
        hasEmailVerification: hasEmailVerification.value,
      }),
    });
  }

  function removeProject(projectSlug: string): void {
    queryClient.removeQueries({
      queryKey: identityQueryKey(),
      predicate: (query) => {
        const parsed =
          Dto.conversationEmailUpdateConversationSummaryResponse.safeParse(
            query.state.data
          );
        if (!parsed.success || !parsed.data.success) return false;
        const action = parsed.data.participantPreference?.onboardingAction;
        return (
          action?.operation === "set_project_preference" &&
          action.projectSlug === projectSlug
        );
      },
    });
  }

  return (result) => {
    if (result.operation === "set_global_pause") {
      queryClient.removeQueries({
        queryKey: identityQueryKey(),
      });
      return;
    }
    if (result.globalResumed) {
      queryClient.removeQueries({
        queryKey: identityQueryKey(),
      });
      return;
    }
    if (result.operation === "set_project_preference") {
      queryClient.removeQueries({
        queryKey: identityQueryKey(),
      });
      return;
    }
    if (result.projectPreference !== undefined) {
      removeProject(result.projectPreference.projectSlug);
    }
    for (const preference of result.conversationPreferences) {
      removeConversation(preference.conversationSlugId);
    }
  };
}

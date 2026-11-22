import { queryOptions, useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import {
  type ConversationParticipationStatus,
  Dto,
} from "src/shared/types/dto";
import { useAuthenticationStore } from "src/stores/authentication";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { useViewerQueryScope } from "src/utils/query/viewerScope";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { api } from "../client";
import { useCommonApi } from "../common";

export type ParticipationStatus =
  | ConversationParticipationStatus
  | { status: "checking" }
  | { status: "unavailable" };

export function useParticipationStatusCache() {
  const queryClient = useQueryClient();
  const { userId, isLoggedIn, hasStrongVerification, hasEmailVerification } =
    storeToRefs(useAuthenticationStore());
  const viewerScope = useViewerQueryScope();
  const onboarding = useConversationOnboardingStore();

  function getQueryKey(conversationSlugId: string) {
    return [
      "participation-status",
      conversationSlugId,
      {
        userId: userId.value,
        isLoggedIn: isLoggedIn.value,
        hasStrongVerification: hasStrongVerification.value,
        hasEmailVerification: hasEmailVerification.value,
        skipEmailUpdateConsent:
          onboarding.hasSkippedEmailUpdateConsent(conversationSlugId),
      },
      viewerScope.value,
    ] as const;
  }

  function setStatus({
    conversationSlugId,
    status,
  }: {
    conversationSlugId: string;
    status: ConversationParticipationStatus;
  }): void {
    const queryKey = getQueryKey(conversationSlugId);
    // A write result wins over a read started before the write completed.
    void queryClient.cancelQueries({ queryKey, exact: true });
    queryClient.setQueryData(queryKey, status);
  }

  return { getQueryKey, setStatus };
}

export function useParticipationStatusQuery(
  conversationSlugId: MaybeRefOrGetter<string>
) {
  const { isAuthInitialized, isKnown } = storeToRefs(useAuthenticationStore());
  const { getQueryKey, setStatus } = useParticipationStatusCache();
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();
  const options = computed(() => {
    const queryKey = getQueryKey(toValue(conversationSlugId));
    const input = {
      conversationSlugId: queryKey[1],
      skipEmailUpdateConsent: queryKey[2].skipEmailUpdateConsent,
    };
    const shouldSign = isKnown.value;
    return queryOptions({
      queryKey,
      enabled: isAuthInitialized.value && input.conversationSlugId !== "",
      queryFn: async ({ signal }): Promise<ConversationParticipationStatus> => {
        const request = Dto.conversationParticipationStatusRequest.parse(input);
        const { url, options } =
          await DefaultApiAxiosParamCreator().apiV1ConversationParticipationStatusPost(
            request
          );
        const encodedUcan = shouldSign
          ? await buildEncodedUcan(url, options)
          : undefined;
        const response = await DefaultApiFactory(
          undefined,
          undefined,
          api
        ).apiV1ConversationParticipationStatusPost(
          request,
          createRawAxiosRequestConfig({ encodedUcan, signal })
        );
        return Dto.conversationParticipationStatusResponse.parse(response.data);
      },
      staleTime: 30_000,
      retry: false,
    });
  });
  const query = useQuery(options);
  const participationStatus = computed<ParticipationStatus>(
    () =>
      query.data.value ?? {
        status: query.isError.value ? "unavailable" : "checking",
      }
  );

  function recordRejection(
    status: Exclude<ConversationParticipationStatus, { status: "ready" }>
  ): void {
    setStatus({ conversationSlugId: toValue(conversationSlugId), status });
  }

  return { ...query, participationStatus, recordRejection };
}

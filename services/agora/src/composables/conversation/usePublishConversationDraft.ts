import type { ConversationDraft } from "src/composables/conversation/draft/conversationDraft.types";
import { resolveDraftPublicationIdentityAtBoundary } from "src/composables/conversation/draft/conversationDraft.utils";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type CreateConversationTranslations,
  createConversationTranslations,
} from "src/pages/conversation/new/create/index.i18n";
import {
  type CreateNewConversationRequest,
  type CreateNewConversationResponse,
  Dto,
} from "src/shared/types/dto";
import type { SurveyConfig } from "src/shared/types/zod";
import { useNavigationStore } from "src/stores/navigation";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useUserStore } from "src/stores/user";
import { useCommonApi } from "src/utils/api/common";
import { useMaxDiffApi } from "src/utils/api/maxdiff/maxdiff";
import { useBackendPostApi } from "src/utils/api/post/post";
import { useInvalidateFeedQuery } from "src/utils/api/post/useFeedQuery";
import { buildSurveyConfigForSave } from "src/utils/survey/config";
import { useNotify } from "src/utils/ui/notify";
import { useRouter } from "vue-router";

interface PublishConversationDraftParams {
  conversationDraft: ConversationDraft;
  surveyConfig: SurveyConfig | null;
  invalidSurveyMessage: string;
  defaultErrorMessage: string;
  onInvalidSurvey?: () => void;
  beforeSuccessNavigation?: () => void;
}

type CreateConversationFailureReason = Extract<
  CreateNewConversationResponse,
  { success: false }
>["reason"];

type BuildCreateConversationRequestResult =
  | {
      success: true;
      request: CreateNewConversationRequest;
    }
  | {
      success: false;
    };

function buildBaseCreateConversationRequest({
  conversationDraft,
  postAsOrganizationSlug,
}: {
  conversationDraft: ConversationDraft;
  postAsOrganizationSlug: string | undefined;
}) {
  return {
    conversationTitle: conversationDraft.title,
    conversationBody:
      conversationDraft.content === "" ? undefined : conversationDraft.content,
    conversationBodyPlainText: conversationDraft.contentPlainText,
    projectSlug: conversationDraft.selectedProjectSlug,
    languageSettingsSource:
      conversationDraft.selectedProjectSlug !== undefined &&
      conversationDraft.inheritProjectLanguages
        ? "project_inherited"
        : "conversation_override",
    multilingualSetting: conversationDraft.multilingualSetting,
    postAsOrganization: postAsOrganizationSlug ?? "",
    isIndexed: !conversationDraft.isPrivate,
    participationMode: conversationDraft.participationMode,
    seedOpinionList: conversationDraft.seedOpinions,
    requiresEventTicket: conversationDraft.requiresEventTicket,
  };
}

function buildCreateConversationRequest({
  conversationDraft,
  surveyConfig,
  postAsOrganizationSlug,
}: {
  conversationDraft: ConversationDraft;
  surveyConfig: SurveyConfig | null;
  postAsOrganizationSlug: string | undefined;
}): BuildCreateConversationRequestResult {
  const baseCreateRequest = buildBaseCreateConversationRequest({
    conversationDraft,
    postAsOrganizationSlug,
  });

  if (conversationDraft.conversationType === "ranking") {
    return {
      success: true,
      request: Dto.createNewConversationRequest.parse({
        ...baseCreateRequest,
        conversationType: conversationDraft.conversationType,
        rankingMode: conversationDraft.rankingMode,
        externalSourceConfig: conversationDraft.externalSourceConfig,
      }),
    };
  }

  const normalizedSurveyConfigResult = buildSurveyConfigForSave({
    surveyConfig,
  });

  if (!normalizedSurveyConfigResult.success) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    request: Dto.createNewConversationRequest.parse({
      ...baseCreateRequest,
      conversationType: conversationDraft.conversationType,
      aiLabelingEnabled: conversationDraft.aiLabelingEnabled,
      preferredOpinionGroupCount: conversationDraft.preferredOpinionGroupCount,
      surveyConfig: normalizedSurveyConfigResult.surveyConfig,
    }),
  };
}

export function usePublishConversationDraft() {
  const router = useRouter();
  const navigationStore = useNavigationStore();
  const newConversationDraftsStore = useNewPostDraftsStore();
  const userStore = useUserStore();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<CreateConversationTranslations>(
    createConversationTranslations
  );
  const { handleAxiosErrorStatusCodes } = useCommonApi();
  const { createNewPost } = useBackendPostApi();
  const { syncMaxDiff } = useMaxDiffApi();
  const { invalidateFeedTab } = useInvalidateFeedQuery();

  async function publishConversationDraft({
    conversationDraft,
    surveyConfig,
    invalidSurveyMessage,
    defaultErrorMessage,
    onInvalidSurvey,
    beforeSuccessNavigation,
  }: PublishConversationDraftParams): Promise<boolean> {
    try {
      const publicationIdentity =
        await resolveDraftPublicationIdentityAtBoundary({
          postAs: conversationDraft.postAs,
          getProfile: () => userStore.profileData,
          loadProfile: userStore.loadUserProfile,
        });
      if (publicationIdentity.status !== "resolved") {
        showNotifyMessage(t("organizationUnavailable"));
        return false;
      }

      const createRequestResult = buildCreateConversationRequest({
        conversationDraft,
        surveyConfig,
        postAsOrganizationSlug: publicationIdentity.organizationSlug,
      });

      if (!createRequestResult.success) {
        showNotifyMessage(invalidSurveyMessage);
        onInvalidSurvey?.();
        return false;
      }

      const response = await createNewPost(createRequestResult.request);

      if (response.status !== "success") {
        handleAxiosErrorStatusCodes({
          axiosErrorCode: response.code,
          defaultMessage: defaultErrorMessage,
        });
        return false;
      }

      if (!response.data.success) {
        switch (response.data.reason) {
          case "plain_text_too_long":
          case "html_too_long": {
            showNotifyMessage(defaultErrorMessage);
            break;
          }
          case "organization_not_available":
          case "missing_conversation_create_capability": {
            showProjectTargetFailure(response.data.reason);
            break;
          }
        }
        return false;
      }

      if (
        conversationDraft.conversationType === "ranking" &&
        conversationDraft.externalSourceConfig !== null
      ) {
        await syncMaxDiff({
          conversationSlugId: response.data.conversationSlugId,
        });
      }

      invalidateFeedTab("new");
      navigationStore.setConversationCreationContext(true);
      newConversationDraftsStore.resetDraft();
      beforeSuccessNavigation?.();

      await router.replace({
        name: "/conversation/[postSlugId]/",
        params: { postSlugId: response.data.conversationSlugId },
      });

      return true;
    } catch (error) {
      console.error("Failed to publish conversation draft", error);
      showNotifyMessage(defaultErrorMessage);
      return false;
    }
  }

  function showProjectTargetFailure(
    reason: CreateConversationFailureReason
  ): void {
    if (reason === "organization_not_available") {
      showNotifyMessage(t("organizationUnavailable"));
      return;
    }

    if (reason === "missing_conversation_create_capability") {
      showNotifyMessage(t("missingProjectCreateCapability"));
    }
  }

  return {
    publishConversationDraft,
  };
}

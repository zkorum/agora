import type { ConversationDraft } from "src/composables/conversation/draft/conversationDraft.types";
import type { SurveyConfig } from "src/shared/types/zod";
import { useNavigationStore } from "src/stores/navigation";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
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

export function usePublishConversationDraft() {
  const router = useRouter();
  const navigationStore = useNavigationStore();
  const newConversationDraftsStore = useNewPostDraftsStore();
  const { showNotifyMessage } = useNotify();
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
    const normalizedSurveyConfigResult = buildSurveyConfigForSave({
      surveyConfig,
    });
    if (!normalizedSurveyConfigResult.success) {
      showNotifyMessage(invalidSurveyMessage);
      onInvalidSurvey?.();
      return false;
    }

    try {
      const response = await createNewPost({
        postTitle: conversationDraft.title,
        postBody:
          conversationDraft.content === "" ? undefined : conversationDraft.content,
        pollingOptionList: conversationDraft.poll.enabled
          ? conversationDraft.poll.options
          : undefined,
        postAsOrganizationName: conversationDraft.postAs.postAsOrganization
          ? conversationDraft.postAs.organizationName
          : "",
        targetIsoConvertDateString:
          conversationDraft.privateConversationSettings.hasScheduledConversion
            ? conversationDraft.privateConversationSettings.conversionDate.toISOString()
            : undefined,
        isIndexed: !conversationDraft.isPrivate,
        participationMode: conversationDraft.participationMode,
        conversationType: conversationDraft.conversationType,
        seedOpinionList: conversationDraft.seedOpinions,
        requiresEventTicket: conversationDraft.requiresEventTicket,
        externalSourceConfig: conversationDraft.externalSourceConfig,
        surveyConfig: normalizedSurveyConfigResult.surveyConfig,
      });

      if (response.status !== "success") {
        handleAxiosErrorStatusCodes({
          axiosErrorCode: response.code,
          defaultMessage: defaultErrorMessage,
        });
        return false;
      }

      if (conversationDraft.externalSourceConfig !== null) {
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
    } catch {
      showNotifyMessage(defaultErrorMessage);
      return false;
    }
  }

  return {
    publishConversationDraft,
  };
}

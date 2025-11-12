import { useMutation } from "@tanstack/vue-query";
import { useBackendPostApi } from "./post";
import type { ImportConversationFromCsvParams } from "./post";
import type { AxiosErrorResponse } from "../common";
import { getErrorMessage } from "../common";
import { useNotify } from "../../ui/notify";
import { useRouter } from "vue-router";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  usePostMutationsTranslations,
  type UsePostMutationsTranslations,
} from "./usePostMutations.i18n";

export function useImportConversationFromCsvMutation() {
  const { importConversationFromCsv } = useBackendPostApi();
  const { showNotifyMessage } = useNotify();
  const router = useRouter();
  const { t } = useComponentI18n<UsePostMutationsTranslations>(
    usePostMutationsTranslations
  );

  return useMutation({
    mutationFn: (params: ImportConversationFromCsvParams) =>
      importConversationFromCsv(params),
    onSuccess: (data) => {
      showNotifyMessage(t("conversationImportedSuccessfully"));
      // Navigate to the new conversation
      void router.push({
        name: "/conversation/[postSlugId]",
        params: { postSlugId: data.conversationSlugId },
      });
    },
    onError: (error: AxiosErrorResponse) => {
      if (error?.code) {
        showNotifyMessage(getErrorMessage(error));
      } else {
        showNotifyMessage(t("failedToImportConversation"));
      }
    },
    retry: false, // No retry for file uploads
  });
}

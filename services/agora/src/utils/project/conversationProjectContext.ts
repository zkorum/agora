import type { ConversationProjectContext } from "src/shared/types/zod";
import type { ContentTranslationDisplayMode } from "src/utils/translation/contentTranslation";

export function getConversationProjectContextTitle({
  projectContext,
  titleMode,
}: {
  projectContext: ConversationProjectContext;
  titleMode: ContentTranslationDisplayMode;
}): string {
  if (titleMode === "translated") {
    return (
      projectContext.translatedProjectTitle ?? projectContext.originalProjectTitle
    );
  }

  return projectContext.originalProjectTitle;
}

import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import { groupLabelTranslations } from "./useGroupLabel.i18n";

export function useGroupLabel() {
  const { t } = useComponentI18n(groupLabelTranslations);
  return (label: string): string => t("group", { label });
}

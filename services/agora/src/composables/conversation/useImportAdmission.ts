import { useActiveImportQuery } from "src/utils/api/conversationImport/useConversationImportQueries";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

export function useImportAdmission({
  isLoggedIn,
  importType,
}: {
  isLoggedIn: MaybeRefOrGetter<boolean>;
  importType: MaybeRefOrGetter<"csv-import" | "polis-url" | null>;
}) {
  const isImportMode = computed(() => toValue(importType) !== null);
  const isImportAdmissionEnabled = computed(
    () => toValue(isLoggedIn) && isImportMode.value
  );
  const activeImportQuery = useActiveImportQuery({
    enabled: isImportAdmissionEnabled,
  });
  // Disabling a query preserves its cached data. Scope admission to the current
  // mode so visiting import creation cannot lock ordinary conversation creation.
  const hasActiveImport = computed(
    () =>
      isImportAdmissionEnabled.value &&
      (activeImportQuery.data.value?.hasActiveImport ?? false)
  );

  return { activeImportQuery, hasActiveImport };
}

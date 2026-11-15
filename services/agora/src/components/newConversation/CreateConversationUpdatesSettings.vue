<template>
  <template v-if="shouldShow">
    <ConversationControlButton
      :label="controlLabel"
      :icon="showDialog ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
      @click="showDialog = true"
    />

    <q-dialog v-model="showDialog" position="bottom">
      <ZKBottomDialogContainer
        :title="t('emailUpdates')"
        :subtitle="dialogSubtitle"
      >
        <q-list separator class="conversation-updates-settings__list">
          <q-item
            v-for="option in settingOptions"
            :key="option.id"
            clickable
            :disable="!option.enabled"
            @click="selectSetting(option.value)"
          >
            <q-item-section>
              <q-item-label>{{ option.title }}</q-item-label>
              <q-item-label caption>{{ option.description }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-radio
                :model-value="settingMode"
                :val="option.id"
                :aria-label="option.title"
                :disable="!option.enabled"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </ZKBottomDialogContainer>
    </q-dialog>
  </template>
</template>

<script setup lang="ts">
import ConversationControlButton from "src/components/newConversation/ConversationControlButton.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed, ref } from "vue";

import {
  type CreateConversationUpdatesSettingsTranslations,
  createConversationUpdatesSettingsTranslations,
} from "./CreateConversationUpdatesSettings.i18n";
import {
  canSelectConversationUpdatesSettingWithAccess,
  type ConversationUpdatesSettingAccess,
  shouldShowConversationUpdatesSettings,
} from "./createConversationUpdatesSettingsLogic";

const props = defineProps<{
  scopeKind: "project" | "no-project";
  projectTitle: string | undefined;
  scopeDefaultEnabled: boolean;
  access: ConversationUpdatesSettingAccess;
  hasParticipantContactEmail: boolean;
  mode: "create" | "edit";
}>();

type SettingMode = "inherit" | "off" | "on";
interface SettingOption {
  id: SettingMode;
  title: string;
  description: string;
  value: boolean | undefined;
  enabled: boolean;
}

const override = defineModel<boolean | undefined>({ required: true });
const showDialog = ref(false);
const { t } = useComponentI18n<CreateConversationUpdatesSettingsTranslations>(
  createConversationUpdatesSettingsTranslations
);

const shouldShow = computed(
  () =>
    props.access === "disable_only" ||
    shouldShowConversationUpdatesSettings({
      canConfigure: props.access === "configure",
      hasParticipantContactEmail: props.hasParticipantContactEmail,
      mode: props.mode,
    })
);
const displayEnabled = computed(
  () => override.value ?? props.scopeDefaultEnabled
);
const settingMode = computed<SettingMode>(() => {
  if (override.value === undefined) {
    return "inherit";
  }
  return override.value ? "on" : "off";
});
const dialogSubtitle = computed(() => t("manualUpdatesSubtitle"));
const controlLabel = computed(() => {
  const value = displayEnabled.value ? t("on") : t("off");
  const source =
    override.value === undefined ? t("defaultLabel") : t("override");
  return t("controlLabel", { value, source });
});
const settingOptions = computed<readonly SettingOption[]>(() => {
  const defaultValue = props.scopeDefaultEnabled ? t("on") : t("off");
  const scopeLabel =
    props.scopeKind === "project"
      ? (props.projectTitle ?? t("projectFallback"))
      : t("noProjectGroup");
  const defaultSource =
    props.scopeKind === "project" ? t("projectDefault") : t("noProjectDefault");
  const overrideDescription = t("overridesDescription", {
    defaultValue,
    scopeLabel,
  });
  const inheritEnabled = canSelectSetting(undefined);
  const onEnabled = canSelectSetting(true);
  const options: SettingOption[] = [
    {
      id: "inherit",
      title: t("useDefault", { source: defaultSource }),
      description: t("inheritsDescription", { defaultValue, scopeLabel }),
      value: undefined,
      enabled: inheritEnabled,
    },
    {
      id: "on",
      title: t("on"),
      description: overrideDescription,
      value: true,
      enabled: onEnabled,
    },
    {
      id: "off",
      title: t("off"),
      description: overrideDescription,
      value: false,
      enabled: canSelectSetting(false),
    },
  ];
  return options.filter((option) => option.enabled);
});

function canSelectSetting(value: boolean | undefined): boolean {
  return canSelectConversationUpdatesSettingWithAccess({
    access: props.access,
    hasParticipantContactEmail: props.hasParticipantContactEmail,
    scopeDefaultEnabled: props.scopeDefaultEnabled,
    value,
  });
}
function selectSetting(value: boolean | undefined): void {
  if (!canSelectSetting(value)) return;
  override.value = value;
  showDialog.value = false;
}
</script>

<style scoped lang="scss">
.conversation-updates-settings__list {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 18px;
  background: white;

  .q-item {
    min-height: 4.25rem;
    padding-block: 0.75rem;
  }
}
</style>

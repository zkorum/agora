<template>
  <PrimeCard class="test-section-card">
    <template #title>
      <div class="section-header">
        <i class="pi pi-language section-icon"></i>
        <span>Conversation language settings</span>
      </div>
    </template>
    <template #content>
      <p class="section-description">
        Open the real language settings bottom sheet with detected-language,
        additional-language, dynamic-translation, and entitlement scenarios.
      </p>

      <div class="scenario-grid">
        <PrimeButton
          v-for="scenario in scenarios"
          :key="scenario.id"
          :label="scenario.label"
          severity="secondary"
          outlined
          @click="openScenario(scenario)"
        />
      </div>

      <div class="current-state">
        <div class="current-state__title">Current test state</div>
        <div>Entitled: {{ canUseDynamicTranslation ? "yes" : "no" }}</div>
        <div>Detected: {{ detectedLanguageCode ?? "after publishing" }}</div>
        <div>
          Additional: {{ multilingualSetting.additionalLanguageCodes.join(", ") || "none" }}
        </div>
        <div>
          Dynamic Translation:
          {{ multilingualSetting.dynamicTranslationEnabled ? "on" : "off" }}
        </div>
      </div>
    </template>
  </PrimeCard>

  <ConversationLanguageSettingDialog
    v-model:show-dialog="showDialog"
    v-model:multilingual-setting="multilingualSetting"
    :can-use-dynamic-translation="canUseDynamicTranslation"
    :detected-language-code="detectedLanguageCode"
    :detected-source-language-code="detectedSourceLanguageCode"
    :detected-raw-language-code="detectedRawLanguageCode"
    :auto-detection-status="autoDetectionStatus"
  />
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import ConversationLanguageSettingDialog from "src/components/newConversation/dialog/ConversationLanguageSettingDialog.vue";
import type {
  SupportedDisplayLanguageCodes,
  SupportedSpokenLanguageCodes,
} from "src/shared/languages";
import type {
  AutoLanguageDetectionStatus,
  ConversationMultilingualSetting,
} from "src/shared/types/zod";
import { ref } from "vue";

defineOptions({
  components: {
    PrimeButton: Button,
    PrimeCard: Card,
  },
});

interface Scenario {
  id: string;
  label: string;
  canUseDynamicTranslation: boolean;
  detectedLanguageCode: SupportedDisplayLanguageCodes | null | undefined;
  detectedSourceLanguageCode: SupportedSpokenLanguageCodes | null | undefined;
  detectedRawLanguageCode: string | null | undefined;
  autoDetectionStatus: AutoLanguageDetectionStatus | undefined;
  multilingualSetting: ConversationMultilingualSetting;
}

const scenarios: Scenario[] = [
  {
    id: "before-publish",
    label: "Before publishing",
    canUseDynamicTranslation: true,
    detectedLanguageCode: undefined,
    detectedSourceLanguageCode: undefined,
    detectedRawLanguageCode: undefined,
    autoDetectionStatus: undefined,
    multilingualSetting: {
      dynamicTranslationEnabled: true,
      additionalLanguageCodes: ["fr", "ar"],
    },
  },
  {
    id: "detected-spanish",
    label: "Detected Spanish",
    canUseDynamicTranslation: true,
    detectedLanguageCode: "es",
    detectedSourceLanguageCode: "es",
    detectedRawLanguageCode: "es",
    autoDetectionStatus: "detected",
    multilingualSetting: {
      dynamicTranslationEnabled: true,
      additionalLanguageCodes: ["fr"],
    },
  },
  {
    id: "dedupe-detected",
    label: "Dedupe Spanish",
    canUseDynamicTranslation: true,
    detectedLanguageCode: "es",
    detectedSourceLanguageCode: "es",
    detectedRawLanguageCode: "es",
    autoDetectionStatus: "detected",
    multilingualSetting: {
      dynamicTranslationEnabled: true,
      additionalLanguageCodes: ["es", "fr"],
    },
  },
  {
    id: "unknown",
    label: "Not detected",
    canUseDynamicTranslation: true,
    detectedLanguageCode: null,
    detectedSourceLanguageCode: null,
    detectedRawLanguageCode: null,
    autoDetectionStatus: "stable_unknown",
    multilingualSetting: {
      dynamicTranslationEnabled: false,
      additionalLanguageCodes: ["fr"],
    },
  },
  {
    id: "locked",
    label: "No entitlement",
    canUseDynamicTranslation: false,
    detectedLanguageCode: undefined,
    detectedSourceLanguageCode: undefined,
    detectedRawLanguageCode: undefined,
    autoDetectionStatus: undefined,
    multilingualSetting: {
      dynamicTranslationEnabled: false,
      additionalLanguageCodes: [],
    },
  },
];

const showDialog = ref(false);
const multilingualSetting = ref<ConversationMultilingualSetting>({
  dynamicTranslationEnabled: true,
  additionalLanguageCodes: ["fr", "ar"],
});
const canUseDynamicTranslation = ref(true);
const detectedLanguageCode = ref<SupportedDisplayLanguageCodes | null | undefined>(
  undefined
);
const detectedSourceLanguageCode = ref<SupportedSpokenLanguageCodes | null | undefined>(
  undefined
);
const detectedRawLanguageCode = ref<string | null | undefined>(undefined);
const autoDetectionStatus = ref<AutoLanguageDetectionStatus | undefined>(
  undefined
);

function openScenario(scenario: Scenario): void {
  multilingualSetting.value = {
    dynamicTranslationEnabled:
      scenario.multilingualSetting.dynamicTranslationEnabled,
    additionalLanguageCodes: [
      ...scenario.multilingualSetting.additionalLanguageCodes,
    ],
  };
  canUseDynamicTranslation.value = scenario.canUseDynamicTranslation;
  detectedLanguageCode.value = scenario.detectedLanguageCode;
  detectedSourceLanguageCode.value = scenario.detectedSourceLanguageCode;
  detectedRawLanguageCode.value = scenario.detectedRawLanguageCode;
  autoDetectionStatus.value = scenario.autoDetectionStatus;
  showDialog.value = true;
}
</script>

<style scoped lang="scss">
.test-section-card {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);

  .section-icon {
    color: $primary;
  }
}

.section-description {
  margin: 0 0 1.25rem;
  color: $grey-8;
  font-size: 1rem;
  line-height: 1.5;
}

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.75rem;
}

.current-state {
  margin-top: 1.25rem;
  padding: 1rem;
  border-radius: 0.75rem;
  background: $grey-1;
  color: $grey-9;
  line-height: 1.6;
}

.current-state__title {
  margin-bottom: 0.35rem;
  font-weight: var(--font-weight-semibold);
}
</style>

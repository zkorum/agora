<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('administrator')" :center-content="true" />
  </Teleport>

  <div class="container">
    <ZKCard padding="1rem" class="card-background">
      <div class="section-title">{{ t("pageTitle") }}</div>

      <div class="form-grid">
        <q-select
          v-model="subjectType"
          outlined
          emit-value
          map-options
          :label="t('subjectTypeLabel')"
          :options="subjectTypeOptions"
        />

        <q-input
          v-if="subjectType === 'user'"
          v-model="username"
          outlined
          :label="t('usernameLabel')"
        />
        <q-input
          v-else
          v-model="organizationName"
          outlined
          :label="t('organizationNameLabel')"
        />

        <q-select
          v-model="features"
          outlined
          multiple
          emit-value
          map-options
          :label="t('featureLabel')"
          :options="featureOptions"
        />

        <q-input
          v-model="startsAt"
          outlined
          type="datetime-local"
          :label="t('startsAtLabel')"
        />

        <q-input
          v-model="expiresAt"
          outlined
          type="datetime-local"
          :label="t('expiresAtLabel')"
        />

        <q-input
          v-model="adminNote"
          outlined
          autogrow
          :label="t('adminNoteLabel')"
        />
      </div>

      <q-btn
        color="primary"
        no-caps
        :label="t('createButton')"
        :loading="isCreating"
        @click="createEntitlement"
      />
    </ZKCard>

    <ZKCard padding="1rem" class="card-background">
      <div class="section-title">{{ t("activeEntitlementsTitle") }}</div>
      <PageLoadingSpinner v-if="isLoading" />
      <div v-else-if="entitlements.length === 0" class="empty-state">
        {{ t("noEntitlements") }}
      </div>
      <div v-else class="entitlement-list">
        <div
          v-for="entitlement in entitlements"
          :key="entitlement.id"
          class="entitlement-row"
        >
          <div class="entitlement-main">
            <div class="entitlement-title">
              {{ getSubjectLabel(entitlement) }} · {{ getFeatureLabel(entitlement.feature) }}
            </div>
            <div class="entitlement-meta">
              {{ formatDate(entitlement.startsAt) }} →
              {{ entitlement.expiresAt ? formatDate(entitlement.expiresAt) : t("noExpiry") }}
            </div>
            <div v-if="entitlement.adminNote" class="entitlement-note">
              {{ entitlement.adminNote }}
            </div>
            <div v-if="entitlement.revokedAt" class="entitlement-revoked">
              {{ t("revokedLabel") }} · {{ formatDate(entitlement.revokedAt) }}
            </div>
          </div>

          <q-btn
            v-if="!entitlement.revokedAt"
            flat
            no-caps
            color="negative"
            :label="t('revokeButton')"
            :loading="revokingEntitlementId === entitlement.id"
            @click="revokeEntitlement(entitlement.id)"
          />
        </div>
      </div>
    </ZKCard>
  </div>
</template>

<script setup lang="ts">
import { StandardMenuBar } from "src/components/navigation/header/variants";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  CreatePremiumFeatureEntitlementRequest,
  PremiumFeatureEntitlementItem,
} from "src/shared/types/dto";
import type {
  GrantablePremiumFeature,
  PremiumFeature,
} from "src/shared/types/zod";
import { useBackendAdministratorPremiumEntitlementApi } from "src/utils/api/administrator/premiumEntitlement";
import { computed, onMounted, ref } from "vue";

import {
  type AdministratorPremiumEntitlementsTranslations,
  administratorPremiumEntitlementsTranslations,
} from "./index.i18n";

type SubjectType = "user" | "organization";

interface SelectOption<T extends string> {
  label: string;
  value: T;
}

const { isActive } = usePageLayout({ reducedWidth: true });
const { t } =
  useComponentI18n<AdministratorPremiumEntitlementsTranslations>(
    administratorPremiumEntitlementsTranslations
  );
const {
  listPremiumFeatureEntitlements,
  createPremiumFeatureEntitlement,
  revokePremiumFeatureEntitlement,
} = useBackendAdministratorPremiumEntitlementApi();

const entitlements = ref<PremiumFeatureEntitlementItem[]>([]);
const isLoading = ref(true);
const isCreating = ref(false);
const revokingEntitlementId = ref<number | null>(null);
const subjectType = ref<SubjectType>("user");
const username = ref<string | number | null>("");
const organizationName = ref<string | number | null>("");
const features = ref<GrantablePremiumFeature[]>(["survey"]);
const startsAt = ref<string | number | null>(toDateTimeLocal(new Date()));
const expiresAt = ref<string | number | null>("");
const adminNote = ref<string | number | null>("");

const subjectTypeOptions = computed<Array<SelectOption<SubjectType>>>(() => [
  { label: t("userLabel"), value: "user" },
  { label: t("organizationLabel"), value: "organization" },
]);

const featureOptions = computed<
  Array<SelectOption<GrantablePremiumFeature>>
>(() => [
  { label: t("surveyFeature"), value: "survey" },
  { label: t("eventTicketFeature"), value: "event_ticket" },
  { label: t("analysisVariantsFeature"), value: "analysis_variants" },
]);

onMounted(async () => {
  await refreshEntitlements();
});

function toDateTimeLocal(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleString();
}

function getInputString(value: string | number | null): string {
  if (value === null) {
    return "";
  }

  return String(value);
}

function getFeatureLabel(value: PremiumFeature): string {
  switch (value) {
    case "survey":
      return t("surveyFeature");
    case "event_ticket":
      return t("eventTicketFeature");
    case "analysis_variants":
      return t("analysisVariantsFeature");
  }
}

function getSubjectLabel(entitlement: PremiumFeatureEntitlementItem): string {
  if (entitlement.username !== undefined) {
    return entitlement.username;
  }

  if (entitlement.organizationName !== undefined) {
    return entitlement.organizationName;
  }

  return entitlement.userId ?? String(entitlement.organizationId ?? "");
}

async function refreshEntitlements(): Promise<void> {
  isLoading.value = true;
  entitlements.value = await listPremiumFeatureEntitlements();
  isLoading.value = false;
}

function buildCreateRequest(): CreatePremiumFeatureEntitlementRequest {
  const note = getInputString(adminNote.value).trim();
  const request: CreatePremiumFeatureEntitlementRequest = {
    subject:
      subjectType.value === "user"
        ? { username: getInputString(username.value).trim() }
        : { organizationName: getInputString(organizationName.value).trim() },
    features: features.value,
    startsAt: new Date(getInputString(startsAt.value)).toISOString(),
    expiresAt:
      getInputString(expiresAt.value) !== ""
        ? new Date(getInputString(expiresAt.value)).toISOString()
        : undefined,
    adminNote: note !== "" ? note : undefined,
  };

  return request;
}

async function createEntitlement(): Promise<void> {
  isCreating.value = true;
  const success = await createPremiumFeatureEntitlement({
    data: buildCreateRequest(),
  });
  isCreating.value = false;

  if (success) {
    await refreshEntitlements();
  }
}

async function revokeEntitlement(entitlementId: number): Promise<void> {
  revokingEntitlementId.value = entitlementId;
  const success = await revokePremiumFeatureEntitlement({
    data: { entitlementId },
  });
  revokingEntitlementId.value = null;

  if (success) {
    await refreshEntitlements();
  }
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-background {
  background-color: white;
}

.section-title {
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  margin-bottom: 1rem;
}

.form-grid {
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
}

.empty-state,
.entitlement-meta,
.entitlement-note {
  color: $color-text-weak;
}

.entitlement-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.entitlement-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding-block: 0.75rem;
  border-bottom: 1px solid $separator-color;
}

.entitlement-main {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.entitlement-title {
  font-weight: var(--font-weight-medium);
}

.entitlement-revoked {
  color: $negative;
}
</style>

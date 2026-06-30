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
        <ZKSelect
          v-else
          v-model="organizationSlugSelectModel"
          searchable
          :label="t('organizationNameLabel')"
          :loading="isLoadingOrganizations"
          :disable="isLoadingOrganizations"
          :options="organizationOptions"
        />

        <ZKSelect
          :model-value="features"
          :label="t('featureLabel')"
          :options="featureOptions"
          multiple
          @update:model-value="handleFeatureUpdate"
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
        :disable="!canCreateEntitlement"
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
              {{ getSubjectLabel(entitlement) }} ·
              {{ getFeatureLabel(entitlement.feature) }}
            </div>
            <div class="entitlement-meta">
              {{ formatDate(entitlement.startsAt) }} →
              {{
                entitlement.expiresAt
                  ? formatDate(entitlement.expiresAt)
                  : t("noExpiry")
              }}
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
import ZKSelect from "src/components/ui-library/ZKSelect.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  AdminOrganizationOption,
  CreatePremiumFeatureEntitlementRequest,
  PremiumFeatureEntitlementItem,
} from "src/shared/types/dto";
import type {
  GrantablePremiumFeature,
  PremiumFeature,
} from "src/shared/types/zod";
import { zodGrantablePremiumFeature, zodUsername } from "src/shared/types/zod";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { useBackendAdministratorPremiumEntitlementApi } from "src/utils/api/administrator/premiumEntitlement";
import { computed, onMounted, ref, watch } from "vue";

import {
  type AdministratorPremiumEntitlementsTranslations,
  administratorPremiumEntitlementsTranslations,
} from "./index.i18n";

type SubjectType = "user" | "organization";

interface SelectOption<T extends string> {
  label: string;
  value: T;
}

type ZKSelectModel = string | string[] | null;

const { isActive } = usePageLayout({ reducedWidth: true });
const { t } = useComponentI18n<AdministratorPremiumEntitlementsTranslations>(
  administratorPremiumEntitlementsTranslations
);
const {
  listPremiumFeatureEntitlements,
  createPremiumFeatureEntitlement,
  revokePremiumFeatureEntitlement,
} = useBackendAdministratorPremiumEntitlementApi();
const { getOrganizationOptions } = useBackendAdministratorOrganizationApi();

const entitlements = ref<PremiumFeatureEntitlementItem[]>([]);
const organizationList = ref<AdminOrganizationOption[]>([]);
const isLoading = ref(true);
const isLoadingOrganizations = ref(false);
const isCreating = ref(false);
const revokingEntitlementId = ref<number | null>(null);
const subjectType = ref<SubjectType>("user");
const username = ref<string | number | null>("");
const organizationSlug = ref<string | number | null>("");
const features = ref<GrantablePremiumFeature[]>([]);
const startsAt = ref<string | number | null>(toDateTimeLocal(new Date()));
const expiresAt = ref<string | number | null>("");
const adminNote = ref<string | number | null>("");

const subjectTypeOptions = computed<Array<SelectOption<SubjectType>>>(() => [
  { label: t("userLabel"), value: "user" },
  { label: t("organizationLabel"), value: "organization" },
]);

const featureOptions = computed<Array<SelectOption<GrantablePremiumFeature>>>(
  () => [
    { label: t("surveyFeature"), value: "survey" },
    { label: t("eventTicketFeature"), value: "event_ticket" },
    { label: t("analysisVariantsFeature"), value: "analysis_variants" },
    { label: t("dynamicTranslationFeature"), value: "dynamic_translation" },
  ]
);

const organizationOptions = computed<Array<SelectOption<string>>>(() =>
  organizationList.value.map((organization) => ({
    label: `${organization.name} (${organization.slug})`,
    value: organization.slug,
  }))
);

const organizationSlugSelectModel = computed<ZKSelectModel>({
  get: () => {
    const value = getInputString(organizationSlug.value);
    return value.length === 0 ? null : value;
  },
  set: (value) => {
    organizationSlug.value =
      typeof value === "string" && value.length > 0 ? value : null;
  },
});

const canCreateEntitlement = computed(() => {
  const subjectValue =
    subjectType.value === "user"
      ? getInputString(username.value).trim()
      : getInputString(organizationSlug.value).trim();
  const startsAtDate = parseInputDate(startsAt.value);
  const expiresAtValue = getInputString(expiresAt.value);
  const expiresAtDate =
    expiresAtValue !== "" ? parseInputDate(expiresAtValue) : undefined;

  const hasValidSubject =
    subjectType.value === "user"
      ? zodUsername.safeParse(subjectValue).success
      : subjectValue !== "" && !isLoadingOrganizations.value;
  const hasValidExpiresAt =
    expiresAtValue === "" || expiresAtDate !== undefined;
  const hasValidPeriod =
    startsAtDate !== undefined &&
    hasValidExpiresAt &&
    (expiresAtDate === undefined || expiresAtDate > startsAtDate);
  const hasOverlappingEntitlement =
    startsAtDate !== undefined &&
    entitlements.value.some((entitlement) =>
      isOverlappingSelectedEntitlement({
        entitlement,
        subjectValue,
        startsAt: startsAtDate,
        expiresAt: expiresAtDate,
      })
    );

  return (
    !isLoading.value &&
    hasValidSubject &&
    features.value.length > 0 &&
    hasValidPeriod &&
    !hasOverlappingEntitlement
  );
});

watch(subjectType, async (nextSubjectType) => {
  if (nextSubjectType === "organization") {
    await ensureOrganizationOptions();
  }
});

onMounted(async () => {
  await refreshEntitlements();
});

async function ensureOrganizationOptions(): Promise<void> {
  if (organizationList.value.length > 0 || isLoadingOrganizations.value) {
    return;
  }

  isLoadingOrganizations.value = true;
  try {
    organizationList.value = await getOrganizationOptions();
  } finally {
    isLoadingOrganizations.value = false;
  }
}

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

function parseInputDate(value: string | number | null): Date | undefined {
  const date = new Date(getInputString(value));
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function handleFeatureUpdate(value: string | string[] | null): void {
  if (!Array.isArray(value)) {
    features.value = [];
    return;
  }

  features.value = value.flatMap((feature) => {
    const parsedFeature = zodGrantablePremiumFeature.safeParse(feature);
    return parsedFeature.success ? [parsedFeature.data] : [];
  });
}

function isOverlappingSelectedEntitlement({
  entitlement,
  subjectValue,
  startsAt,
  expiresAt,
}: {
  entitlement: PremiumFeatureEntitlementItem;
  subjectValue: string;
  startsAt: Date;
  expiresAt: Date | undefined;
}): boolean {
  if (
    entitlement.revokedAt !== undefined ||
    !features.value.includes(entitlement.feature)
  ) {
    return false;
  }

  const matchesSubject =
    subjectType.value === "user"
      ? entitlement.username === subjectValue
      : organizationList.value.some(
          (organization) =>
            organization.slug === subjectValue &&
            entitlement.organizationName === organization.name
        );
  if (!matchesSubject) {
    return false;
  }

  const entitlementStartsAt = new Date(entitlement.startsAt);
  const entitlementExpiresAt =
    entitlement.expiresAt !== undefined
      ? new Date(entitlement.expiresAt)
      : undefined;

  return (
    (entitlementExpiresAt === undefined || entitlementExpiresAt > startsAt) &&
    (expiresAt === undefined || entitlementStartsAt < expiresAt)
  );
}

function getFeatureLabel(value: PremiumFeature): string {
  switch (value) {
    case "survey":
      return t("surveyFeature");
    case "event_ticket":
      return t("eventTicketFeature");
    case "analysis_variants":
      return t("analysisVariantsFeature");
    case "dynamic_translation":
      return t("dynamicTranslationFeature");
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
        : { organizationName: getInputString(organizationSlug.value).trim() },
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
  if (!canCreateEntitlement.value || isCreating.value) {
    return;
  }

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
  padding-bottom: max(3rem, calc(env(safe-area-inset-bottom) + 2rem));
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

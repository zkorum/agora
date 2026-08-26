<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar
      title="Email Updates dev fixture"
      :center-content="true"
      fallback-route="/dev/component-testing"
    />
  </Teleport>

  <main class="conversation-updates-dev">
    <q-card flat bordered class="conversation-updates-dev__controls">
      <q-card-section>
        <p class="conversation-updates-dev__eyebrow">Local-only fixture</p>
        <h1>Email Updates</h1>
        <p>
          Exercise the composer and recipient-facing states without sending or
          writing to the API.
        </p>
      </q-card-section>
      <q-card-actions>
        <ZKButton
          button-type="standardButton"
          outline
          color="primary"
          label="Preference menu"
          icon="mdi-dots-horizontal"
          @click="showPreferenceDialog = true"
        />
        <SpaLink to="/email-updates/?tab=compose">
          Open real workspace
        </SpaLink>
        <SpaLink to="/settings/account/email-updates/">
          Open real preferences
        </SpaLink>
      </q-card-actions>
      <q-card-section>
        <q-btn-toggle
          v-model="onboardingScopeKind"
          unelevated
          no-caps
          toggle-color="primary"
          color="white"
          text-color="primary"
          :options="onboardingScopeOptions"
        />
        <ConversationUpdateOnboardingConsent
          v-model="onboardingConsent"
          :scope-kind="onboardingScopeKind"
        />
      </q-card-section>
    </q-card>

    <section class="conversation-updates-dev__grid">
      <ConversationUpdateComposerForm
        v-model:selected-scope-id="selectedScopeId"
        v-model:selected-conversation-ids="selectedConversationIds"
        v-model:subject="subject"
        v-model:body-html="bodyHtml"
        v-model:body-plain-text="bodyPlainText"
        v-model:content-confirmed="contentConfirmed"
        :scopes="scopes"
        :updates-disabled-conversation-ids="[]"
        :test-pending="false"
        :send-pending="false"
        :has-successful-test="hasSuccessfulTest"
        :audience-estimate-state="{
          kind: 'ready',
          eligibleParticipantCount: 1842,
          ownerCopyCount: 1,
        }"
        test-destination-email="facilitator@example.org"
        @test="simulateTest"
      >
        <template #preview>
          <div v-if="$q.screen.lt.md" class="conversation-updates-dev__preview">
            <ConversationUpdateEmailPreview
              :subject="subject"
              :body-html="bodyHtml"
              reply-to="facilitator@example.org"
              scope-kind="project"
              scope-href="/dev/project-page"
              scope-label="River Commons"
              :conversations="selectedConversations"
              :audience-estimate="1842"
            />
          </div>
        </template>
      </ConversationUpdateComposerForm>

      <div v-if="!$q.screen.lt.md" class="conversation-updates-dev__preview">
        <ConversationUpdateEmailPreview
          :subject="subject"
          :body-html="bodyHtml"
          reply-to="facilitator@example.org"
          scope-kind="project"
          scope-href="/dev/project-page"
          scope-label="River Commons"
          :conversations="selectedConversations"
          :audience-estimate="1842"
        />
      </div>
    </section>

    <ConversationUpdateHistoryList :records="historyRecords" />

    <section class="conversation-updates-dev__recipient-preferences">
      <div class="conversation-updates-dev__recipient-heading">
        <div>
          <p class="conversation-updates-dev__eyebrow">Auth-free email link</p>
          <h2>Recipient preference manager</h2>
          <p>
            This is the same component recipients see after opening “Manage
            preferences” from an email.
          </p>
        </div>
        <q-btn-toggle
          v-model="recipientPreferenceScenario"
          unelevated
          no-caps
          toggle-color="primary"
          color="white"
          text-color="primary"
          :options="recipientPreferenceScenarioOptions"
        />
      </div>
      <ConversationUpdateAuthFreePreferenceManager
        :items="recipientPreferenceItems"
        :pending-key="undefined"
        :error-key="undefined"
        :successful-keys="recipientSuccessfulKeys"
        :translate="translateRecipientPreference"
        @opt-out="simulateRecipientOptOut"
      />
    </section>
  </main>

  <ZKActionDialog
    v-model="showPreferenceDialog"
    title="Conversation actions"
    :actions="preferenceActions"
    @action-selected="handlePreferenceAction"
  />
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import type { ManageOptOutItem } from "src/components/conversationUpdates/authFreePreferenceManager";
import ConversationUpdateAuthFreePreferenceManager from "src/components/conversationUpdates/ConversationUpdateAuthFreePreferenceManager.vue";
import ConversationUpdateComposerForm from "src/components/conversationUpdates/ConversationUpdateComposerForm.vue";
import ConversationUpdateEmailPreview from "src/components/conversationUpdates/ConversationUpdateEmailPreview.vue";
import ConversationUpdateHistoryList from "src/components/conversationUpdates/ConversationUpdateHistoryList.vue";
import ConversationUpdateOnboardingConsent from "src/components/conversationUpdates/ConversationUpdateOnboardingConsent.vue";
import { createConversationUpdatePreferenceAction } from "src/components/conversationUpdates/conversationUpdatePreferenceAction";
import type {
  ConversationUpdateHistoryRecord,
  ConversationUpdateScopeSummary,
} from "src/components/conversationUpdates/conversationUpdateTypes";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKActionDialog from "src/components/ui-library/ZKActionDialog.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  ContentAction,
  ContentActionContext,
} from "src/utils/actions/core/types";
import { computed, ref } from "vue";

import {
  type EmailUpdatePreferencesTranslations,
  emailUpdatePreferencesTranslations,
} from "../email-updates/preferences/[token].i18n";

const { isActive } = usePageLayout({
  enableDrawer: false,
  enableFooter: false,
  reducedWidth: false,
  addBottomPadding: true,
});
const $q = useQuasar();
const { t: translateRecipientPreference } =
  useComponentI18n<EmailUpdatePreferencesTranslations>(
    emailUpdatePreferencesTranslations
  );

type RecipientPreferenceScenario =
  | "no-project-multiple"
  | "no-project-single"
  | "project-multiple"
  | "project-single";
const recipientPreferenceScenarioOptions: {
  label: string;
  value: RecipientPreferenceScenario;
}[] = [
  { label: "Project + multiple", value: "project-multiple" },
  { label: "Project + one", value: "project-single" },
  { label: "No Project + multiple", value: "no-project-multiple" },
  { label: "No Project + one", value: "no-project-single" },
];
const recipientPreferenceScenario =
  ref<RecipientPreferenceScenario>("project-multiple");
const projectPreferenceItem: ManageOptOutItem = {
  key: "project:river-commons",
  title: "River Commons",
  target: { kind: "project", projectSlug: "river-commons" },
  type: "project",
};
const conversationPreferenceItems: readonly ManageOptOutItem[] = [
  {
    key: "conversation:river-plan",
    title: "Choose the river restoration plan",
    target: { kind: "conversation", conversationSlugId: "river-plan" },
    type: "conversation",
  },
  {
    key: "conversation:park-design",
    title: "Prioritize the new park design",
    target: { kind: "conversation", conversationSlugId: "park-design" },
    type: "conversation",
  },
];
const recipientPreferenceItems = computed<readonly ManageOptOutItem[]>(() => {
  const selectedConversations = recipientPreferenceScenario.value.endsWith(
    "multiple"
  )
    ? conversationPreferenceItems
    : conversationPreferenceItems.slice(0, 1);
  return recipientPreferenceScenario.value.startsWith("project")
    ? [projectPreferenceItem, ...selectedConversations]
    : selectedConversations;
});
const recipientSuccessfulKeys = ref<ReadonlySet<string>>(new Set());

const conversations = [
  {
    id: "river-plan",
    title: "Choose the river restoration plan",
    href: "/dev/project-conversation-layout",
    eligibleParticipantCount: 1240,
    participationMode: "account_required",
    ownerIds: ["facilitator-one"],
  },
  {
    id: "park-design",
    title: "Prioritize the new park design",
    href: "/dev/project-conversation-layout",
    eligibleParticipantCount: 602,
    participationMode: "email_verification",
    ownerIds: ["facilitator-two"],
  },
] satisfies ConversationUpdateScopeSummary["conversations"];
const scopes = [
  {
    id: "river-commons",
    kind: "project",
    label: "River Commons",
    href: "/dev/project-page",
    contactEmail: "facilitator@example.org",
    eligibleParticipantCap: 5000,
    conversations,
  },
] satisfies readonly ConversationUpdateScopeSummary[];
const historyRecords = [
  {
    id: "fixture-update",
    subject: "What we heard in July",
    bodyHtml:
      "<p>Thank you for helping prioritize the next phase of the River Commons project.</p>",
    scopeId: "river-commons",
    scopeKind: "project",
    scopeLabel: "River Commons",
    scopeHref: "/dev/project-page",
    conversations,
    audienceEstimate: 1842,
    ownerCopyCount: 1,
    acceptedAt: new Date("2026-07-18T12:00:00.000Z"),
    status: "completed",
    reason: undefined,
  },
] satisfies readonly ConversationUpdateHistoryRecord[];

const selectedScopeId = ref("river-commons");
const selectedConversationIds = ref<readonly string[]>([
  "river-plan",
  "park-design",
]);
const subject = ref("What we heard and what happens next");
const bodyHtml = ref(
  "<p>Thank you for taking part. Your priorities are shaping the next project phase.</p>"
);
const bodyPlainText = ref(
  "Thank you for taking part. Your priorities are shaping the next project phase."
);
const contentConfirmed = ref(false);
const onboardingConsent = ref(true);
const onboardingScopeKind = ref<"no-project" | "project">("project");
const onboardingScopeOptions: Array<{
  label: string;
  value: "no-project" | "project";
}> = [
  { label: "Project preference", value: "project" },
  { label: "Conversation preference", value: "no-project" },
];
const hasSuccessfulTest = ref(false);
const showPreferenceDialog = ref(false);
const preferenceEnabled = ref(false);
const selectedConversations = computed(() => {
  const selectedIds = new Set(selectedConversationIds.value);
  return conversations.filter((conversation) =>
    selectedIds.has(conversation.id)
  );
});
const preferenceActions = computed(() => [
  createConversationUpdatePreferenceAction({
    id: "conversationEmailUpdates",
    label: "Receive Email Updates",
    enabled: preferenceEnabled.value,
    onToggle: () => {
      preferenceEnabled.value = !preferenceEnabled.value;
    },
  }),
]);
const actionContext: ContentActionContext = {
  isOwner: false,
  isSiteModerator: false,
  isConversationOwner: false,
  isOrgMember: false,
  isLoggedIn: true,
  isEmbeddedMode: false,
  targetType: "post",
  targetId: "fixture",
  targetAuthor: "Fixture",
};

function simulateTest(): void {
  hasSuccessfulTest.value = true;
}

function simulateRecipientOptOut(item: ManageOptOutItem): void {
  recipientSuccessfulKeys.value = new Set([
    ...recipientSuccessfulKeys.value,
    item.key,
  ]);
}

async function handlePreferenceAction(action: ContentAction): Promise<void> {
  if (action.handler !== undefined) {
    await action.handler(actionContext);
  }
}
</script>

<style scoped lang="scss">
.conversation-updates-dev {
  display: grid;
  gap: 1.5rem;
  width: min(78rem, calc(100% - 2rem));
  margin: 0 auto;
  padding-block: 1.5rem 3rem;
}

.conversation-updates-dev__controls {
  border-radius: 1rem;

  h1 {
    margin: 0.2rem 0 0.5rem;
    font-size: clamp(1.5rem, 4vw, 2.2rem);
  }

  p {
    margin: 0;
  }

  :deep(.q-card__actions) {
    align-items: center;
    gap: 1rem;
    padding: 0 1rem 1rem;
  }
}

.conversation-updates-dev__eyebrow {
  color: $primary;
  font-size: 0.75rem;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.conversation-updates-dev__grid {
  display: grid;
  gap: 1.5rem;
}

.conversation-updates-dev__recipient-preferences {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid $grey-4;
  border-radius: 1rem;
  background: $color-background-default;
}

.conversation-updates-dev__recipient-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;

  h2 {
    margin: 0.2rem 0 0.5rem;
  }

  p {
    margin: 0;
  }
}

@media (min-width: $breakpoint-md-min) {
  .conversation-updates-dev__grid {
    grid-template-columns: minmax(0, 1fr) minmax(22rem, 0.8fr);
    align-items: start;
  }
}
</style>

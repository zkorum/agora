<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar
      title="Email Updates prototype"
      :center-content="true"
      fallback-route="/dev/component-testing"
    />
  </Teleport>

  <main class="prototype">
    <ZKInfoBanner
      message="Prototype only: nothing on this page is saved and no email is sent. Every action is simulated in this browser tab."
    />

    <section class="prototype__hero">
      <div>
        <span>Product test surface</span>
        <h1>Bring participants back with context, not campaigns.</h1>
        <p>
          Exercise project scope, composition, enrollment, personalized
          conversation context, and delivery history without touching an API or
          provider.
        </p>
      </div>
    </section>

    <q-card flat bordered class="prototype__entry-points">
      <q-card-section>
        <div>
          <strong>Mock entry points</strong>
          <p>
            Assume the current user is an owner. Composer entries only appear
            when their project or conversation has Email Updates On.
          </p>
        </div>
        <div class="prototype__entry-actions">
          <q-btn
            v-if="projectPageComposerAvailable"
            outline
            no-caps
            color="primary"
            icon="mdi-folder-outline"
            label="Project page entry"
            @click="simulateProjectEntry"
          />
          <q-btn
            v-if="conversationPageComposerAvailable"
            outline
            no-caps
            color="primary"
            icon="mdi-forum-outline"
            label="Conversation page entry"
            @click="simulateConversationEntry"
          />
          <q-btn
            v-if="projectConversationComposerAvailable"
            outline
            no-caps
            color="primary"
            icon="mdi-folder-message-outline"
            label="Project-conversation entry"
            @click="simulateProjectConversationEntry"
          />
        </div>
        <small class="prototype__entry-hint">
          Project entry preselects only the project. Conversation entries also
          preselect the current conversation.
        </small>
      </q-card-section>
    </q-card>

    <q-tabs
      :model-value="activeTab"
      dense
      no-caps
      align="left"
      active-color="primary"
      indicator-color="primary"
      class="prototype__tabs"
      @update:model-value="updateActiveTab"
    >
      <q-tab
        name="compose"
        icon="mdi-email-edit-outline"
        label="Compose"
        :disable="!composerAvailableForCurrentScope"
      />
      <q-tab
        name="onboarding"
        icon="mdi-checkbox-marked-outline"
        label="Onboarding"
      />
      <q-tab name="preferences" icon="mdi-tune-variant" label="Preferences" />
      <q-tab name="activation" icon="mdi-cog-outline" label="Defaults" />
      <q-tab name="history" icon="mdi-history" label="History" />
    </q-tabs>

    <q-tab-panels
      :model-value="activeTab"
      animated
      class="prototype__panels"
      @update:model-value="updateActiveTab"
    >
      <q-tab-panel name="compose" class="prototype__panel">
        <div class="prototype__compose-grid">
          <ConversationUpdateComposerForm
            v-model:selected-scope-id="selectedScopeId"
            v-model:selected-conversation-ids="selectedConversationIds"
            v-model:subject="subject"
            v-model:body-html="bodyHtml"
            v-model:body-plain-text="bodyPlainText"
            v-model:content-confirmed="contentConfirmed"
            :scopes="prototypeScopes"
            :updates-disabled-conversation-ids="updatesDisabledConversationIds"
            :simulation-mode="false"
            :notice="simulationNotice"
            :has-successful-test="hasSuccessfulTest"
            :related-conversation-owner-count="relatedConversationOwnerCount"
            @test="simulateTestEmail"
            @send="showSendDialog = true"
          />

          <div class="prototype__preview-column">
            <ConversationUpdateEmailPreview
              :subject="subject"
              :body-html="bodyHtml"
              :reply-to="currentScope?.contactEmail ?? ''"
              :scope-kind="currentScope?.kind ?? 'project'"
              :scope-href="currentScope?.href"
              :scope-label="currentScope?.label ?? ''"
              :conversations="selectedConversations"
              :audience-estimate="audienceEstimate"
            />
          </div>
        </div>
      </q-tab-panel>

      <q-tab-panel name="onboarding" class="prototype__panel">
        <div class="prototype__onboarding-layout">
          <q-card flat bordered class="prototype__scenario-controls">
            <q-card-section>
              <p>Onboarding simulation</p>
              <q-btn-toggle
                v-model="onboardingContext"
                class="prototype__context-toggle"
                spread
                no-caps
                unelevated
                toggle-color="primary"
                color="white"
                text-color="primary"
                :options="onboardingContextOptions"
              />
              <small class="prototype__entry-path-description">
                {{ onboardingEntryPathDescription }}
              </small>
              <ZKSearchableBottomSheetSelect
                :model-value="onboardingConversationId"
                :options="onboardingConversationOptions"
                label="Conversation being joined"
                dialog-title="Choose an onboarding conversation"
                search-mode="always"
                @update:model-value="updateOnboardingConversation"
              />
              <label>
                <span>
                  <strong>Participant has verified email</strong>
                  <small
                    >Phone-only, Rarimo-only, and email-less guests see no
                    prompt.</small
                  >
                </span>
                <ZKSwitch v-model="hasVerifiedEmail" />
              </label>
              <div class="prototype__preference-state">
                <span>
                  <strong>Applicable saved preference</strong>
                  <small>{{ onboardingPreferenceLabel }}</small>
                </span>
                <ZKButton
                  v-if="onboardingPreferenceState !== 'undisclosed'"
                  button-type="compactButton"
                  flat
                  color="primary"
                  label="Reset to unanswered"
                  @click="resetOnboardingPreference"
                />
              </div>
            </q-card-section>
          </q-card>

          <ConversationOnboardingCompleteStep
            v-if="
              onboardingControlsAvailable &&
              onboardingConversation !== undefined
            "
            v-model:conversation-updates-checked="onboardingConsentChecked"
            title="You are ready to participate"
            description=""
            review-answers-label="Review onboarding answers"
            :show-conversation-updates-preference="true"
            :scope-kind="currentScope?.kind ?? 'no-project'"
            :is-saving="false"
            @continue="simulateCompleteOnboarding"
            @review-answers="simulateReviewOnboardingAnswers"
          />

          <div v-else class="prototype__hidden-state">
            <q-icon name="mdi-eye-off-outline" size="1.5rem" />
            <strong>Participant-visible Email Updates UI: none</strong>
            <span>{{ onboardingHiddenReason }}</span>
          </div>
        </div>
      </q-tab-panel>

      <q-tab-panel name="preferences" class="prototype__panel">
        <div class="prototype__preferences-layout">
          <q-card flat bordered class="prototype__menu-demo">
            <q-card-section>
              <div>
                <span>Project page</span>
                <strong>{{ currentScope?.label ?? "Project" }}</strong>
              </div>
              <ZKButton
                v-if="currentScope?.kind === 'project'"
                button-type="icon"
                flat
                icon="mdi-dots-vertical"
                aria-label="Open project menu"
                @click="openPreferenceActions('project')"
              />
              <span v-else class="prototype__no-project-note">
                No Project has no project page or project menu.
              </span>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="prototype__menu-demo">
            <q-card-section>
              <div>
                <span>Conversation page</span>
                <strong>{{
                  selectedConversations.at(0)?.title ?? "Choose a conversation"
                }}</strong>
              </div>
              <ZKButton
                button-type="icon"
                flat
                icon="mdi-dots-vertical"
                aria-label="Open conversation menu"
                :disable="selectedConversations.length === 0"
                @click="openPreferenceActions('conversation')"
              />
            </q-card-section>
          </q-card>

          <q-card flat bordered class="prototype__scenario-controls">
            <q-card-section>
              <p>Availability simulation</p>
              <label>
                <span>
                  <strong>Participant has verified email</strong>
                  <small
                    >Without one, neither menu shows an update action.</small
                  >
                </span>
                <ZKSwitch v-model="hasVerifiedEmail" />
              </label>
            </q-card-section>
          </q-card>
        </div>
      </q-tab-panel>

      <q-tab-panel name="activation" class="prototype__panel">
        <div class="prototype__activation-layout">
          <div class="prototype__activation-surfaces">
            <section
              v-if="
                currentScope !== undefined && hasConversationUpdatesEntitlement
              "
              class="prototype__administration-surface"
            >
              <div class="prototype__surface-heading">
                <span>{{ projectManageSurfaceLabel }}</span>
                <strong>{{ projectManageSurfaceTitle }}</strong>
                <small>
                  {{ projectManageSurfaceDescription }}
                </small>
              </div>
              <ProjectConversationUpdatesActivation
                v-model="currentProjectDefaultEnabled"
                :activation-kind="
                  currentScope.kind === 'project'
                    ? 'listed-project'
                    : 'no-project-container'
                "
                :project-title="currentScope.label"
                :has-participant-contact-email="
                  currentScope.contactEmail.length > 0
                "
                :has-entitlement="hasConversationUpdatesEntitlement"
                @edit-contact="simulateEditParticipantContact"
              />
            </section>

            <section class="prototype__administration-surface">
              <div class="prototype__surface-heading">
                <span>Conversation create/edit · owner</span>
                <strong>Conversation-level setting</strong>
                <small>
                  Test inherited defaults, owner overrides, and limited email
                  reach inside the complete new-conversation page fixture.
                </small>
              </div>
              <q-card flat bordered class="prototype__conversation-create-demo">
                <q-card-section>
                  <SpaLink
                    to="/dev/conversation-updates-new-conversation"
                    class="prototype__new-conversation-link"
                  >
                    <span>Open real new-conversation page fixture</span>
                    <q-icon name="mdi-arrow-right" />
                  </SpaLink>
                </q-card-section>
              </q-card>
            </section>

            <div
              v-if="!hasConversationUpdatesEntitlement"
              class="prototype__hidden-state"
            >
              <q-icon name="mdi-eye-off-outline" size="1.5rem" />
              <strong>Email Updates settings: not rendered</strong>
              <span>
                Without entitlement, Project Manage and the new-conversation
                page render no Email Updates controls.
              </span>
            </div>
          </div>

          <q-card flat bordered class="prototype__scenario-controls">
            <q-card-section>
              <p>Configuration simulation</p>
              <ZKSearchableBottomSheetSelect
                :model-value="selectedScopeId"
                :options="activationScopeOptions"
                label="Manage scope fixture"
                dialog-title="Choose a Manage scope"
                search-mode="always"
                @update:model-value="updateActivationScope"
              />
              <label>
                <span>
                  <strong>Owner organization has entitlement</strong>
                  <small>
                    Entitlement reveals the feature. Project defaults decide
                    whether conversations start On or Off.
                  </small>
                </span>
                <ZKSwitch v-model="hasConversationUpdatesEntitlement" />
              </label>
            </q-card-section>
          </q-card>
        </div>
      </q-tab-panel>

      <q-tab-panel name="history" class="prototype__panel">
        <ConversationUpdateHistoryList
          :records="history"
          :simulation-mode="true"
          @advance="simulateAdvanceStatus"
        />
      </q-tab-panel>
    </q-tab-panels>
  </main>

  <ZKConfirmDialog
    v-model="showSendDialog"
    title="Send this update?"
    confirm-text="Send update"
    cancel-text="Cancel"
    @confirm="simulateSend"
  >
    <div class="prototype__send-summary">
      <strong
        >About {{ formattedAudienceEstimate }} eligible participants</strong
      >
      <div>
        <strong>Selected conversations</strong>
        <ul>
          <li v-for="conversation in selectedConversations" :key="conversation.id">
            {{ conversation.title }}
          </li>
        </ul>
      </div>
      <ul>
        <li>
          <q-icon name="mdi-check-circle-outline" />
          No advertising, fundraising, political campaigning, or unrelated
          promotion.
        </li>
        <li>
          <q-icon name="mdi-account-tie-outline" />
          {{ ownerCopyConfirmationMessage }}
        </li>
        <li>
          <q-icon name="mdi-account-off-outline" />
          People who opt out before delivery are skipped.
        </li>
        <li v-if="selectedScopeHasPartialEmailReach">
          <q-icon name="mdi-email-alert-outline" />
          These conversations do not require email. Only participants who
          voluntarily verified an email in Settings and opted in can receive
          this update.
        </li>
        <li>
          <q-icon name="mdi-alert-outline" />
          Sending cannot be stopped or canceled.
        </li>
      </ul>
    </div>
  </ZKConfirmDialog>

  <ZKActionDialog
    v-model="showPreferenceActionDialog"
    :actions="preferenceDialogActions"
    @action-selected="handlePreferenceActionSelected"
  />
</template>

<script setup lang="ts">
import ProjectConversationUpdatesActivation from "src/components/administrator/project/ProjectConversationUpdatesActivation.vue";
import ConversationUpdateComposerForm from "src/components/conversationUpdates/ConversationUpdateComposerForm.vue";
import ConversationUpdateEmailPreview from "src/components/conversationUpdates/ConversationUpdateEmailPreview.vue";
import ConversationUpdateHistoryList from "src/components/conversationUpdates/ConversationUpdateHistoryList.vue";
import { createConversationUpdatePreferenceAction } from "src/components/conversationUpdates/conversationUpdatePreferenceAction";
import type {
  ConversationUpdateConversationSummary,
  ConversationUpdateHistoryRecord,
  ConversationUpdatePreferenceState,
  ConversationUpdatePreferenceSummary,
} from "src/components/conversationUpdates/conversationUpdateTypes";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import { hasConversationUpdatesPartialEmailReach } from "src/components/newConversation/conversationUpdatesParticipation";
import ConversationOnboardingCompleteStep from "src/components/onboarding/ConversationOnboardingCompleteStep.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKActionDialog from "src/components/ui-library/ZKActionDialog.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import ZKSearchableBottomSheetSelect from "src/components/ui-library/ZKSearchableBottomSheetSelect.vue";
import ZKSwitch from "src/components/ui-library/ZKSwitch.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import type {
  ContentAction,
  ContentActionContext,
} from "src/utils/actions/core/types";
import { computed, ref, watch } from "vue";

import {
  advancePrototypeStatus,
  countRelatedConversationOwners,
  createPrototypeRevisionKey,
  enableOnlyPrototypeConversationInProject,
  estimatePrototypeAudience,
  getEffectivePrototypeConversationPreference,
  getInitialConversationIds,
  getSelectedConversations,
  initialPrototypeHistory,
  isPrototypeConversationUpdateEffective,
  prototypeScopes,
} from "./conversationUpdatesPrototype";

type PrototypeTab =
  | "activation"
  | "compose"
  | "history"
  | "onboarding"
  | "preferences";
type PrototypeOnboardingEntryPath =
  | "already-verified"
  | "email-just-verified"
  | "survey-completed";
interface PrototypeProjectPreference {
  readonly projectId: string;
  readonly state: ConversationUpdatePreferenceState;
}

const { isActive } = usePageLayout({
  enableDrawer: false,
  enableFooter: false,
  reducedWidth: false,
  addBottomPadding: true,
});

const initialScope = prototypeScopes.at(0);
const selectedScopeId = ref(initialScope?.id ?? "");
const selectedConversationIds = ref<readonly string[]>(
  getInitialConversationIds(initialScope)
);
const subject = ref("A quick update on our heat resilience work");
const bodyHtml = ref(
  "<p>Thank you for sharing your priorities with us.</p><p>We have combined your input with the latest neighborhood heat data and are preparing the next round of workshops.</p>"
);
const bodyPlainText = ref(
  "Thank you for sharing your priorities with us. We have combined your input with the latest neighborhood heat data and are preparing the next round of workshops."
);
const contentConfirmed = ref(false);
const activeTab = ref<PrototypeTab>("activation");
const showSendDialog = ref(false);
const showPreferenceActionDialog = ref(false);
const activePreferenceActionTarget = ref<"conversation" | "project">(
  "conversation"
);
const simulationNotice = ref<string | undefined>(undefined);
const successfullyTestedRevisionKey = ref<string | undefined>(undefined);
const history = ref<readonly ConversationUpdateHistoryRecord[]>([
  ...initialPrototypeHistory,
]);
const nextRecordNumber = ref(1);
const hasConversationUpdatesEntitlement = ref(true);
const projectDefaultById = ref<Readonly<Record<string, boolean>>>({
  "project-harbor-heat": false,
  "project-night-transit": false,
  "no-project": false,
});
const conversationDefaultOverrideById = ref<
  Readonly<Record<string, boolean | undefined>>
>({});
const hasVerifiedEmail = ref(true);
const onboardingConversationId = ref(
  initialScope?.conversations.at(0)?.id ?? ""
);
const onboardingConsentChecked = ref(true);
const onboardingContext = ref<PrototypeOnboardingEntryPath>("already-verified");
const onboardingContextOptions: {
  label: string;
  value: PrototypeOnboardingEntryPath;
}[] = [
  { label: "Already verified", value: "already-verified" },
  { label: "Email just verified", value: "email-just-verified" },
  { label: "Survey completed", value: "survey-completed" },
];
const prototypeActionContext: ContentActionContext = {
  isOwner: false,
  isSiteModerator: false,
  isConversationOwner: false,
  isOrgMember: false,
  isLoggedIn: true,
  isEmbeddedMode: false,
  targetType: "post",
  targetId: "conversation-updates-prototype",
  targetAuthor: "prototype",
};
const projectPreferences = ref<readonly PrototypeProjectPreference[]>(
  prototypeScopes
    .filter((scope) => scope.kind === "project")
    .map((scope) => ({ projectId: scope.id, state: "undisclosed" }))
);
const conversationPreferences = ref<
  readonly ConversationUpdatePreferenceSummary[]
>(
  prototypeScopes.flatMap((scope) =>
    scope.conversations.map((conversation) => ({
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      state: "undisclosed",
    }))
  )
);

const currentScope = computed(() =>
  prototypeScopes.find((scope) => scope.id === selectedScopeId.value)
);
const selectedConversations = computed(() =>
  getSelectedConversations({
    scope: currentScope.value,
    selectedConversationIds: selectedConversationIds.value,
  })
);
const currentProjectDefaultEnabled = computed({
  get: () => {
    const scope = currentScope.value;
    return scope === undefined
      ? false
      : (projectDefaultById.value[scope.id] ?? false);
  },
  set: (enabled: boolean) => {
    const scope = currentScope.value;
    if (scope === undefined) {
      return;
    }
    projectDefaultById.value = {
      ...projectDefaultById.value,
      [scope.id]: enabled,
    };
  },
});
const activationScopeOptions = computed(() =>
  prototypeScopes.map((scope) => ({
    label: scope.label,
    value: scope.id,
    caption:
      scope.kind === "project"
        ? "Listed project Manage fixture"
        : "Hidden auto-provisioned project Manage fixture",
  }))
);
const projectManageSurfaceLabel = computed(
  () => "Project Manage · site organization admin"
);
const projectManageSurfaceTitle = computed(
  () => currentScope.value?.label ?? "Selected project"
);
const projectManageSurfaceDescription = computed(() =>
  currentScope.value?.kind === "no-project"
    ? "This default applies only to conversations created without a listed project."
    : "This default applies only to the selected project. Choose another Manage scope to edit its independent default."
);
const updatesDisabledConversationIds = computed(() =>
  prototypeScopes.flatMap((scope) =>
    scope.conversations
      .filter(
        (conversation) =>
          !isConversationActivationEffective({ scope, conversation })
      )
      .map((conversation) => conversation.id)
  )
);
const projectEntryScope = computed(() =>
  prototypeScopes.find((scope) => scope.id === "project-harbor-heat")
);
const conversationEntryScope = computed(() =>
  prototypeScopes.find((scope) => scope.kind === "no-project")
);
const projectPageComposerAvailable = computed(() => {
  const scope = projectEntryScope.value;
  return (
    scope?.conversations.some((conversation) =>
      isConversationActivationEffective({ scope, conversation })
    ) ?? false
  );
});
const projectConversationComposerAvailable = computed(() => {
  const scope = projectEntryScope.value;
  const conversation = scope?.conversations.at(0);
  return scope !== undefined && conversation !== undefined
    ? isConversationActivationEffective({ scope, conversation })
    : false;
});
const conversationPageComposerAvailable = computed(() => {
  const scope = conversationEntryScope.value;
  const conversation = scope?.conversations.at(0);
  return scope !== undefined && conversation !== undefined
    ? isConversationActivationEffective({ scope, conversation })
    : false;
});
const composerAvailableForCurrentScope = computed(() => {
  const scope = currentScope.value;
  return (
    scope?.conversations.some((conversation) =>
      isConversationActivationEffective({ scope, conversation })
    ) ?? false
  );
});
const onboardingConversation = computed(() =>
  currentScope.value?.conversations.find(
    (conversation) => conversation.id === onboardingConversationId.value
  )
);
const currentProjectPreferenceState =
  computed<ConversationUpdatePreferenceState>(
    () =>
      projectPreferences.value.find(
        (preference) => preference.projectId === currentScope.value?.id
      )?.state ?? "undisclosed"
  );
const projectPreferenceEnabled = computed({
  get: () => currentProjectPreferenceState.value === "enabled",
  set: (enabled: boolean) => {
    const projectId = currentScope.value?.id;
    if (projectId === undefined) {
      return;
    }
    projectPreferences.value = projectPreferences.value.map((preference) =>
      preference.projectId === projectId
        ? { ...preference, state: enabled ? "enabled" : "disabled" }
        : preference
    );
  },
});
const onboardingControlsAvailable = computed(
  () =>
    onboardingConversation.value !== undefined &&
    currentScope.value !== undefined &&
    isConversationActivationEffective({
      scope: currentScope.value,
      conversation: onboardingConversation.value,
    }) &&
    hasVerifiedEmail.value &&
    onboardingPreferenceState.value === "undisclosed"
);
const projectPreferenceControlsAvailable = computed(() => {
  const scope = currentScope.value;
  return (
    hasConversationUpdatesEntitlement.value &&
    hasVerifiedEmail.value &&
    scope?.kind === "project" &&
    scope.conversations.some((conversation) =>
      isConversationActivationEffective({ scope, conversation })
    )
  );
});
const conversationPreferenceControlsAvailable = computed(
  () =>
    hasVerifiedEmail.value &&
    currentScope.value !== undefined &&
    selectedConversations.value.at(0) !== undefined &&
    isConversationActivationEffective({
      scope: currentScope.value,
      conversation: selectedConversations.value[0],
    })
);
const onboardingHiddenReason = computed(() => {
  if (!hasConversationUpdatesEntitlement.value) {
    return "No owner organization currently provides Email Updates access.";
  }
  if (
    currentScope.value !== undefined &&
    onboardingConversation.value !== undefined &&
    !isConversationActivationEffective({
      scope: currentScope.value,
      conversation: onboardingConversation.value,
    })
  ) {
    return "An administrator or owner has not enabled Email Updates for this conversation; onboarding continues normally.";
  }
  if (!hasVerifiedEmail.value) {
    return "Phone-only, Rarimo-only, and other participants without verified email continue without an email preference prompt.";
  }
  if (onboardingPreferenceState.value === "enabled") {
    return "This participant already subscribed, so the existing flow continues without another prompt.";
  }
  return "This participant previously declined, so the existing flow continues without repeating the automatic prompt. They can opt in from the project or conversation menu.";
});
const onboardingPreferenceState = computed<ConversationUpdatePreferenceState>(
  () => {
    if (currentScope.value?.kind === "project") {
      return currentProjectPreferenceState.value;
    }
    return (
      conversationPreferences.value.find(
        (preference) =>
          preference.conversationId === onboardingConversationId.value
      )?.state ?? "undisclosed"
    );
  }
);
const onboardingPreferenceLabel = computed(() => {
  if (onboardingPreferenceState.value === "undisclosed") {
    return "Unanswered: show the one-time prompt";
  }
  if (onboardingPreferenceState.value === "enabled") {
    return "On: already subscribed, so do not prompt";
  }
  return "Off: previously declined, so do not prompt again";
});
const onboardingEntryPathDescription = computed(() => {
  if (onboardingContext.value === "already-verified") {
    return "No survey: the resolver reuses the existing completion step instead of exiting immediately.";
  }
  if (onboardingContext.value === "email-just-verified") {
    return "After verification: credential refresh reaches the same completion step.";
  }
  return "After the final survey answer: the existing completion page shows this component.";
});
const onboardingConversationOptions = computed(
  () =>
    currentScope.value?.conversations.map((conversation) => ({
      label: conversation.title,
      value: conversation.id,
    })) ?? []
);
const selectedConversationPreferenceEnabled = computed(() => {
  const conversationId = selectedConversations.value.at(0)?.id;
  const conversationState =
    conversationPreferences.value.find(
      (item) => item.conversationId === conversationId
    )?.state ?? "undisclosed";
  return getEffectivePrototypeConversationPreference({
    scopeKind: currentScope.value?.kind ?? "no-project",
    projectState: currentProjectPreferenceState.value,
    conversationState,
  });
});
const preferenceDialogActions = computed<ContentAction[]>(() => {
  const target = activePreferenceActionTarget.value;
  const shareAction: ContentAction = {
    id: target === "project" ? "shareProject" : "shareConversation",
    label: target === "project" ? "Share project" : "Share conversation",
    icon: "mdi-share-variant",
    handler: () => {
      simulationNotice.value = `${target === "project" ? "Project" : "Conversation"} sharing simulated.`;
    },
    isVisible: () => true,
  };
  if (
    (target === "project" && !projectPreferenceControlsAvailable.value) ||
    (target === "conversation" &&
      !conversationPreferenceControlsAvailable.value)
  ) {
    return [shareAction];
  }
  const preferenceAction = createConversationUpdatePreferenceAction({
    label:
      target === "project"
        ? "Email updates for this project"
        : "Email updates for this conversation",
    enabled:
      target === "project"
        ? projectPreferenceEnabled.value
        : selectedConversationPreferenceEnabled.value,
    description:
      target === "conversation" &&
      currentScope.value?.kind === "project" &&
      currentProjectPreferenceState.value !== "enabled" &&
      !selectedConversationPreferenceEnabled.value
        ? "Turn on updates for this conversation only"
        : undefined,
    onToggle:
      target === "project"
        ? toggleProjectPreference
        : toggleSelectedConversationPreference,
  });
  return [shareAction, preferenceAction];
});
const audienceEstimate = computed(() =>
  estimatePrototypeAudience({
    scope: currentScope.value,
    selectedConversationIds: selectedConversationIds.value,
  })
);
const relatedConversationOwnerCount = computed(() =>
  countRelatedConversationOwners({
    scope: currentScope.value,
    selectedConversationIds: selectedConversationIds.value,
  })
);
const currentRevisionKey = computed(() =>
  createPrototypeRevisionKey({
    scopeId: selectedScopeId.value,
    contactEmail: currentScope.value?.contactEmail ?? "",
    selectedConversationIds: selectedConversationIds.value,
    subject: subject.value,
    bodyHtml: bodyHtml.value,
  })
);
const hasSuccessfulTest = computed(
  () => successfullyTestedRevisionKey.value === currentRevisionKey.value
);
const formattedAudienceEstimate = computed(() =>
  new Intl.NumberFormat().format(audienceEstimate.value)
);
const ownerCopyConfirmationMessage = computed(() => {
  const count = relatedConversationOwnerCount.value;
  const ownerLabel = count === 1 ? "owner" : "owners";
  return `The real update will first be sent to ${String(count)} conversation ${ownerLabel}. Participant delivery begins after those copies are accepted by the email provider.`;
});
const selectedScopeHasPartialEmailReach = computed(() =>
  selectedConversations.value.some((conversation) =>
    hasConversationUpdatesPartialEmailReach(conversation.participationMode)
  )
);
watch(currentScope, (scope) => {
  onboardingConversationId.value = scope?.conversations.at(0)?.id ?? "";
});
watch(
  [selectedConversationIds, updatesDisabledConversationIds],
  ([conversationIds, disabledConversationIds]) => {
    const enabledConversationIds = conversationIds.filter(
      (conversationId) => !disabledConversationIds.includes(conversationId)
    );
    if (enabledConversationIds.length !== conversationIds.length) {
      selectedConversationIds.value = enabledConversationIds;
    }
  }
);
watch(
  onboardingPreferenceState,
  (state) => {
    onboardingConsentChecked.value = getOnboardingCheckedState(state);
  },
  { immediate: true }
);
watch(composerAvailableForCurrentScope, (isAvailable) => {
  if (!isAvailable && activeTab.value === "compose") {
    activeTab.value = "activation";
  }
});

function simulateProjectEntry(): void {
  const scope = projectEntryScope.value;
  if (scope === undefined || !projectPageComposerAvailable.value) {
    return;
  }
  selectedScopeId.value = scope.id;
  selectedConversationIds.value = [];
  activeTab.value = "compose";
  simulationNotice.value = `Project page entry: ${scope.label} selected with no conversations preselected.`;
}

function simulateConversationEntry(): void {
  const scope = conversationEntryScope.value;
  if (scope === undefined || !conversationPageComposerAvailable.value) {
    return;
  }
  selectedScopeId.value = scope.id;
  selectedConversationIds.value = getInitialConversationIds(scope);
  activeTab.value = "compose";
  simulationNotice.value =
    "Conversation page entry: No Project and the current conversation are preselected.";
}

function simulateProjectConversationEntry(): void {
  const scope = projectEntryScope.value;
  if (scope === undefined || !projectConversationComposerAvailable.value) {
    return;
  }
  selectedScopeId.value = scope.id;
  selectedConversationIds.value = getInitialConversationIds(scope);
  activeTab.value = "compose";
  simulationNotice.value =
    "Project-conversation entry: the project and current conversation are preselected.";
}

function simulateEditParticipantContact(): void {
  simulationNotice.value =
    "The production Project Manage page would move focus to its participant contact editor.";
}

function simulateTestEmail(): void {
  successfullyTestedRevisionKey.value = currentRevisionKey.value;
  simulationNotice.value = undefined;
}

function simulateSend(): void {
  const scope = currentScope.value;
  if (
    scope === undefined ||
    selectedConversations.value.length === 0 ||
    !hasSuccessfulTest.value
  ) {
    return;
  }

  const record: ConversationUpdateHistoryRecord = {
    id: `simulated-update-${String(nextRecordNumber.value)}`,
    subject: subject.value,
    bodyHtml: bodyHtml.value,
    scopeKind: scope.kind,
    scopeLabel: scope.label,
    scopeHref: scope.href,
    conversations: selectedConversations.value.map((conversation) => ({
      title: conversation.title,
      href: conversation.href,
    })),
    audienceEstimate: audienceEstimate.value,
    ownerCopyCount: relatedConversationOwnerCount.value,
    createdAtLabel: new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date()),
    status: "preparing",
    reason: undefined,
  };

  nextRecordNumber.value += 1;
  successfullyTestedRevisionKey.value = undefined;
  contentConfirmed.value = false;
  history.value = [record, ...history.value];
  simulationNotice.value = "Update accepted into local simulated preparation.";
  activeTab.value = "history";
}

function simulateAdvanceStatus(recordId: string): void {
  const record = history.value.find((item) => item.id === recordId);
  if (record === undefined) {
    return;
  }
  history.value = advancePrototypeStatus({
    records: history.value,
    recordId,
  });
}

function simulateCompleteOnboarding(): void {
  const conversation = onboardingConversation.value;
  const scope = currentScope.value;
  if (conversation === undefined || scope === undefined) {
    return;
  }
  const state = onboardingConsentChecked.value ? "enabled" : "disabled";
  if (scope.kind === "project") {
    projectPreferences.value = projectPreferences.value.map((preference) =>
      preference.projectId === scope.id ? { ...preference, state } : preference
    );
    simulationNotice.value = `Saved the local ${state} project preference for ${scope.label}.`;
    return;
  }
  conversationPreferences.value = conversationPreferences.value.map(
    (preference) =>
      preference.conversationId === conversation.id
        ? { ...preference, state }
        : preference
  );
  simulationNotice.value = `Saved the local ${state} conversation preference for ${conversation.title}.`;
}

function simulateReviewOnboardingAnswers(): void {
  simulationNotice.value = "Review onboarding answers simulated.";
}

function resetOnboardingPreference(): void {
  const conversation = onboardingConversation.value;
  const scope = currentScope.value;
  if (conversation === undefined || scope === undefined) {
    return;
  }
  if (scope.kind === "project") {
    projectPreferences.value = projectPreferences.value.map((preference) =>
      preference.projectId === scope.id
        ? { ...preference, state: "undisclosed" }
        : preference
    );
    return;
  }
  conversationPreferences.value = conversationPreferences.value.map(
    (preference) =>
      preference.conversationId === conversation.id
        ? { ...preference, state: "undisclosed" }
        : preference
  );
}

function toggleProjectPreference(): void {
  projectPreferenceEnabled.value = !projectPreferenceEnabled.value;
}

function openPreferenceActions(target: "conversation" | "project"): void {
  activePreferenceActionTarget.value = target;
  showPreferenceActionDialog.value = true;
}

async function handlePreferenceActionSelected(
  action: ContentAction
): Promise<void> {
  await action.handler(prototypeActionContext);
}

function toggleSelectedConversationPreference(): void {
  const conversationId = selectedConversations.value.at(0)?.id;
  const scope = currentScope.value;
  if (conversationId === undefined || scope === undefined) {
    return;
  }
  if (
    scope.kind === "project" &&
    !selectedConversationPreferenceEnabled.value &&
    currentProjectPreferenceState.value !== "enabled"
  ) {
    const projectConversationIds = new Set(
      scope.conversations.map((conversation) => conversation.id)
    );
    const transition = enableOnlyPrototypeConversationInProject({
      conversationPreferences: conversationPreferences.value,
      projectConversationIds,
      selectedConversationId: conversationId,
    });
    projectPreferenceEnabled.value = transition.projectState === "enabled";
    conversationPreferences.value = transition.conversationPreferences;
    simulationNotice.value =
      "Email updates are on for this conversation only. Other conversations in the project are off.";
    return;
  }
  const state = selectedConversationPreferenceEnabled.value
    ? "disabled"
    : "enabled";
  conversationPreferences.value = conversationPreferences.value.map(
    (preference) =>
      preference.conversationId === conversationId
        ? { ...preference, state }
        : preference
  );
}

function updateOnboardingConversation(value: string | readonly string[]): void {
  if (typeof value !== "string") {
    return;
  }
  onboardingConversationId.value = value;
}

function updateActivationScope(value: string | readonly string[]): void {
  if (typeof value !== "string") {
    return;
  }
  selectedScopeId.value = value;
  selectedConversationIds.value = [];
}

function isConversationActivationEffective({
  scope,
  conversation,
}: {
  scope: (typeof prototypeScopes)[number];
  conversation: ConversationUpdateConversationSummary;
}): boolean {
  return isPrototypeConversationUpdateEffective({
    hasEntitlement: hasConversationUpdatesEntitlement.value,
    projectDefaultEnabled: projectDefaultById.value[scope.id] ?? false,
    conversationOverride:
      conversationDefaultOverrideById.value[conversation.id],
  });
}

function getOnboardingCheckedState(
  state: ConversationUpdatePreferenceState
): boolean {
  return state !== "disabled";
}

function updateActiveTab(value: string | number): void {
  if (
    value === "compose" ||
    value === "activation" ||
    value === "onboarding" ||
    value === "preferences" ||
    value === "history"
  ) {
    activeTab.value = value;
  }
}
</script>

<style scoped lang="scss">
.prototype {
  width: min(76rem, calc(100% - 2rem));
  margin: 0 auto;
  padding-block: 1.25rem 3rem;

  &__hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 2rem;
    padding-block: clamp(2rem, 6vw, 4.5rem) 2rem;

    > div:first-child {
      max-width: 46rem;
    }

    span {
      color: $primary;
      font-size: 0.78rem;
      font-weight: var(--font-weight-semibold);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0.55rem 0 0;
      color: $color-text-strong;
      font-size: clamp(2rem, 6vw, 4.4rem);
      line-height: 0.98;
      letter-spacing: -0.04em;
    }

    p {
      max-width: 40rem;
      margin: 1.25rem 0 0;
      color: $grey-8;
      font-size: 1rem;
      line-height: 1.6;
    }
  }

  &__entry-points {
    border-radius: 1rem;

    .q-card__section {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 1rem;
    }

    p {
      margin: 0.25rem 0 0;
      color: $grey-7;
      font-size: 0.8rem;
    }
  }

  &__entry-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  &__entry-hint {
    grid-column: 1 / -1;
    color: $grey-7;
    line-height: 1.4;
  }

  &__tabs {
    margin-block-start: 1.5rem;
    border-bottom: 1px solid $grey-4;
  }

  &__panels,
  &__panel {
    padding: 0;
    background: transparent;
  }

  &__panel {
    padding-block-start: 1.5rem;
  }

  &__compose-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.92fr);
    align-items: start;
    gap: 1.5rem;
  }

  &__preview-column {
    position: sticky;
    top: 1rem;
    min-width: 0;
    padding: clamp(0.75rem, 2vw, 1.5rem);
    border-radius: 1.25rem;
    background: linear-gradient(145deg, #f2efff, #eef7ff);
  }

  &__onboarding-layout {
    display: grid;
    grid-template-columns: minmax(15rem, 0.55fr) minmax(0, 1fr);
    align-items: start;
    gap: 1.5rem;
  }

  &__activation-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(15rem, 0.55fr);
    align-items: start;
    gap: 1.5rem;
  }

  &__activation-surfaces,
  &__administration-surface,
  &__surface-heading {
    display: grid;
  }

  &__activation-surfaces {
    gap: 1.5rem;
  }

  &__administration-surface {
    gap: 0.75rem;
  }

  &__surface-heading {
    gap: 0.2rem;

    span {
      color: $primary;
      font-size: 0.72rem;
      font-weight: var(--font-weight-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    strong {
      color: $color-text-strong;
      font-size: 1rem;
    }

    small {
      color: $grey-7;
      line-height: 1.4;
    }
  }

  &__conversation-create-demo {
    border-radius: 1rem;

    .q-card__section {
      display: grid;
      gap: 1rem;
    }
  }

  &__new-conversation-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 3rem;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid rgba($primary, 0.35);
    border-radius: 0.75rem;
    color: $primary;
    font-weight: var(--font-weight-medium);
  }

  &__hidden-state {
    display: grid;
    justify-items: start;
    gap: 0.45rem;
    padding: 1.5rem;
    border: 1px dashed $grey-5;
    border-radius: 1rem;
    color: $grey-7;

    strong {
      color: $color-text-strong;
    }
  }

  &__preferences-layout {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 1rem;

    .prototype__scenario-controls {
      grid-column: 1 / -1;
    }
  }

  &__menu-demo {
    border-radius: 1rem;

    .q-card__section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 5.5rem;
      gap: 1rem;
    }

    .q-card__section > div:first-child {
      display: grid;
      min-width: 0;
      gap: 0.2rem;

      span {
        color: $grey-7;
        font-size: 0.72rem;
      }

      strong {
        overflow: hidden;
        color: $color-text-strong;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  &__no-project-note {
    max-width: 14rem;
    color: $grey-7;
    font-size: 0.75rem;
    line-height: 1.35;
    text-align: end;
  }

  &__scenario-controls {
    border-radius: 1rem;

    .q-card__section {
      display: grid;
      gap: 1rem;
    }

    p {
      margin: 0;
      color: $grey-7;
      font-size: 0.75rem;
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
    }

    label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding-block-start: 1rem;
      border-top: 1px solid $grey-4;

      span {
        display: grid;
        gap: 0.2rem;
      }

      small {
        color: $grey-7;
        line-height: 1.35;
      }
    }
  }

  &__context-toggle {
    :deep(.q-btn) {
      min-height: 2.75rem;
      padding-inline: 0.35rem;
      font-size: 0.72rem;
      line-height: 1.2;
    }
  }

  &__entry-path-description {
    margin-block-start: -0.5rem;
    color: $grey-7;
    line-height: 1.4;
  }

  &__preference-state {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-block-start: 1rem;
    border-top: 1px solid $grey-4;

    > span {
      display: grid;
      gap: 0.2rem;
    }

    small {
      color: $grey-7;
      line-height: 1.35;
    }
  }

  &__send-summary {
    display: grid;
    gap: 0.8rem;

    strong {
      color: $color-text-strong;
      font-size: 0.95rem;
    }

    ul {
      display: grid;
      gap: 0.65rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: start;
      gap: 0.55rem;
      color: $grey-8;
      font-size: 0.85rem;
      line-height: 1.4;
    }

    .q-icon {
      margin-block-start: 0.08rem;
      color: $primary;
      font-size: 1rem;
    }
  }
}

@media (max-width: 900px) {
  .prototype {
    &__hero {
      align-items: flex-start;
      flex-direction: column;
    }

    &__compose-grid,
    &__activation-layout,
    &__onboarding-layout,
    &__preferences-layout {
      grid-template-columns: minmax(0, 1fr);
    }

    &__preferences-layout .prototype__scenario-controls {
      grid-column: auto;
    }

    &__preview-column {
      position: static;
    }
  }
}

@media (max-width: $breakpoint-xs-max) {
  .prototype {
    width: min(100%, calc(100% - 1rem));

    &__entry-points .q-card__section {
      grid-template-columns: 1fr;
      align-items: stretch;
    }

    &__entry-actions {
      display: grid;
      justify-content: stretch;

      .q-btn {
        width: 100%;
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .prototype__panels :deep(.q-transition--slide-left-enter-active),
  .prototype__panels :deep(.q-transition--slide-right-enter-active) {
    transition: none;
  }
}
</style>

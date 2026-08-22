<template>
  <q-card flat bordered class="email-preview">
    <q-card-section class="email-preview__heading">
      <div>
        <p class="email-preview__eyebrow">Email preview</p>
        <h2>{{ subject || "Your update subject" }}</h2>
      </div>
      <ZKChip color="muted">About {{ formattedAudience }} recipients</ZKChip>
    </q-card-section>

    <q-separator />

    <q-card-section class="email-preview__metadata">
      <div>
        <strong>From</strong> Agora
        &lt;conversation@updates.agoracitizen.network&gt;
      </div>
      <div><strong>Reply to</strong> {{ replyTo }}</div>
    </q-card-section>

    <q-card-section class="email-preview__body">
      <ZKHtmlContent
        v-if="bodyHtml.length > 0"
        :html-body="bodyHtml"
        :compact-mode="false"
        :enable-links="false"
        :collapsible="false"
      />
      <p v-else class="email-preview__placeholder">
        Your message will appear here as you write.
      </p>

      <div class="email-preview__conversations">
        <div
          v-if="conversations.length > 0"
          class="email-preview__conversation-scope"
          :class="{
            'email-preview__conversation-scope--project':
              scopeKind === 'project',
          }"
        >
          <SpaLink
            v-if="scopeKind === 'project' && scopeHref !== undefined"
            :to="scopeHref"
            class="email-preview__scope-link"
          >
            <strong>{{ scopeLabel }}</strong>
            <q-icon name="mdi-open-in-new" size="1rem" />
          </SpaLink>
          <ul>
            <li v-for="conversation in conversations" :key="conversation.id">
              <SpaLink
                :to="conversation.href"
                class="email-preview__conversation-link"
              >
                <span>{{ conversation.title }}</span>
                <q-icon name="mdi-open-in-new" size="1rem" />
              </SpaLink>
            </li>
          </ul>
        </div>
        <p v-else class="email-preview__placeholder">
          Select a conversation to continue.
        </p>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section class="email-preview__footer">
      <div class="email-preview__preference-links">
        <span v-if="unsubscribeScopeName !== undefined">
          {{ t("unsubscribeFrom", { name: unsubscribeScopeName }) }}
        </span>
        <span>{{ t("managePreferences") }}</span>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import type { ConversationUpdateConversationSummary } from "src/components/conversationUpdates/conversationUpdateTypes";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKChip from "src/components/ui-library/ZKChip.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed } from "vue";

import {
  type ConversationUpdateEmailPreviewTranslations,
  conversationUpdateEmailPreviewTranslations,
} from "./ConversationUpdateEmailPreview.i18n";
import { getConversationUpdateUnsubscribeScopeName } from "./conversationUpdateLogic";

const props = defineProps<{
  subject: string;
  bodyHtml: string;
  replyTo: string;
  scopeKind: "no-project" | "project";
  scopeHref: string | undefined;
  scopeLabel: string;
  conversations: readonly ConversationUpdateConversationSummary[];
  audienceEstimate: number;
}>();

const { t } = useComponentI18n<ConversationUpdateEmailPreviewTranslations>(
  conversationUpdateEmailPreviewTranslations
);

const formattedAudience = computed(() =>
  new Intl.NumberFormat().format(props.audienceEstimate)
);
const unsubscribeScopeName = computed(() =>
  getConversationUpdateUnsubscribeScopeName({
    scopeKind: props.scopeKind,
    scopeLabel: props.scopeLabel,
    conversations: props.conversations,
  })
);
</script>

<style scoped lang="scss">
.email-preview {
  overflow: hidden;
  border-radius: 1rem;
  background: $color-background-default;

  &__heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;

    h2 {
      margin: 0.25rem 0 0;
      color: $color-text-strong;
      font-size: clamp(1.15rem, 3vw, 1.45rem);
      line-height: 1.25;
    }
  }

  &__eyebrow {
    margin: 0;
    color: $grey-7;
    font-size: 0.72rem;
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__metadata {
    display: grid;
    gap: 0.4rem;
    color: $grey-8;
    font-size: 0.78rem;

    strong {
      display: inline-block;
      min-width: 4.5rem;
      color: $color-text-strong;
    }
  }

  &__body {
    display: grid;
    min-height: 18rem;
    gap: 1.5rem;
    padding-block: 1.75rem;
  }

  &__placeholder {
    margin: 0;
    color: $grey-7;
  }

  &__conversations {
    align-self: end;
    padding: 1rem;
    border: 1px solid $grey-4;
    border-radius: 0.75rem;
    background: $grey-1;

    ul {
      display: grid;
      gap: 0.7rem;
      margin: 0.8rem 0 0;
      padding: 0;
      list-style: none;
    }

    li {
      list-style: none;
    }
  }

  &__scope-link,
  &__conversation-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    color: $primary;
    font-weight: var(--font-weight-medium);
  }

  &__scope-link {
    font-size: 0.9rem;
  }

  &__conversation-scope--project > ul {
    margin-inline-start: 0.4rem;
    padding-inline-start: 0.75rem;
    border-inline-start: 2px solid rgba($primary, 0.24);
  }

  &__footer {
    color: $grey-7;
    font-size: 0.72rem;
    line-height: 1.5;
  }

  &__preference-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.8rem;

    span {
      color: $primary;
      text-decoration: underline;
      text-underline-offset: 0.15rem;
    }
  }
}

@media (max-width: $breakpoint-xs-max) {
  .email-preview__heading {
    flex-direction: column;
  }
}
</style>

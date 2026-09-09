<template>
  <q-card flat bordered class="email-preview">
    <q-card-section class="email-preview__heading">
      <div>
        <p class="email-preview__eyebrow">{{ t("emailPreview") }}</p>
        <h2>{{ review.preview.subject }}</h2>
      </div>
      <ZKChip color="muted">{{ audienceLabel }}</ZKChip>
    </q-card-section>
    <q-separator />
    <q-card-section class="email-preview__metadata">
      <p>
        <strong>{{ tReview("sender") }}</strong> {{ review.senderName }}
      </p>
      <p>
        <strong>{{ t("replyToLabel") }}</strong> {{ review.replyToName }} &lt;{{
          review.replyToEmail
        }}&gt;
      </p>
      <p>
        <strong>{{ tReview("language") }}</strong> {{ review.language }}
      </p>
      <p>
        {{
          tReview(
            review.unsubscribeScope === "project"
              ? "unsubscribeProject"
              : "unsubscribeConversation"
          )
        }}
      </p>
      <p>
        {{
          tReview("expires", { date: review.expiresAt.toLocaleString(locale) })
        }}
      </p>
    </q-card-section>
    <ConversationEmailViewer
      :email="review.preview"
      :title="t('emailPreview')"
      :language="review.language"
    />
  </q-card>
</template>

<script setup lang="ts">
import ZKChip from "src/components/ui-library/ZKChip.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { Dto } from "src/shared/types/dto";
import { computed } from "vue";

import ConversationEmailViewer from "./ConversationEmailViewer.vue";
import {
  type ConversationUpdateEmailPreviewTranslations,
  conversationUpdateEmailPreviewTranslations,
} from "./ConversationUpdateEmailPreview.i18n";
import { conversationUpdateReviewTranslations } from "./ConversationUpdateReview.i18n";

const props = defineProps<{
  review: Extract<
    ReturnType<typeof Dto.conversationEmailUpdatePrepareDraftResponse.parse>,
    { success: true }
  >["review"];
}>();

const { t, locale } =
  useComponentI18n<ConversationUpdateEmailPreviewTranslations>(
    conversationUpdateEmailPreviewTranslations
  );
const { t: tReview } = useComponentI18n(conversationUpdateReviewTranslations);
const audienceLabel = computed(() =>
  t(
    props.review.estimatedEligibleRecipientCount === 1
      ? "eligibleRecipientSingular"
      : "eligibleRecipientPlural",
    {
      count: new Intl.NumberFormat(locale.value).format(
        props.review.estimatedEligibleRecipientCount
      ),
    }
  )
);
</script>

<style scoped lang="scss">
.email-preview {
  min-width: 0;
  overflow: hidden;
  border-radius: 1rem;
  background: $color-background-default;

  &__heading {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;

    h2 {
      margin: 0.25rem 0 0;
      color: $color-text-strong;
      font-size: clamp(1.15rem, 3vw, 1.45rem);
      line-height: 1.25;
      overflow-wrap: anywhere;
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
    color: $grey-8;
    font-size: 0.78rem;
    overflow-wrap: anywhere;
  }
}
</style>

<template>
  <div v-if="isVisible" class="featured-banner">
    <ZKIcon
      name="mdi:star-outline"
      size="1.25rem"
      color="#6b4eff"
    />
    <router-link :to="conversationUrl" class="banner-link">
      {{ t("message") }}
    </router-link>
    <button class="dismiss-button" @click="dismiss">
      <ZKIcon name="mdi:close" size="1rem" color="#836bff" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { processEnv } from "src/utils/processEnv";
import { computed, ref } from "vue";

import ZKIcon from "../ui-library/ZKIcon.vue";
import {
  type FeaturedConversationBannerTranslations,
  featuredConversationBannerTranslations,
} from "./FeaturedConversationBanner.i18n";

const { t } = useComponentI18n<FeaturedConversationBannerTranslations>(
  featuredConversationBannerTranslations
);

const slug = processEnv.VITE_FEATURED_CONVERSATION_SLUG;
const storageKey = `featuredConvBanner:${slug}:dismissed`;

const dismissed = ref(
  slug ? sessionStorage.getItem(storageKey) === "true" : true
);

const isVisible = computed(() => {
  return Boolean(slug) && !dismissed.value;
});

const conversationUrl = computed(() => `/conversation/${slug}`);

function dismiss() {
  dismissed.value = true;
  if (slug) {
    sessionStorage.setItem(storageKey, "true");
  }
}
</script>

<style scoped lang="scss">
.featured-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background-color: rgba($primary, 0.06);
  border: 1px solid rgba($primary, 0.2);
  border-radius: 8px;
  margin: 0.5rem 1rem;
}

.banner-link {
  flex: 1;
  color: $color-text-strong;
  font-size: 0.95rem;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    color: $primary;
  }
}

.dismiss-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  border-radius: 4px;

  &:hover {
    background-color: rgba($primary, 0.1);
  }
}
</style>

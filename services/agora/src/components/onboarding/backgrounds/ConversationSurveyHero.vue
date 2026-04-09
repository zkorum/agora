<template>
  <div class="hero" :class="{ 'hero--compact': compact }">
    <div class="hero__content">
      <div class="hero__avatar">
        <DynamicProfileImage
          :user-identity="ownerIdentity"
          :organization-image-url="organizationImageUrl || undefined"
          :size="avatarSize"
        />
      </div>

      <UserMetadata
        v-if="ownerIdentity.length > 0"
        class="hero__owner"
        :show-is-guest="false"
        :user-identity="ownerIdentity"
        :author-verified="false"
        :show-verified-text="false"
      />

      <div class="hero__title">{{ conversationTitle }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DynamicProfileImage from "src/components/account/DynamicProfileImage.vue";
import UserMetadata from "src/components/features/user/UserMetadata.vue";
import { computed } from "vue";

const props = defineProps<{
  conversationTitle: string;
  authorUsername: string;
  organizationName: string;
  organizationImageUrl: string;
  compact?: boolean;
}>();

const ownerIdentity = computed(() => {
  return props.organizationName || props.authorUsername;
});

const avatarSize = computed(() => {
  return props.compact ? 52 : 64;
});
</script>

<style scoped lang="scss">
.hero {
  min-height: 34dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 2.5rem;
  padding-bottom: 4rem;
}

.hero__content {
  width: min(100%, 32rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.hero__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5.5rem;
  height: 5.5rem;
  padding: 0.75rem;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
  overflow: hidden;
}

.hero__owner {
  justify-content: center;
  max-width: 100%;
}

.hero__title {
  font-size: 1.75rem;
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
  color: $ink-darkest;
  text-wrap: balance;
}

.hero--compact {
  min-height: 18dvh;
  padding-top: 1.25rem;
  padding-bottom: 1.75rem;

  .hero__content {
    gap: 0.6rem;
  }

  .hero__avatar {
    width: 4rem;
    height: 4rem;
    padding: 0.4rem;
  }

  .hero__title {
    font-size: 1.3rem;
  }
}

@media (max-width: 600px) {
  .hero {
    min-height: 30dvh;
    padding-bottom: 3rem;
  }

  .hero__title {
    font-size: 1.5rem;
  }

  .hero--compact {
    min-height: 14dvh;
    padding-top: 0.75rem;
    padding-bottom: 1.25rem;

    .hero__title {
      font-size: 1.15rem;
    }
  }
}
</style>

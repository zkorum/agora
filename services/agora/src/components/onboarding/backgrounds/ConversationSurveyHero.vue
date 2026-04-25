<template>
  <div class="hero">
    <div class="hero__content">
      <div class="hero__avatar">
        <DynamicProfileImage
          :user-identity="ownerIdentity"
          :organization-image-url="organizationImageUrl || undefined"
          :size="64"
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
}>();

const ownerIdentity = computed(() => {
  return props.organizationName || props.authorUsername;
});

</script>

<style scoped lang="scss">
.hero {
  min-height: clamp(13rem, 28dvh, 18rem);
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: clamp(1rem, 3dvh, 2rem);
  padding-bottom: clamp(1.5rem, 4dvh, 3rem);
}

.hero__content {
  width: min(100%, 32rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}

.hero__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(4.5rem, 16vw, 5.5rem);
  height: clamp(4.5rem, 16vw, 5.5rem);
  padding: clamp(0.5rem, 2vw, 0.75rem);
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
  max-width: 100%;
  font-size: clamp(1.35rem, 1.1rem + 1.2vw, 1.75rem);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
  color: $ink-darkest;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

@media (max-width: 600px) {
  .hero {
    min-height: clamp(11rem, 24dvh, 15rem);
  }
}
</style>

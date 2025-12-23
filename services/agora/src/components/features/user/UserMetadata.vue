<template>
  <div class="authorContainer">
    <DisplayUsername
      class="usernameStyle"
      :class="{
        wordBreakNormal: userType == 'normal',
        wordBreakOrganization: userType == 'organization',
      }"
      :username="userIdentity"
      :show-is-guest="showIsGuest"
    />
    <div v-if="authorVerified" class="verifiedMessage">
      <q-icon name="mdi-check-decagram" class="verifiedIconStyle" />
      <div v-if="showVerifiedText">{{ t("idVerified") }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DisplayUsername from "src/components/features/user/DisplayUsername.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type UserMetadataTranslations,
  userMetadataTranslations,
} from "./UserMetadata.i18n";

defineProps<{
  showIsGuest: boolean;
  userIdentity: string;
  authorVerified: boolean;
  showVerifiedText: boolean;
  userType: "organization" | "normal";
}>();

const { t } = useComponentI18n<UserMetadataTranslations>(
  userMetadataTranslations
);

</script>

<style lang="scss" scoped>
.usernameStyle {
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
  color: #0a0714;
}

.wordBreakNormal {
  word-break: break-all;
}

.wordBreakOrganization {
  word-break: break-word;
}

.verifiedMessage {
  display: flex;
  gap: 0.3rem;
  align-items: center;
  font-size: 1rem;
}

.verifiedIconStyle {
  color: #434149;
}

.authorContainer {
  display: flex;
  flex-wrap: wrap;
  column-gap: 0.5rem;
}
</style>

<template>
  <div class="container">
    <div v-if="userMuteItemList.length == 0 && dataLoaded" class="infoMessage">
      {{ t("emptyMessage") }}
    </div>
    <ZKCard
      v-if="userMuteItemList.length > 0 && dataLoaded"
      padding="1rem"
      class="cardBackground"
    >
      <p class="title">{{ t("title") }}</p>

      <q-list bordered padding>
        <div
          v-for="(muteItem, index) in userMuteItemList"
          :key="muteItem.username"
        >
          <q-item>
            <q-item-section top avatar>
              <UserAvatar :user-identity="muteItem.username" :size="40" />
            </q-item-section>

            <q-item-section>
              <q-item-label caption>
                {{ useTimeAgo(muteItem.createdAt) }}</q-item-label
              >
              <q-item-label>{{ muteItem.username }}</q-item-label>
            </q-item-section>

            <q-item-section side top>
              <q-btn
                flat
                round
                icon="mdi-delete"
                @click="removeMutedUser(muteItem.username)"
              />
            </q-item-section>
          </q-item>

          <q-separator v-if="index != userMuteItemList.length - 1" spaced />
        </div>
      </q-list>
    </ZKCard>
  </div>
</template>

<script setup lang="ts">
import { useTimeAgo } from "@vueuse/core";
import UserAvatar from "src/components/account/UserAvatar.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { UserMuteItem } from "src/shared/types/zod";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useBackendUserMuteApi } from "src/utils/api/muteUser";
import { onMounted,ref } from "vue";

import {
  type MutedUsersTranslations,
  mutedUsersTranslations,
} from "./MutedUsers.i18n";

const { getMutedUsers, muteUser } = useBackendUserMuteApi();
const { loadPostData } = useHomeFeedStore();

const userMuteItemList = ref<UserMuteItem[]>([]);
const dataLoaded = ref(false);

const { t } = useComponentI18n<MutedUsersTranslations>(mutedUsersTranslations);

onMounted(async () => {
  await loadMuteData();
  dataLoaded.value = true;
});

async function loadMuteData() {
  userMuteItemList.value = await getMutedUsers();
}

async function removeMutedUser(targetUsername: string) {
  await muteUser(targetUsername, "unmute");
  await loadMuteData();
  await loadPostData();
}
</script>

<style scoped lang="scss">
.infoMessage {
  font-size: 1rem;
  text-align: center;
  padding-top: 2rem;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.cardBackground {
  background-color: white;
}

.title {
  font-size: 1.1rem;
}
</style>

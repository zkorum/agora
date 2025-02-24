<template>
  <DrawerLayout
    :general-props="{
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: true,
    }"
    :menu-bar-props="{
      hasBackButton: true,
      hasCloseButton: false,
      hasLoginButton: true,
    }"
  >
    <div class="container">
      <div class="titleStyle">Muted Users</div>

      <div v-if="userMuteItemList.length == 0 && dataLoaded">
        You have no muted users.
      </div>
      <q-list v-if="userMuteItemList.length > 0 && dataLoaded" bordered padding>
        <div
          v-for="(muteItem, index) in userMuteItemList"
          :key="muteItem.username"
        >
          <q-item>
            <q-item-section top avatar>
              <UserAvatar :user-name="muteItem.username" :size="40" />
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
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { useTimeAgo } from "@vueuse/core";
import UserAvatar from "src/components/account/UserAvatar.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import type { UserMuteItem } from "src/shared/types/zod";
import { usePostStore } from "src/stores/post";
import { useBackendUserMuteApi } from "src/utils/api/muteUser";
import { onMounted, ref } from "vue";

const { getMutedUsers, muteUser } = useBackendUserMuteApi();
const { loadPostData } = usePostStore();

const userMuteItemList = ref<UserMuteItem[]>([]);
const dataLoaded = ref(false);

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
  await loadPostData(false);
}
</script>

<style scoped lang="scss">
.titleStyle {
  font-size: 1.4rem;
  font-weight: bold;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 2rem;
  padding-bottom: 2rem;
}
</style>

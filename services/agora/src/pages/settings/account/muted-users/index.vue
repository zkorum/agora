<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: true,
    }"
  >
    <template #header>
      <DefaultMenuBar
        :has-back-button="true"
        :has-close-button="false"
        :has-login-button="false"
        :has-menu-button="false"
        :fixed-height="true"
      >
        <template #middle> Muted Users</template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <div v-if="userMuteItemList.length == 0 && dataLoaded" class="titleStyle">
        You have no muted users
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
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
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
  font-size: 1.1rem;
  font-weight: 400;
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
</style>

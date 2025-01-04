<template>
  <div class="container">
    <div class="titleStyle">Muted Users</div>

    <div v-if="userMuteItemList.length == 0">You have no muted users.</div>

    <q-list v-if="userMuteItemList.length > 0" bordered padding>
      <q-item v-for="muteItem in userMuteItemList" :key="muteItem.username">
        <q-item-section top avatar>
          <UserAvatar :user-name="muteItem.username" :size="40" />
        </q-item-section>

        <q-item-section>
          <q-item-label>Single line item</q-item-label>
        </q-item-section>

        <q-item-section side top>
          <q-item-label caption>5 min ago</q-item-label>
          <q-icon name="star" color="yellow" />
        </q-item-section>
      </q-item>

      <!--
      <q-separator spaced inset="item" />
      -->
    </q-list>
  </div>
</template>

<script setup lang="ts">
import UserAvatar from "src/components/account/UserAvatar.vue";
import type { UserMuteItem } from "src/shared/types/zod";
import { useBackendUserMuteApi } from "src/utils/api/muteUser";
import { onMounted, ref } from "vue";

const { fetchMutePreferences } = useBackendUserMuteApi();

const userMuteItemList = ref<UserMuteItem[]>([]);

onMounted(async () => {
  userMuteItemList.value = await fetchMutePreferences();
});
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

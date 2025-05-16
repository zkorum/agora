<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: true,
      enableFooter: true,
      enableHeader: true,
      reducedWidth: true,
    }"
  >
    <template #header>
      <DefaultMenuBar
        :has-back-button="false"
        :has-close-button="false"
        :has-login-button="false"
        :has-menu-button="true"
        :fixed-height="true"
      >
        <template #middle> Explore Topics </template>
      </DefaultMenuBar>
    </template>

    <div class="topicContainer">
      <div v-for="topic in fullTopicList" :key="topic.code" class="topicItem">
        <Chip
          :label="topic.name"
          :pt="{
            root: {
              class: 'topicChipStyle generalStyle',
            },
          }"
        />

        <Button
          :label="
            followedTopicCodeList.includes(topic.code) ? 'Following' : 'Follow'
          "
          :variant="
            followedTopicCodeList.includes(topic.code) ? '' : 'outlined'
          "
          rounded
          :pt="
            followedTopicCodeList.includes(topic.code)
              ? {
                  root: {
                    class: 'followingButtonStyle generalStyle',
                  },
                }
              : {
                  root: {
                    class: 'followButtonStyle generalStyle',
                  },
                }
          "
          @click="clickedFollowButton()"
        />
      </div>
    </div>

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="() => {}"
      :active-intention="'none'"
    />
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import Chip from "primevue/chip";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useTopicStore } from "src/stores/topic";
import { onMounted, ref } from "vue";

const { loadTopicsData } = useTopicStore();
const { fullTopicList, followedTopicCodeList } = storeToRefs(useTopicStore());

const { isLoggedIn } = storeToRefs(useAuthenticationStore());

const showLoginDialog = ref(false);

onMounted(async () => {
  await loadTopicsData();
});

function clickedFollowButton() {
  if (!isLoggedIn.value) {
    showLoginDialog.value = true;
  } else {
    // TODO ADD
  }
}
</script>

<style scoped lang="scss">
.topicContainer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-top: 1rem;
}

.generalStyle {
  font-weight: 400;
  font-size: 1rem;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
  padding-left: 1rem;
  padding-right: 1rem;
}

.topicChipStyle {
  background-color: white;
  border-color: #e2e1e7;
  border-width: 1px;
  border-style: solid;
  color: black;
}

.followButtonStyle {
  background-color: $secondary;
  border-color: $primary;
  border-width: 1px;
  border-style: solid;
  border-radius: 10px;
  color: $primary;
}

.followingButtonStyle {
  background-color: #e9e9f2;
  border: none;
  border-radius: 10px;
  color: #6d6a74;
}

.topicItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>

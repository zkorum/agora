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
            root: 'topicChipStyle generalStyle',
          }"
        />

        <FollowButton
          :label="followedTopicCodeSet.has(topic.code) ? 'Following' : 'Follow'"
          :variant="followedTopicCodeSet.has(topic.code) ? '' : 'outlined'"
          :is-following="followedTopicCodeSet.has(topic.code)"
          :icon="''"
          @click="
            clickedFollowButton(
              topic.code,
              followedTopicCodeSet.has(topic.code) ? 'unfollow' : 'follow'
            )
          "
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
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import FollowButton from "src/components/features/topics/FollowButton.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useTopicStore } from "src/stores/topic";
import { onMounted, ref } from "vue";

const { loadTopicsData, followTopic, unfollowTopic } = useTopicStore();
const { fullTopicList, followedTopicCodeSet } = storeToRefs(useTopicStore());

const { isLoggedIn } = storeToRefs(useAuthenticationStore());

const showLoginDialog = ref(false);

onMounted(async () => {
  await loadTopicsData();
});

async function clickedFollowButton(
  topicCode: string,
  action: "follow" | "unfollow"
) {
  if (!isLoggedIn.value) {
    showLoginDialog.value = true;
  } else {
    if (action == "follow") {
      await followTopic({ topicCode: topicCode });
    } else {
      await unfollowTopic({ topicCode: topicCode });
    }
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

.topicChipStyle {
  background-color: white;
  border-color: #e2e1e7;
  border-width: 1px;
  border-style: solid;
  color: black;
}

.generalStyle {
  font-weight: 400;
  font-size: 1rem;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
  padding-left: 1rem;
  padding-right: 1rem;
}

.topicItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>

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
      <HomeMenuBar>
        <template #center>{{ t("exploreTopics") }}</template>
      </HomeMenuBar>
    </template>

    <div v-if="isLoading" class="loadingContainer">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else class="topicContainer">
      <div v-for="topic in fullTopicList" :key="topic.code" class="topicItem">
        <PrimeChip
          :label="topic.name"
          :pt="{
            root: 'topicChipStyle generalStyle',
          }"
        />

        <FollowButton
          :label="
            followedTopicCodeSet.has(topic.code) ? t('following') : t('follow')
          "
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
import FollowButton from "src/components/features/topics/FollowButton.vue";
import { HomeMenuBar } from "src/components/navigation/header/variants";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useTopicStore } from "src/stores/topic";
import { onMounted, ref } from "vue";

import { type TopicsTranslations,topicsTranslations } from "./index.i18n";

const { t } = useComponentI18n<TopicsTranslations>(topicsTranslations);

const { loadTopicsData, followTopic, unfollowTopic } = useTopicStore();
const { fullTopicList, followedTopicCodeSet } = storeToRefs(useTopicStore());

const { isLoggedIn } = storeToRefs(useAuthenticationStore());

const showLoginDialog = ref(false);
const isLoading = ref(true);

onMounted(() => {
  void loadInitialData();
});

async function loadInitialData() {
  try {
    isLoading.value = true;
    await loadTopicsData();
  } catch (error) {
    console.error('Failed to load topics:', error);
  } finally {
    isLoading.value = false;
  }
}

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
  font-weight: var(--font-weight-normal);
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

.loadingContainer {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  padding: 2rem;
}
</style>

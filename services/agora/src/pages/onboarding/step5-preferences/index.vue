<template>
  <OnboardingLayout>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <StepperLayout
        :submit-call-back="() => {}"
        :current-step="5"
        :total-steps="5"
        :enable-next-button="false"
        :show-next-button="false"
        :show-loading-button="false"
      >
        <template #header>
          <InfoHeader
            title="Select topics to get started"
            description=""
            icon-name="mdi-pound"
          />
        </template>

        <template #body>
          <div class="tagContainer">
            <FollowButton
              v-for="topic in fullTopicList"
              :key="topic.code"
              :label="topic.name"
              :variant="''"
              :is-following="followedTopicCodeSet.has(topic.code)"
              :icon="''"
              @click="
                topicButtonClicked(
                  topic.code,
                  followedTopicCodeSet.has(topic.code) ? 'unfollow' : 'follow'
                )
              "
            />
          </div>

          <ZKButton
            button-type="largeButton"
            label="Save & Close"
            color="primary"
            @click="clickedSaveAndClose()"
          />
        </template>
      </StepperLayout>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { storeToRefs } from "pinia";
import { useTopicStore } from "src/stores/topic";
import { onMounted } from "vue";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import FollowButton from "src/components/ui-library/buttons/FollowButton.vue";

const { loadTopicsData, followTopic, unfollowTopic } = useTopicStore();
const { fullTopicList, followedTopicCodeSet } = storeToRefs(useTopicStore());

const { routeUserAfterLogin } = useLoginIntentionStore();

onMounted(async () => {
  await loadTopicsData();
});

async function clickedSaveAndClose() {
  await routeUserAfterLogin();
}

async function topicButtonClicked(
  topicCode: string,
  action: "follow" | "unfollow"
) {
  if (action == "follow") {
    await followTopic({ topicCode: topicCode });
  } else {
    await unfollowTopic({ topicCode: topicCode });
  }
}
</script>

<style scoped lang="scss">
.tagContainer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}
</style>

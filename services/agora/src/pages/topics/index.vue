<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: true,
      enableFooter: false,
      enableHeader: true,
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
        <template #middle> Topics </template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <div class="topicContainer">
        <div v-for="topic in topicList" :key="topic.code">
          <ZKButton
            :button-type="'standardButton'"
            :label="topic.name"
            color="primary"
          />
        </div>
      </div>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { ZodTopicObject } from "src/shared/types/zod";
import { useCommonApi } from "src/utils/api/common";
import { useBackendTopicApi } from "src/utils/api/topic";
import { onMounted, ref } from "vue";

const { getAllTopics } = useBackendTopicApi();
const { handleAxiosErrorStatusCodes } = useCommonApi();

const topicList = ref<ZodTopicObject[]>([]);

onMounted(async () => {
  await fetchTopics();
});

async function fetchTopics() {
  const response = await getAllTopics();

  if (response.status == "success") {
    topicList.value = response.data.topicList;
  } else {
    handleAxiosErrorStatusCodes({
      axiosErrorCode: response.code,
      defaultMessage: "Error while trying to create a new conversation",
    });
  }
}
</script>

<style scoped lang="scss">
.topicContainer {
  display: flex;
  gap: 1rem;
}
</style>

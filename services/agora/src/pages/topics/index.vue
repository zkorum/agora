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
        <div v-for="topic in fullTopicList" :key="topic.code">
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
import { storeToRefs } from "pinia";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useTopicStore } from "src/stores/topic";
import { onMounted } from "vue";

const { loadTopicList } = useTopicStore();
const { fullTopicList } = storeToRefs(useTopicStore());

onMounted(async () => {
  await loadTopicList();
});
</script>

<style scoped lang="scss">
.topicContainer {
  display: flex;
  gap: 1rem;
}
</style>

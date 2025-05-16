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

    <div>
      <div class="topicContainer">
        <div v-for="topic in fullTopicList" :key="topic.code">
          <Chip
            :label="topic.name"
            variant="outlined"
            rounded
            :pt="{
              root: {
                class: 'buttonStyle',
              },
            }"
          />
        </div>
      </div>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import Chip from "primevue/chip";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
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
  flex-direction: column;
  gap: 1rem;
}

.buttonStyle {
  background-color: white;
  border-color: #e2e1e7;
  border-width: 2px;
  border-style: solid;
  color: black;
  font-weight: 400;
  font-size: 0.9rem;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
  padding-left: 1rem;
  padding-right: 1rem;
}
</style>

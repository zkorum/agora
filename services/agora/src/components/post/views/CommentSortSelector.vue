<template>
  <div>
    <Tabs v-model:value="selectedTab">
      <TabList>
        <Tab
          v-for="alogrithmItem in algorithmList"
          :key="alogrithmItem"
          :value="alogrithmItem"
        >
          {{ alogrithmItem }}
        </Tab>
      </TabList>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import Tab from "primevue/tab";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import { ref, watch } from "vue";

const emit = defineEmits(["changedAlgorithm"]);

const selectedTab = ref("New");

const algorithmList = ["New", "Moderation History"];

watch(selectedTab, () => {
  emit("changedAlgorithm");
});
</script>

<style scoped lang="scss"></style>

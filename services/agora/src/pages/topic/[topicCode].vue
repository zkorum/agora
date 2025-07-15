<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: false,
      reducedWidth: false,
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
        <template #middle> {{ topicCode }} </template>
      </DefaultMenuBar>
    </template>

    <WidthWrapper :enable="true"> Load posts here </WidthWrapper>
  </DrawerLayout>
</template>

<script setup lang="ts">
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const topicCode = ref("");

onMounted(() => {
  loadData();
});

function loadData() {
  if (route.name == "/topic/[topicCode]") {
    topicCode.value = Array.isArray(route.params.topicCode)
      ? route.params.topicCode[0]
      : route.params.topicCode;
    console.log(topicCode.value);
  } else {
    return false;
  }
}
</script>

<style scoped lang="scss"></style>

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
      <EntityMenuBar :entity-name="topicCode" :show-back="true" />
    </template>

    <WidthWrapper :enable="true"> {{ t("loadPostsHere") }} </WidthWrapper>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { EntityMenuBar } from "src/components/navigation/header/variants";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  topicPageTranslations,
  type TopicPageTranslations,
} from "./[topicCode].i18n";

const { t } = useComponentI18n<TopicPageTranslations>(topicPageTranslations);

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

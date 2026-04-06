<template>
  <Teleport v-if="isActive" to="#page-header">
    <EntityMenuBar :entity-name="topicCode" :show-back="true" />
  </Teleport>

  <WidthWrapper :enable="true"> {{ t("loadPostsHere") }} </WidthWrapper>
</template>

<script setup lang="ts">
import { EntityMenuBar } from "src/components/navigation/header/variants";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { getSingleRouteParam } from "src/utils/router/params";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import {
  type TopicPageTranslations,
  topicPageTranslations,
} from "./[topicCode].i18n";

const { isActive } = usePageLayout({ enableFooter: false });

const { t } = useComponentI18n<TopicPageTranslations>(topicPageTranslations);

const route = useRoute();
const topicCode = ref("");

onMounted(() => {
  loadData();
});

function loadData() {
  if (route.name == "/topic/[topicCode]") {
    topicCode.value = getSingleRouteParam(route.params.topicCode);
    console.log(topicCode.value);
  } else {
    return false;
  }
}
</script>

<style scoped lang="scss"></style>

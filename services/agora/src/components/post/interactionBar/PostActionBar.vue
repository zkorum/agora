<template>
  <div class="buttonClusterBar" :class="{ buttonClusterBorder: !compactMode }">
    <div>
      <InteractionTab
        v-model="currentTab"
        :compact-mode="props.compactMode"
        :opinion-count="opinionCount"
      />
    </div>

    <div>
      <ZKButton
        button-type="standardButton"
        @click.stop.prevent="$emit('share')"
      >
        <div class="shareButtonContentContainer">
          <div>
            <ZKIcon color="#7D7A85" name="mdi:share" size="1rem" />
          </div>
          <div>{{ t("share") }}</div>
        </div>
      </ZKButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKButton from "../../ui-library/ZKButton.vue";
import ZKIcon from "../../ui-library/ZKIcon.vue";
import InteractionTab from "./InteractionTab.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  postActionBarTranslations,
  type PostActionBarTranslations,
} from "./PostActionBar.i18n";

const props = defineProps<{
  compactMode: boolean;
  opinionCount: number;
}>();

const currentTab = defineModel<"comment" | "analysis">({
  required: true,
});

const { t } = useComponentI18n<PostActionBarTranslations>(
  postActionBarTranslations
);

defineEmits(["share"]);
</script>

<style scoped lang="scss">
.buttonClusterBar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}

.buttonClusterBorder {
  border-bottom-width: 1px;
  border-bottom-style: solid;
  border-bottom-color: #e2e1e7;
}

.shareButtonContentContainer {
  gap: 0.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7d7a85;
}
</style>

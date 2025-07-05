<template>
  <div class="buttonClusterBar" :class="{ buttonClusterBorder: !compactMode }">
    <div>
      <InteractionTab
        v-model="currentTab"
        :compact-mode="props.compactMode"
        :opinion-count="opinionCount"
        :show-analysis-page="showAnalysisPage"
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
          <div>Share</div>
        </div>
      </ZKButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKButton from "../../ui-library/ZKButton.vue";
import ZKIcon from "../../ui-library/ZKIcon.vue";
import InteractionTab from "./InteractionTab.vue";

const props = defineProps<{
  compactMode: boolean;
  opinionCount: number;
  showAnalysisPage: boolean;
}>();

const currentTab = defineModel<"comment" | "analysis">({
  required: true,
});

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

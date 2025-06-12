<template>
  <div class="buttonClusterBar" :class="{ buttonClusterBorder: !compactMode }">
    <div class="leftButtonCluster">
      <div v-if="compactMode" class="commentCountStyle">
        <ZKIcon color="#7D7A85" name="meteor-icons:comment" size="1rem" />
        <div :style="{ color: '#7D7A85', paddingBottom: '3px' }">
          {{ opinionCount.toString() }}
        </div>
      </div>
      <ViewTabs
        v-if="!compactMode"
        v-model="localCurrentTab"
        :opinion-count="opinionCount"
        @update:model-value="$emit('tabChange', $event)"
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
import ViewTabs from "../comments/ViewTabs.vue";
import { ref, watch } from "vue";

const props = defineProps<{
  compactMode: boolean;
  currentTab: "comment" | "analysis";
  opinionCount: number;
}>();

const emit = defineEmits(["share", "tabChange"]);

const localCurrentTab = ref(props.currentTab);

watch(
  () => props.currentTab,
  (newValue) => {
    localCurrentTab.value = newValue;
  }
);

watch(localCurrentTab, (newValue) => {
  if (newValue !== props.currentTab) {
    emit("tabChange", newValue);
  }
});
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

.leftButtonCluster {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.commentCountStyle {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding-top: 0.5rem;
}

.shareButtonContentContainer {
  gap: 0.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7d7a85;
}
</style>

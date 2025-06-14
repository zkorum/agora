<template>
  <div class="buttonClusterBar" :class="{ buttonClusterBorder: !compactMode }">
    <div>
      <div v-if="compactMode" class="commentCountStyle">
        <ZKIcon color="#7D7A85" name="meteor-icons:comment" size="1rem" />
        <div :style="{ color: '#7D7A85', paddingBottom: '3px' }">
          {{ opinionCount }}
        </div>
      </div>

      <ViewTabs
        v-if="!compactMode"
        v-model="currentTab"
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

defineProps<{
  compactMode: boolean;
  opinionCount: number;
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

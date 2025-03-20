<template>
  <div>
    <div class="container">
      <div><img :src="starIcon" class="iconStyle" /></div>
      <div class="messageBody">
        <div class="titleBar">
          <div class="titleString">{{ summaryTitle }}</div>
          <q-icon
            name="mdi-information-outline"
            size="1.5rem"
            class="infoIcon"
            @click="infoIconClicked()"
          />
        </div>
        <div>
          {{ summary }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PolisKey } from "src/shared/types/zod";
import { useDialog } from "src/utils/ui/dialog";

const props = defineProps<{
  summary: string;
  selectedClusterKey: PolisKey | undefined;
}>();

const { showMessage } = useDialog();

const summaryTitle =
  props.selectedClusterKey === undefined ? "Summary" : "Group summary";

const starIcon = process.env.VITE_PUBLIC_DIR + "/images/icons/stars.svg";

function infoIconClicked() {
  const title = "Consensus Groups";
  const infoText =
    "Consensus groups are created based on how people agree and disagree with responses.\n\n We use machine learning to identify the responses that define each group, and input those responses to an AI to create the labels and AI-generated summary for each consensus group.";
  showMessage(title, infoText);
}
</script>

<style lang="scss" scoped>
.container {
  display: grid;
  grid-template-columns: min-content 1fr;
  grid-template-rows: 1fr;
  gap: 0px 1rem;
  grid-template-areas: ". .";
}

.iconStyle {
  width: 1.5rem;
}

.titleBar {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.titleString {
  font-size: 1rem;
  font-weight: 500;
}

.messageBody {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.infoIcon {
  color: #6d6a74;
}

.infoIcon:hover {
  cursor: pointer;
}
</style>

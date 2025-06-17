<template>
  <div>
    <div class="container">
      <div><img :src="starIcon" class="iconStyle" /></div>
      <div class="messageBody">
        <div class="titleBar">
          <div class="titleString">{{ summaryTitle }}</div>

          <ZKButton button-type="icon" @click="showInformationDialog = true">
            <ZKIcon
              color="#6d6a74"
              name="mdi-information-outline"
              size="1.2rem"
            />
          </ZKButton>
        </div>
        <div>
          {{ summary }}
        </div>
      </div>
    </div>

    <q-dialog v-model="showInformationDialog" position="bottom">
      <ZKBottomDialogContainer>
        <div class="titleStyle">AI Summary</div>

        <div>
          We use Mistral Large (LLM model) to generate the summary & labels for
          each consensus group.
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { SelectedClusterKeyType } from "src/utils/component/analysis/analysisTypes";
import { ref } from "vue";

const props = defineProps<{
  summary: string;
  selectedClusterKey: SelectedClusterKeyType;
}>();

const summaryTitle =
  props.selectedClusterKey === "all" ? "Summary" : "Group summary";

const starIcon = process.env.VITE_PUBLIC_DIR + "/images/icons/stars.svg";

const showInformationDialog = ref(false);
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

.titleStyle {
  font-weight: 500;
  font-size: 1.1rem;
}
</style>

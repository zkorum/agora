<template>
  <q-dialog v-model="showDialog">
    <div class="dialog-container">
      <div class="dialog-header">
        <ZKButton
          button-type="icon"
          icon="mdi-close"
          size="1rem"
          @click="showDialog = false"
        />
      </div>
      <div class="dialog-body">
        <ZKHtmlContent
          :html-body="htmlBody"
          :compact-mode="false"
          :enable-links="true"
        />
      </div>
      <div v-if="voteLabel" class="dialog-footer">
        <ZKButton
          button-type="largeButton"
          :flat="voteFlat"
          :outline="!voteFlat"
          :color="voteFlat ? undefined : (voteColor ?? 'primary')"
          :text-color="voteFlat ? 'primary' : undefined"
          :label="voteLabel"
          @click="handleVote"
        />
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";

const props = defineProps<{
  htmlBody: string;
  voteLabel?: string;
  voteColor?: string;
  voteFlat?: boolean;
  onVote?: () => void;
}>();

const showDialog = defineModel<boolean>({ required: true });

function handleVote(): void {
  props.onVote?.();
  showDialog.value = false;
}
</script>

<style lang="scss" scoped>
.dialog-container {
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 25px;
  width: min(100vw, 30rem);
  max-height: 80vh;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 1rem 1rem 0 1rem;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  padding: 0 1.5rem 1.5rem 1.5rem;
  overflow-y: auto;
  flex: 1;
  font-size: 1rem;
  line-height: 1.5;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  padding: 0.5rem 1.5rem 1.5rem 1.5rem;
}
</style>

<template>
  <div>
    <DialogContainer
      v-model="showPostLoginIntention"
      :title="'Session resumed'"
      :show-cancel-dialog="false"
      :ok-callback="okCallback"
    >
      <template #body> {{ message }} </template>
    </DialogContainer>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import DialogContainer from "./DialogContainer.vue";
import {
  PossibleIntentions,
  useLoginIntentionStore,
} from "src/stores/loginIntention";
import { storeToRefs } from "pinia";

const { showPostLoginIntention } = storeToRefs(useLoginIntentionStore());

const props = defineProps<{
  activeIntention: PossibleIntentions;
}>();

const { composePostLoginDialogMessage } = useLoginIntentionStore();

const message = ref(composePostLoginDialogMessage(props.activeIntention));

function okCallback() {
  showPostLoginIntention.value = false;
}
</script>

<style lang="scss" scoped>
.cardStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background-color: white;
  border-radius: 25px;
  max-width: 20rem;
  padding: 1.5rem;
}
</style>

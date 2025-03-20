<template>
  <div>
    <DialogContainer
      v-model="showDialog"
      :title="'Session resumed'"
      :message="''"
      :show-cancel-dialog="false"
      :ok-callback="okCallback"
    >
      <template #body> {{ message }} </template>
    </DialogContainer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import DialogContainer from "./DialogContainer.vue";
import {
  PossibleIntentions,
  useLoginIntentionStore,
} from "src/stores/loginIntention";
import { storeToRefs } from "pinia";

const { showPostLoginIntentionDialog, activeUserIntention } = storeToRefs(
  useLoginIntentionStore()
);
const { setActiveUserIntention } = useLoginIntentionStore();

const props = defineProps<{
  activeIntention: PossibleIntentions;
}>();

const { composePostLoginDialogMessage } = useLoginIntentionStore();

const message = ref(composePostLoginDialogMessage(props.activeIntention));

const showDialog = ref(false);

onMounted(() => {
  updateModel();
});

function updateModel() {
  if (activeUserIntention.value == props.activeIntention) {
    if (showPostLoginIntentionDialog.value) {
      showDialog.value = true;
    }
  }
}

function okCallback() {
  showDialog.value = false;
  setActiveUserIntention("none");
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

<template>
  <div>
    <DialogContainer
      v-model="showDialog"
      :title="'Session resumed'"
      :message="''"
      :show-cancel-dialog="false"
      :ok-callback="okCallback"
    >
      <template #body>
        {{ message }}
      </template>
    </DialogContainer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import DialogContainer from "./DialogContainer.vue";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { storeToRefs } from "pinia";

const { showPostLoginIntentionDialog, activeUserIntention } = storeToRefs(
  useLoginIntentionStore()
);
const { setActiveUserIntention, composePostLoginDialogMessage } =
  useLoginIntentionStore();

const message = ref("");

const showDialog = ref(false);

onMounted(() => {
  checkData();
});

watch(showPostLoginIntentionDialog, () => {
  checkData();
});

function checkData() {
  if (showPostLoginIntentionDialog.value == true) {
    message.value = composePostLoginDialogMessage(activeUserIntention.value);

    setTimeout(function () {
      showDialog.value = true;
    }, 500);
  }
}

function okCallback() {
  showPostLoginIntentionDialog.value = false;
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

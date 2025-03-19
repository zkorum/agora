<template>
  <div>
    <DialogContainer
      v-model="showDialog"
      :title="'Log in to Agora'"
      :message="'Sign in to participate the discussions'"
      :show-cancel-dialog="true"
      :ok-callback="okButtonClicked"
    >
      <template #body>
        <div v-if="subMessage" class="shadowBoxStyle">
          <div class="iconAlignment">
            <q-icon name="mdi-information" size="1.2rem" />
          </div>
          <div>
            {{ subMessage }}
          </div>
        </div>
      </template>
    </DialogContainer>

    <LoginResumeIntentionDialog :active-intention="activeIntention" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  PossibleIntentions,
  useLoginIntentionStore,
} from "src/stores/loginIntention";
import { useRouter } from "vue-router";
import LoginResumeIntentionDialog from "./LoginResumeIntentionDialog.vue";
import DialogContainer from "./DialogContainer.vue";

const showDialog = defineModel<boolean>({ required: true });

const props = defineProps<{
  okCallback: () => void;
  activeIntention: PossibleIntentions;
}>();

const { composeLoginIntentionDialogMessage } = useLoginIntentionStore();

const subMessage = ref(
  composeLoginIntentionDialogMessage(props.activeIntention)
);

const router = useRouter();

async function okButtonClicked() {
  props.okCallback();
  await router.push({ name: "/welcome/" });
}
</script>

<style scoped lang="scss">
.shadowBoxStyle {
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: 1fr;
  gap: 0px 1rem;
  grid-template-areas: ". .";
  padding: 0.5rem;
  color: $primary;
}

.iconAlignment {
  margin: auto;
}
</style>

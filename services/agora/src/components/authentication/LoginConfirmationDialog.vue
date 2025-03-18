<template>
  <div>
    <q-dialog v-model="showDialog">
      <div class="cardStyle">
        <div class="title">Log in to Agora</div>

        <div>Sign in to participate the discussions</div>

        <div v-if="subMessage" class="shadowBoxStyle">
          <div class="iconAlignment">
            <q-icon name="mdi-information" size="1.2rem" />
          </div>
          <div>
            {{ subMessage }}
          </div>
        </div>

        <div class="actionButtons">
          <ZKButton
            button-type="largeButton"
            label="Cancel"
            @click="showDialog = false"
          />
          <ZKButton
            button-type="largeButton"
            label="Ok"
            color="primary"
            @click="okButtonClicked()"
          />
        </div>
      </div>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ZKButton from "../ui-library/ZKButton.vue";
import {
  PossibleIntentions,
  useLoginIntentionStore,
} from "src/stores/loginIntention";
import { useRouter } from "vue-router";

const showDialog = defineModel<boolean>();

const props = defineProps<{
  onOkCallback: () => void;
  activeIntention: PossibleIntentions;
}>();

const subMessage = ref("");

const { composeLoginIntentionDialogMessage } = useLoginIntentionStore();

subMessage.value = composeLoginIntentionDialogMessage(props.activeIntention);

const router = useRouter();

async function okButtonClicked() {
  props.onOkCallback();
  await router.push({ name: "/welcome/" });
}
</script>

<style scoped lang="scss">
.cardStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background-color: white;
  border-radius: 25px;
  max-width: 20rem;
  padding: 1.5rem;
}

.shadowBoxStyle {
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: 1fr;
  gap: 0px 1rem;
  grid-template-areas: ". .";
  padding: 0.5rem;
  color: $primary;
}

.title {
  font-size: 1.3rem;
  font-weight: 500;
}

.actionButtons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
}

.iconAlignment {
  margin: auto;
}
</style>

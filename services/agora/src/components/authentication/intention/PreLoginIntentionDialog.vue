<template>
  <div>
    <DialogContainer
      v-model="showDialog"
      :title="t('title')"
      :message="t('message')"
      :show-cancel-dialog="true"
      :ok-callback="okButtonClicked"
      :cancel-callback="() => {}"
      :label-ok="t('labelOk')"
      :label-cancel="t('labelCancel')"
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
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { PossibleIntentions } from "src/stores/loginIntention";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useRouter } from "vue-router";
import DialogContainer from "./DialogContainer.vue";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  preLoginIntentionDialogTranslations,
  type PreLoginIntentionDialogTranslations,
} from "./PreLoginIntentionDialog.i18n";

const showDialog = defineModel<boolean>({ required: true });

const props = defineProps<{
  okCallback: () => void;
  activeIntention: PossibleIntentions;
}>();

const { t } = useComponentI18n<PreLoginIntentionDialogTranslations>(
  preLoginIntentionDialogTranslations
);

const { composeLoginIntentionDialogMessage, setActiveUserIntention } =
  useLoginIntentionStore();

const subMessage = ref(
  composeLoginIntentionDialogMessage(props.activeIntention)
);

const router = useRouter();

async function okButtonClicked() {
  props.okCallback();
  setActiveUserIntention(props.activeIntention);
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

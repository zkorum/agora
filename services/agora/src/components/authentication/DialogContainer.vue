<template>
  <div>
    <q-dialog v-model="showDialog">
      <div class="cardStyle">
        <div class="title">
          {{ title }}
        </div>

        <slot name="body" />

        <div class="actionButtons">
          <ZKButton
            v-if="showCancelDialog"
            button-type="largeButton"
            label="Cancel"
            @click="showDialog = false"
          />
          <ZKButton
            button-type="largeButton"
            label="Ok"
            color="primary"
            @click="clickedOkButton()"
          />
        </div>
      </div>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import ZKButton from "../ui-library/ZKButton.vue";

const props = defineProps<{
  title: string;
  showCancelDialog: boolean;
  okCallback: () => void;
}>();

const showDialog = defineModel<boolean>({ required: true });

function clickedOkButton() {
  props.okCallback();
}
</script>

<style lang="scss" scoped>
.cardStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background-color: white;
  border-radius: 25px;
  max-width: 25rem;
  min-width: 20rem;
  padding: 1.5rem;
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
</style>

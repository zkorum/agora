<template>
  <ZKCard
    padding="1rem"
    :style="{ marginTop: '1rem', backgroundColor: 'white' }"
  >
    <div>
      <div class="pollTopBar">
        <div>Add a Poll</div>
        <ZKButton
          button-type="icon"
          flat
          text-color="black"
          icon="mdi-close"
          @click="$emit('close')"
        />
      </div>
      <div class="pollingFlexStyle">
        <div
          v-for="index in pollingOptions.length"
          :key="index"
          class="pollingItem"
        >
          <q-input
            :model-value="pollingOptions[index - 1]"
            :rules="[(val) => val && val.length > 0]"
            type="text"
            :label="'Option ' + index"
            :style="{ width: '100%' }"
            :maxlength="maxLengthOption"
            autogrow
            clearable
            @update:model-value="updateOption(index - 1, $event as string)"
          />
          <div v-if="pollingOptions.length != 2" class="deletePollOptionDiv">
            <ZKButton
              button-type="icon"
              flat
              round
              icon="mdi-delete"
              text-color="primary"
              @click="removeOption(index - 1)"
            />
          </div>
        </div>

        <div>
          <ZKButton
            button-type="standardButton"
            flat
            text-color="primary"
            icon="mdi-plus"
            label="Add Option"
            :disable="pollingOptions.length == 6"
            @click="addOption()"
          />
        </div>
      </div>
    </div>
  </ZKCard>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";

interface Props {
  pollingOptions: string[];
  maxLengthOption: number;
}

interface Emits {
  (e: "close"): void;
  (e: "update:pollingOptions", value: string[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function updateOption(index: number, value: string) {
  const updatedOptions = [...props.pollingOptions];
  updatedOptions[index] = value;
  emit("update:pollingOptions", updatedOptions);
}

function addOption() {
  const updatedOptions = [...props.pollingOptions, ""];
  emit("update:pollingOptions", updatedOptions);
}

function removeOption(index: number) {
  const updatedOptions = [...props.pollingOptions];
  updatedOptions.splice(index, 1);
  emit("update:pollingOptions", updatedOptions);
}
</script>

<style scoped lang="scss">
.pollingFlexStyle {
  display: flex;
  flex-direction: column;
}

.pollingItem {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.deletePollOptionDiv {
  width: 3rem;
  padding-bottom: 1rem;
  padding-left: 0.5rem;
}

.pollTopBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1rem;
  font-weight: bold;
}
</style>

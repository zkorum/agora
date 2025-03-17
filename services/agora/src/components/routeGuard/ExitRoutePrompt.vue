<template>
  <div>
    <q-dialog v-model="model">
      <ZKCard padding="1rem" :style="{ backgroundColor: 'white' }">
        <div class="exitDialogStyle">
          <div class="dialogTitle">{{ title }}</div>

          <div>{{ description }}</div>

          <div class="dialogButtons">
            <ZKButton
              v-close-popup
              button-type="largeButton"
              flat
              label="Cancel"
            />
            <ZKButton
              v-close-popup
              button-type="largeButton"
              label="Discard"
              text-color="primary"
              @click="leaveRoute()"
            />
          </div>
        </div>
      </ZKCard>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import ZKButton from "../ui-library/ZKButton.vue";
import ZKCard from "../ui-library/ZKCard.vue";

const model = defineModel<boolean>();

const emit = defineEmits(["leaveFoute"]);

defineProps<{
  title: string;
  description: string;
}>();

function leaveRoute() {
  emit("leaveFoute");
}
</script>

<style lang="scss" scoped>
.exitDialogStyle {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dialogTitle {
  font-size: 1.4rem;
  font-weight: bold;
}

.dialogButtons {
  display: flex;
  justify-content: space-around;
}
</style>

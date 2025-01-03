<template>
  <div>
    <div class="container">
      <div class="absolutePosition">
        <ProgressBar
          :value="optionPercentage"
          :show-value="false"
          :pt="{
            root: {
              style: {
                height: '3.5rem',
                'background-color': '#f8fafc',
                'border-style': 'solid',
                'border-width': '1px',
                'border-color': '#a5f3fc',
              },
            },
            value: {
              style: {
                'background-color': '#a5f3fc',
              },
            },
          }"
        >
        </ProgressBar>

        <div class="pollOverlay">
          <div>
            {{ option }}
            <span v-if="votedByUser">
              <q-icon name="mdi-check-circle" color="black" size="1rem" />
            </span>
          </div>
          <div>{{ optionPercentage }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ProgressBar from "primevue/progressbar";

defineProps<{
  option: string;
  optionPercentage: number;
  votedByUser: boolean;
}>();

/*
const percentageStyle =
  props.optionPercentage <= 50
    ? `linear-gradient(90deg, #a5f3fc ${props.optionPercentage}%, #FFFFFF 0)`
    : `linear-gradient(to right, #a5f3fc ${props.optionPercentage}%, #FFFFFF ${100 - props.optionPercentage
    }%)`;
*/
</script>

<style scoped lang="scss">
.optionTextStyle {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.optionBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-weight: bold;
  padding: 1rem;
}

.p-progressbar-label {
  background-color: red;
}

.pollOverlay {
  position: absolute;
  top: 0rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.absolutePosition {
  position: relative;
}

.container {
  width: 100%;
}
</style>

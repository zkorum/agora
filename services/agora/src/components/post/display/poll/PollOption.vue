<template>
  <div>
    <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility and screen reader support -->
    <!-- This poll option should be focusable and keyboard navigable for users who rely on assistive technologies -->
    <div class="commonBase commonBefore" :class="{
      'gradient-border-result': displayMode == 'result',
      'gradient-border-option': displayMode == 'option',
    }">
      <div v-if="displayMode == 'result'" class="progress-bar" :style="{ width: optionPercentage + '%' }"></div>

      <div class="pollOverlayBase" :class="{
        pollOverlayLeft: displayMode == 'result',
        pollOverlayCenter: displayMode == 'option',
      }">
        <div>
          {{ option }}
          <span v-if="votedByUser" :style="{ paddingLeft: '0.2rem' }">
            <q-icon name="mdi-check-circle" color="white" size="1rem" />
          </span>
        </div>
        <div v-if="votedByUser || displayMode == 'result'">
          {{ optionPercentage }}%
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  option: string;
  optionPercentage: number;
  votedByUser: boolean;
  displayMode: "option" | "result";
}>();
</script>

<style scoped lang="scss">
.pollOverlayLeft {
  justify-content: space-between;
}

.pollOverlayCenter {
  justify-content: center;
}

.pollOverlayBase {
  position: absolute;
  display: flex;
  width: 100%;
  align-items: center;

  height: 100%;
  padding-right: 1rem;
  padding-left: 1rem;
}

.commonBase {
  height: 3rem;
  font-size: 1rem;
  border-radius: 16px;
  outline: none;
  border: 1px solid transparent;
}

.commonBefore::before {
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  content: "";
  position: absolute;
  border-radius: 15px;
  border: 2px solid transparent;
  border-image-slice: 1;
}

.gradient-border-result {
  color: black;
  background:
    linear-gradient(to right, white, white),
    linear-gradient(to right, #dbd4ff, #dbd4ff);
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  position: relative;
  overflow: hidden;
}

.gradient-border-result::before {
  background: linear-gradient(135deg, #f1eeff, #e8f1ff);
}

.gradient-border-option {
  color: black;
  background:
    linear-gradient(to right, white, white),
    linear-gradient(to right, #b4a5ff, #aaccff);
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.gradient-border-option:hover::before {
  background: linear-gradient(135deg, #d0c6ff, #d0c6ff);
}

.gradient-border-option::before {
  background: linear-gradient(135deg, #f1eeff, #e8f1ff);
}

.progress-bar {
  position: absolute;
  height: 100%;
  background: linear-gradient(135deg, #a694ff, #a6caff);
  border-radius: 8px;
}
</style>

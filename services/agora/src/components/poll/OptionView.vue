<template>
  <div>
    <div
      class="commonBase commonBefore"
      :class="{
        'gradient-border-result-notvoted':
          displayMode == 'result' && !votedByUser,
        'gradient-border-result-voted': displayMode == 'result' && votedByUser,
        'gradient-border-option': displayMode == 'option',
      }"
    >
      <div class="pollOverlay">
        <div>
          {{ option }}
          <span v-if="votedByUser" :style="{ paddingLeft: '0.2rem' }">
            <q-icon name="mdi-check-circle" color="white" size="1rem" />
          </span>
        </div>
        <div>{{ optionPercentage }}%</div>
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
.pollOverlay {
  position: absolute;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
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

.gradient-border-result-notvoted {
  color: black;
  background:
    linear-gradient(to right, white, white),
    linear-gradient(to right, #dbd4ff, #dbd4ff);
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  position: relative;
  overflow: hidden;
}

.gradient-border-result-notvoted::before {
  background: linear-gradient(135deg, #f1eeff, #e8f1ff);
}

.gradient-border-result-voted {
  color: white;
  background:
    linear-gradient(to right, white, white),
    linear-gradient(to right, #dbd4ff, #dbd4ff);
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  position: relative;
  overflow: hidden;
}

.gradient-border-result-voted::before {
  background: linear-gradient(135deg, #6b4eff, #4f92f6);
}

.gradient-border-option {
  color: black;
  background:
    linear-gradient(to right, white, white),
    linear-gradient(to right, #a391ff, #96bffb);
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.gradient-border-option::before {
  background: linear-gradient(135deg, #ecf0ff, #ecf0ff);
}
</style>

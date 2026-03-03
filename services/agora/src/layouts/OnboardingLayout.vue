<template>
  <div>
    <q-layout view="hHh lpR fFf">
      <q-page-container>
        <div
          class="backgroundContainer"
          :style="{
            backgroundImage: 'url(/images/onboarding/background.webp)',
          }"
        >
          <q-page>
            <div class="baseLayer">
              <button
                v-if="showBackButton"
                class="backButton"
                @click="handleBack"
              >
                <q-icon name="mdi-arrow-left" size="1.2rem" />
              </button>
              <div class="containerPaddings">
                <slot name="body" />
              </div>
              <div class="topLayer">
                <div class="widthLimiter">
                  <slot name="footer" />
                </div>
              </div>
            </div>
          </q-page>
        </div>
      </q-page-container>
    </q-layout>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const props = withDefaults(
  defineProps<{
    showBackButton?: boolean;
    backCallback?: () => void;
  }>(),
  {
    showBackButton: true,
    backCallback: undefined,
  }
);

const router = useRouter();

function handleBack() {
  if (props.backCallback) {
    props.backCallback();
  } else {
    router.back();
  }
}
</script>

<style scoped lang="scss">
.backgroundContainer {
  background-size: cover;
}

.baseLayer {
  position: relative;
  height: 100dvh;
}

.backButton {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  border: none;
  background-color: rgba(255, 255, 255, 0.7);
  color: rgba(0, 0, 0, 0.7);
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.9);
  }

  &:active {
    background-color: rgba(255, 255, 255, 1);
  }
}

.topLayer {
  position: absolute;
  width: 100%;
  max-height: 70dvh;
  bottom: 0rem;
  display: flex;
  justify-content: center;
  background-color: white;
  border-top: 1px solid $secondary;
  overflow: auto;
  scrollbar-width: none;
}

.containerPaddings {
  padding-left: 1rem;
  padding-right: 1rem;
}

.widthLimiter {
  width: min(calc(100vw - 1rem), 25rem);
}
</style>

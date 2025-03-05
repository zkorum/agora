<template>
  <div>
    <q-layout view="hHh lpR fFf">
      <q-page-container>
        <div
          class="backgroundContainer"
          :style="{
            backgroundImage: 'url(' + welcomeBackgroundImagePath + ')',
          }"
        >
          <q-page>
            <div class="baseLayer">
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
const welcomeBackgroundImagePath =
  process.env.VITE_PUBLIC_DIR + "/images/onboarding/background.webp";
</script>

<style scoped lang="scss">
.backgroundContainer {
  background-size: cover;
}

.baseLayer {
  position: relative;
  height: 100dvh;
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

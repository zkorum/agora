<template>
  <div>
    <q-layout view="hHh lpR fFf">
      <q-page-container>
        <div
          class="baseContainer"
          :style="{
            backgroundImage: 'url(' + welcomeBackgroundImagePath + ')',
          }"
        >
          <q-page>
            <WidthWrapper width="25rem">
              <slot name="body" />
            </WidthWrapper>
          </q-page>
        </div>
      </q-page-container>

      <q-footer bordered class="footerContainer">
        <WidthWrapper :width="limitWidth ? '25rem' : '100%'">
          <slot name="footer" />
        </WidthWrapper>
      </q-footer>
    </q-layout>
  </div>
</template>

<script setup lang="ts">
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";

const welcomeBackgroundImagePath =
  process.env.VITE_PUBLIC_DIR + "/images/onboarding/background.webp";

defineProps<{
  limitWidth: boolean;
}>();
</script>

<style scoped lang="scss">
.footerContainer {
  background-color: white;
  color: black;
}

.baseContainer {
  background-size: cover;
  padding-right: 1rem;
  padding-left: 1rem;
}
</style>

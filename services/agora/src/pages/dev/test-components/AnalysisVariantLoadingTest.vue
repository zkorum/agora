<template>
  <PrimeCard class="test-section-card">
    <template #title>
      <div class="section-header">
        <i class="pi pi-sync section-icon"></i>
        <span>Analysis variant loading</span>
      </div>
    </template>
    <template #content>
      <p class="section-description">
        Test slow group-count switching in the real analysis tab layout.
      </p>

      <div class="button-container">
        <PrimeButton
          label="Open loading test"
          icon="pi pi-eye"
          class="test-button"
          @click="navigateToLoadingTest"
        />
      </div>
    </template>
  </PrimeCard>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import { useRouter } from "vue-router";

defineOptions({
  components: {
    PrimeButton: Button,
    PrimeCard: Card,
  },
});

const router = useRouter();

function navigateToLoadingTest(): void {
  void router.push("/dev/analysis-variant-loading-test");
}
</script>

<style scoped lang="scss">
.test-section-card {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);

  .section-icon {
    color: $primary;
  }
}

.section-description {
  margin: 0 0 2rem;
  color: $grey-8;
  font-size: 1rem;
  line-height: 1.5;
}

.button-container {
  display: flex;
  justify-content: center;
}
</style>

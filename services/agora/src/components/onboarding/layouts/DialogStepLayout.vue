<template>
  <div class="dialog-step">
    <div class="header">
      <h2 class="title">{{ title }}</h2>
      <p class="description">{{ description }}</p>
    </div>

    <div class="content">
      <slot />
    </div>

    <div class="footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  description: string;
}

defineProps<Props>();
</script>

<style scoped lang="scss">
.dialog-step {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 70vh;
  min-height: 400px;
}

.header {
  text-align: center;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #1a1a1a;
}

.description {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.25rem;
  margin-right: -0.25rem;
}

.footer {
  flex-shrink: 0;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
}

// Mobile optimizations
@media (max-height: 600px) {
  .dialog-step {
    max-height: 60vh;
    min-height: 350px;
  }

  .title {
    font-size: 18px;
  }

  .description {
    font-size: 13px;
  }
}
</style>

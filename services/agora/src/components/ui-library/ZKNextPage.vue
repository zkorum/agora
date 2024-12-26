<template>
  <div>
    <RouterLink :to="{ name: routeName }">
      <div class="container">
        <div>{{ message }}</div>

        <div>
          <q-icon name="mdi-chevron-right" size="1.5rem" />
        </div>
      </div>
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
  routeName: string;
}>();
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  justify-content: space-between;
  padding-top: 1rem;
  padding-bottom: 1rem;
  color: blue;
}
</style>

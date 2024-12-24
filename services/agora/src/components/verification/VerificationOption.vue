<template>
  <div>
    <RouterLink :to="{ name: routeName }">
      <ZKCard padding="1rem">
        <div class="cardOption">
          <q-icon :name="icon" size="3rem" color="primary" />
          <div class="cardDiv">
            <div class="cardTitle">
              {{ title }}
            </div>

            <div>
              {{ description }}
            </div>
          </div>

          <q-icon
            name="mdi-arrow-right"
            color="color-text-strong"
            size="2rem"
          />
        </div>
      </ZKCard>
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import ZKCard from "../ui-library/ZKCard.vue";

defineProps<{
  title: string;
  description: string;
  icon: string;
  routeName: string;
}>();
</script>

<style scoped lang="scss">
.cardOption {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: space-around;
  align-items: center;
}

.cardTitle {
  font-weight: bold;
}

.cardDiv {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: min(100%, 12rem);
}
</style>

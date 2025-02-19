<template>
  <div class="container">
    <div v-for="settingItem in settingItemList" :key="settingItem.name">
      <RouterLink :to="{ name: settingItem.route }">
        <ZKHoverEffect :enable-hover="true">
          <div class="settingItemStyle">
            <q-icon :name="settingItem.icon" size="1rem" />

            {{ settingItem.name }}
          </div>
        </ZKHoverEffect>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouteMap } from "vue-router";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";

interface SettingItem {
  icon: string;
  name: string;
  route: keyof RouteMap;
}

const settingItemList: SettingItem[] = [
  {
    icon: "mdi-cog",
    name: "Settings",
    route: "/settings/",
  },
];
</script>

<style lang="scss" scoped>
.container {
  padding: 1rem;
}

.settingItemStyle {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
  border-radius: 15px;
}

.settingItemStyle:hover {
  background-color: #f3f4f6;
}
</style>

<template>
  <svg
    width="21"
    height="20"
    viewBox="0 0 21 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      :d="path"
      :fill="fill ? 'url(#paint0_linear_20797_324)' : '#CDCBD3'"
    />
    <defs>
      <linearGradient
        id="paint0_linear_20797_324"
        x1="9.27513"
        y1="11.4585"
        x2="22.2025"
        y2="17.4339"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#6B4EFF" />
        <stop offset="1" stop-color="#4F92F6" />
      </linearGradient>
    </defs>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  path: string;
  fill: boolean;
}>();
</script>

<style lang="scss" scoped></style>

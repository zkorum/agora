<template>
  <span>
    By logging in, you agree to our
    <span class="hrefLink">
      <RouterLink :to="{ name: '/legal/terms/' }"> Terms of Service</RouterLink>
    </span>
    and
    <span class="hrefLink">
      <RouterLink :to="{ name: '/legal/privacy/' }">
        Privacy Policy</RouterLink
      > </span
    >.
  </span>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.hrefLink > a {
  color: $primary;
  text-decoration: underline;
  font-weight: 500;
}
</style>

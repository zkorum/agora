<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
</script>

<svelte:head>
  <title>{m.nav_home()} · Agora</title>
</svelte:head>

<h1>{m.nav_home()}</h1>

<style>
  h1 {
    margin: 0;
    padding: 40px;
    font-size: 32px;
    font-weight: 600;
    line-height: 1.2;
  }
  @media (max-width: 760px) {
    h1 {
      padding: 28px 16px;
      font-size: 28px;
    }
  }
</style>

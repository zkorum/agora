<template>
  <iframe
    :title="title"
    :src="source.kind === 'url' ? source.url : undefined"
    :srcdoc="source.kind === 'html' ? source.html : undefined"
    :sandbox="mode === 'interactive' ? 'allow-scripts' : ''"
    referrerpolicy="no-referrer"
  />
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  mode: "static" | "interactive";
  source: { kind: "url"; url: string } | { kind: "html"; html: string };
}>();
</script>

<template>
    <img
        v-if="imageUrl !== undefined"
        :src="imageUrl"
        :alt="name"
        :width="size"
        :height="size"
        :style="{
            display: 'inline-block',
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            objectFit: 'contain',
            backgroundColor: '#ffffff',
            verticalAlign: 'middle',
        }"
    />
    <span
        v-else
        :aria-label="name"
        :style="{
            display: 'inline-block',
            width: `${size}px`,
            height: `${size}px`,
            lineHeight: `${size}px`,
            borderRadius: '50%',
            textAlign: 'center',
            backgroundColor: color,
            color: '#ffffff',
            fontFamily: 'Arial,sans-serif',
            fontSize: `${Math.round(size / 3)}px`,
            fontWeight: '700',
            verticalAlign: 'middle',
        }"
        >{{ getBrandInitials(name) }}</span
    >
</template>

<script setup lang="ts">
import { getBrandInitials } from "./emailBranding";
defineProps<{
    name: string;
    imageUrl: string | undefined;
    size: number;
    color: string;
}>();
</script>

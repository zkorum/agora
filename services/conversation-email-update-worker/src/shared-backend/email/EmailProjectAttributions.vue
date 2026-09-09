<!-- WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY DIRECTLY! -->
<template>
    <template v-for="section in sections" :key="section.role">
        <h2 style="font-size: 15px; margin: 20px 0 12px">
            {{ section.title }}
        </h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tbody>
                <tr v-for="entry in section.entries" :key="entry.displayName">
                    <td
                        width="48"
                        style="
                            padding-inline-end: 12px;
                            padding-bottom: 12px;
                            vertical-align: middle;
                        "
                    >
                        <BrandAvatar
                            :name="entry.displayName"
                            :image-url="entry.imageUrl"
                            :size="36"
                            color="#525252"
                        />
                    </td>
                    <td
                        style="
                            padding-bottom: 12px;
                            vertical-align: middle;
                            font-size: 14px;
                        "
                    >
                        <a
                            v-if="entry.websiteUrl !== undefined"
                            :href="entry.websiteUrl"
                            style="color: #525252; text-decoration: underline"
                            >{{ entry.displayName }}</a
                        >
                        <span v-else>{{ entry.displayName }}</span>
                    </td>
                </tr>
            </tbody>
        </table>
    </template>
</template>

<script setup lang="ts">
import { computed } from "vue";
import BrandAvatar from "@/shared/branding/BrandAvatar.vue";
import type { EmailBranding } from "@/shared/branding/emailBranding.js";
import {
    projectAttributionSections,
    projectAttributionTranslations,
} from "@/shared/branding/projectAttributionTranslations.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";

const props = defineProps<{
    attributions: NonNullable<EmailBranding["attributions"]>;
    language: SupportedDisplayLanguageCodes;
}>();
const sections = computed(() =>
    projectAttributionSections
        .map((section) => ({
            ...section,
            title: projectAttributionTranslations[props.language][
                section.titleKey
            ],
            entries: props.attributions.filter(
                (entry) => entry.role === section.role,
            ),
        }))
        .filter((section) => section.entries.length > 0),
);
</script>

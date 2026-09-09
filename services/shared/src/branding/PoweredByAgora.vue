<template>
    <span
        >{{ poweredByAgoraTranslations[language] }}{{ " "
        }}<slot
            ><a
                :href="AGORA_WEBSITE_URL"
                style="
                    color: #6b4eff;
                    font-weight: 700;
                    text-decoration: underline;
                "
                >Agora</a
            ></slot
        ></span
    >
</template>

<script setup lang="ts">
import type { SupportedDisplayLanguageCodes } from "../languages";
import {
    AGORA_WEBSITE_URL,
    poweredByAgoraTranslations,
} from "./poweredByAgora";

defineProps<{ language: SupportedDisplayLanguageCodes }>();
</script>

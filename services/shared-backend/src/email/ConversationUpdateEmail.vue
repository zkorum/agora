<template>
    <html :lang="view.language" :dir="view.direction">
        <head>
            <meta charset="utf-8" />
            <meta
                name="viewport"
                content="width=device-width,initial-scale=1"
            />
            <title>{{ view.subject }}</title>
        </head>
        <body
            style="
                margin: 0;
                background: #f6f5f8;
                font-family: Arial, sans-serif;
                color: #262626;
            "
        >
            <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="background: #f6f5f8"
            >
                <tbody>
                    <tr>
                        <td align="center" style="padding: 24px 12px">
                            <table
                                role="presentation"
                                width="100%"
                                cellspacing="0"
                                cellpadding="0"
                                style="
                                    max-width: 640px;
                                    table-layout: fixed;
                                    background: #ffffff;
                                    border-radius: 12px;
                                    overflow: hidden;
                                    overflow-wrap: anywhere;
                                    word-break: break-word;
                                "
                            >
                                <tbody>
                                    <tr
                                        v-if="
                                            view.branding.bannerImageUrl !==
                                            undefined
                                        "
                                    >
                                        <td>
                                            <img
                                                :src="
                                                    view.branding.bannerImageUrl
                                                "
                                                alt=""
                                                width="640"
                                                style="
                                                    display: block;
                                                    width: 100%;
                                                    height: auto;
                                                    border: 0;
                                                "
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="
                                                padding: 24px 24px 12px;
                                            "
                                        >
                                            <table
                                                role="presentation"
                                                width="100%"
                                                cellspacing="0"
                                                cellpadding="0"
                                            >
                                                <tbody>
                                                    <tr>
                                                        <td
                                                            v-if="
                                                                view.branding
                                                                    .scopeKind ===
                                                                'no-project'
                                                            "
                                                            width="48"
                                                            style="
                                                                padding-inline-end: 16px;
                                                                vertical-align: middle;
                                                            "
                                                        >
                                                            <BrandAvatar
                                                                :name="
                                                                    view
                                                                        .branding
                                                                        .name
                                                                "
                                                                :image-url="
                                                                    view
                                                                        .branding
                                                                        .imageUrl
                                                                "
                                                                :size="48"
                                                                color="#525252"
                                                            />
                                                        </td>
                                                        <td
                                                            style="
                                                                vertical-align: middle;
                                                            "
                                                        >
                                                            <p
                                                                style="
                                                                    font-size: 22px;
                                                                    font-weight: 700;
                                                                    line-height: 1.4;
                                                                    margin: 0;
                                                                "
                                                            >
                                                                <a
                                                                    v-if="
                                                                        view
                                                                            .branding
                                                                            .projectUrl !==
                                                                        undefined
                                                                    "
                                                                    :href="
                                                                        view
                                                                            .branding
                                                                            .projectUrl
                                                                    "
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style="
                                                                        color: #262626;
                                                                        text-decoration: underline;
                                                                        text-decoration-color: #d4d4d4;
                                                                        text-underline-offset: 4px;
                                                                    "
                                                                    >{{
                                                                        view
                                                                            .branding
                                                                            .name
                                                                    }}&#160;<span
                                                                        aria-hidden="true"
                                                                        style="
                                                                            display: inline-block;
                                                                            font-size: 16px;
                                                                            font-weight: 400;
                                                                            line-height: 1;
                                                                            color: #737373;
                                                                        "
                                                                        >{{
                                                                            view.direction ===
                                                                            "rtl"
                                                                                ? "↖"
                                                                                : "↗"
                                                                        }}</span
                                                                    ></a
                                                                >
                                                                <template
                                                                    v-else
                                                                    >{{
                                                                        view
                                                                            .branding
                                                                            .name
                                                                    }}</template
                                                                >
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr v-if="view.marker !== undefined">
                                        <td
                                            style="
                                                background: #fff3cd;
                                                color: #664d03;
                                                padding: 12px 24px;
                                                font-weight: 700;
                                            "
                                        >
                                            {{ view.marker }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 0 24px 28px">
                                            <!-- Authored HTML is sanitized by the renderer, never compiled as a Vue template. -->
                                            <div
                                                style="
                                                    font-size: 16px;
                                                    line-height: 1.6;
                                                "
                                                v-html="view.bodyHtml"
                                            ></div>
                                            <hr
                                                style="
                                                    border: 0;
                                                    border-top: 1px solid
                                                        #e5e5e5;
                                                    margin: 28px 0;
                                                "
                                            />
                                            <EmailProjectAttributions
                                                :attributions="
                                                    view.branding
                                                        .attributions ?? []
                                                "
                                                :language="view.language"
                                            />
                                            <h2
                                                style="
                                                    font-size: 17px;
                                                    margin: 20px 0 12px;
                                                "
                                            >
                                                {{ view.copy.conversations }}
                                            </h2>
                                            <ul
                                                style="
                                                    padding-inline-start: 22px;
                                                    margin: 0;
                                                "
                                            >
                                                <li
                                                    v-for="(
                                                        conversation, index
                                                    ) in view.conversations"
                                                    :key="index"
                                                    style="margin: 0 0 8px"
                                                >
                                                    <a
                                                        :href="conversation.url"
                                                        :style="{
                                                            color: palette.start,
                                                            textDecoration:
                                                                'underline',
                                                        }"
                                                        >{{
                                                            conversation.title
                                                        }}</a
                                                    >
                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="
                                                background: #fafafa;
                                                padding: 16px 24px;
                                                font-size: 14px;
                                                line-height: 1.5;
                                                color: #525252;
                                            "
                                        >
                                            <p style="margin: 0 0 8px">
                                                {{
                                                    [
                                                        view.explanation,
                                                        view.copy.reply,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" ")
                                                }}
                                            </p>
                                            <p
                                                v-if="view.actions.length > 0"
                                                style="margin: 0"
                                            >
                                                <span
                                                    v-for="(
                                                        action, index
                                                    ) in view.actions"
                                                    :key="action.label"
                                                    style="
                                                        display: inline-block;
                                                    "
                                                >
                                                    <span
                                                        v-if="index > 0"
                                                        aria-hidden="true"
                                                        >&#160; | &#160;</span
                                                    >
                                                    <a
                                                        :href="action.url"
                                                        style="
                                                            display: inline-block;
                                                            padding: 4px 0;
                                                            color: #525252;
                                                            text-decoration: underline;
                                                        "
                                                        >{{ action.label }}</a
                                                    >
                                                </span>
                                            </p>
                                            <p style="margin: 8px 0 0">
                                                <PoweredByAgora
                                                    :language="view.language"
                                                />
                                            </p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
        </body>
    </html>
</template>

<script setup lang="ts">
import { computed } from "vue";
import BrandAvatar from "@/shared/branding/BrandAvatar.vue";
import PoweredByAgora from "@/shared/branding/PoweredByAgora.vue";
import { projectBrandPalettes } from "@/shared/branding/emailBranding.js";
import type { EmailView } from "./render.js";
import EmailProjectAttributions from "./EmailProjectAttributions.vue";
const props = defineProps<{ view: EmailView }>();
const palette = computed(
    () => projectBrandPalettes[props.view.branding.palette],
);
</script>

/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import type { SupportedDisplayLanguageCodes } from "../languages.js";

export const projectAttributionTranslations = {
    en: {
        sponsorsTitle: "Sponsors",
        projectOwnersTitle: "Project Owners",
        partnersTitle: "Partners",
    },
    es: {
        sponsorsTitle: "Patrocinadores",
        projectOwnersTitle: "Responsables del proyecto",
        partnersTitle: "Socios",
    },
    fr: {
        sponsorsTitle: "Financeurs",
        projectOwnersTitle: "Porteurs du projet",
        partnersTitle: "Partenaires",
    },
    "zh-Hans": {
        sponsorsTitle: "赞助方",
        projectOwnersTitle: "项目负责人",
        partnersTitle: "合作伙伴",
    },
    "zh-Hant": {
        sponsorsTitle: "贊助方",
        projectOwnersTitle: "專案負責人",
        partnersTitle: "合作夥伴",
    },
    ja: {
        sponsorsTitle: "スポンサー",
        projectOwnersTitle: "プロジェクトオーナー",
        partnersTitle: "パートナー",
    },
    ar: {
        sponsorsTitle: "الرعاة",
        projectOwnersTitle: "مالكو المشروع",
        partnersTitle: "الشركاء",
    },
    fa: {
        sponsorsTitle: "حامیان مالی",
        projectOwnersTitle: "مالکان پروژه",
        partnersTitle: "شرکا",
    },
    he: {
        sponsorsTitle: "נותני חסות",
        projectOwnersTitle: "בעלי הפרויקט",
        partnersTitle: "שותפים",
    },
    ky: {
        sponsorsTitle: "Демөөрчүлөр",
        projectOwnersTitle: "Долбоор ээлери",
        partnersTitle: "Өнөктөштөр",
    },
    ru: {
        sponsorsTitle: "Спонсоры",
        projectOwnersTitle: "Владельцы проекта",
        partnersTitle: "Партнеры",
    },
} satisfies Record<
    SupportedDisplayLanguageCodes,
    { sponsorsTitle: string; projectOwnersTitle: string; partnersTitle: string }
>;

export const projectAttributionSections = [
    { role: "sponsor", titleKey: "sponsorsTitle" },
    { role: "project_owner", titleKey: "projectOwnersTitle" },
    { role: "partner", titleKey: "partnersTitle" },
] as const;

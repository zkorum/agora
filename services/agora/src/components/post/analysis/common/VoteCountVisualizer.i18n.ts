import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VoteCountVisualizerTranslations {
  voteCountTitle: string;
  group1: string;
  group2: string;
  group3: string;
  group4: string;
}

export const voteCountVisualizerTranslations: Record<
  SupportedDisplayLanguageCodes,
  VoteCountVisualizerTranslations
> = {
  en: {
    voteCountTitle: "Votes: {count} ({percentage})",
    group1: "Group 1",
    group2: "Group 2",
    group3: "Group 3",
    group4: "Group 4",
  },
  ar: {
    voteCountTitle: "الأصوات: {count} ({percentage})",
    group1: "مجموعة 1",
    group2: "مجموعة 2",
    group3: "مجموعة 3",
    group4: "مجموعة 4",
  },
  es: {
    voteCountTitle: "Votos: {count} ({percentage})",
    group1: "Grupo 1",
    group2: "Grupo 2",
    group3: "Grupo 3",
    group4: "Grupo 4",
  },
  fa: {
    voteCountTitle: "رأی‌ها: {count} ({percentage})",
    group1: "گروه ۱",
    group2: "گروه ۲",
    group3: "گروه ۳",
    group4: "گروه ۴",
  },
  fr: {
    voteCountTitle: "Votes : {count} ({percentage})",
    group1: "Groupe 1",
    group2: "Groupe 2",
    group3: "Groupe 3",
    group4: "Groupe 4",
  },
  "zh-Hans": {
    voteCountTitle: "票数：{count}（{percentage}）",
    group1: "组 1",
    group2: "组 2",
    group3: "组 3",
    group4: "组 4",
  },
  "zh-Hant": {
    voteCountTitle: "票數：{count}（{percentage}）",
    group1: "組 1",
    group2: "組 2",
    group3: "組 3",
    group4: "組 4",
  },
  he: {
    voteCountTitle: "הצבעות: {count} ({percentage})",
    group1: "קבוצה 1",
    group2: "קבוצה 2",
    group3: "קבוצה 3",
    group4: "קבוצה 4",
  },
  ja: {
    voteCountTitle: "票数: {count} ({percentage})",
    group1: "グループ 1",
    group2: "グループ 2",
    group3: "グループ 3",
    group4: "グループ 4",
  },
  ky: {
    voteCountTitle: "Добуштардын саны: {count} ({percentage})",
    group1: "Топ 1",
    group2: "Топ 2",
    group3: "Топ 3",
    group4: "Топ 4",
  },
  ru: {
    voteCountTitle: "Голосов: {count} ({percentage})",
    group1: "Группа 1",
    group2: "Группа 2",
    group3: "Группа 3",
    group4: "Группа 4",
  },
};

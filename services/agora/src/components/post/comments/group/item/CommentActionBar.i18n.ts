export interface CommentActionBarTranslations {
  disagree: string;
  pass: string;
  agree: string;
  voteChangeDisabled: string;
  disagreeAriaLabel: string;
  passAriaLabel: string;
  agreeAriaLabel: string;
}

export const commentActionBarTranslations: Record<
  string,
  CommentActionBarTranslations
> = {
  en: {
    disagree: "Disagree",
    pass: "Pass",
    agree: "Agree",
    voteChangeDisabled: "Vote change temporarily disabled",
    disagreeAriaLabel: "Disagree with comment. Current disagrees:",
    passAriaLabel: "Pass on comment. Current passes:",
    agreeAriaLabel: "Agree with comment. Current agrees:",
  },
  ar: {
    disagree: "ترجمة: Disagree",
    pass: "ترجمة: Pass",
    agree: "ترجمة: Agree",
    voteChangeDisabled: "ترجمة: Vote change temporarily disabled",
    disagreeAriaLabel: "ترجمة: Disagree with comment. Current disagrees:",
    passAriaLabel: "ترجمة: Pass on comment. Current passes:",
    agreeAriaLabel: "ترجمة: Agree with comment. Current agrees:",
  },
  es: {
    disagree: "En desacuerdo",
    pass: "Pasar",
    agree: "De acuerdo",
    voteChangeDisabled: "Cambio de voto temporalmente deshabilitado",
    disagreeAriaLabel: "En desacuerdo con el comentario. Desacuerdos actuales:",
    passAriaLabel: "Pasar del comentario. Pases actuales:",
    agreeAriaLabel: "De acuerdo con el comentario. Acuerdos actuales:",
  },
  fr: {
    disagree: "Pas d'accord",
    pass: "Passer",
    agree: "D'accord",
    voteChangeDisabled: "Changement de vote temporairement désactivé",
    disagreeAriaLabel: "Pas d'accord avec le commentaire. Désaccords actuels:",
    passAriaLabel: "Passer le commentaire. Passes actuels:",
    agreeAriaLabel: "D'accord avec le commentaire. Accords actuels:",
  },
  "zh-Hans": {
    disagree: "不同意",
    pass: "跳过",
    agree: "同意",
    voteChangeDisabled: "投票更改暂时禁用",
    disagreeAriaLabel: "不同意此评论。当前不同意数：",
    passAriaLabel: "跳过此评论。当前跳过数：",
    agreeAriaLabel: "同意此评论。当前同意数：",
  },
  "zh-Hant": {
    disagree: "不同意",
    pass: "跳過",
    agree: "同意",
    voteChangeDisabled: "投票更改暫時禁用",
    disagreeAriaLabel: "不同意此評論。當前不同意數：",
    passAriaLabel: "跳過此評論。當前跳過數：",
    agreeAriaLabel: "同意此評論。當前同意數：",
  },
  ja: {
    disagree: "不同意",
    pass: "スキップ",
    agree: "同意",
    voteChangeDisabled: "投票変更が一時的に無効化されています",
    disagreeAriaLabel: "コメントに不同意。現在の不同意数：",
    passAriaLabel: "コメントをスキップ。現在のスキップ数：",
    agreeAriaLabel: "コメントに同意。現在の同意数：",
  },
};

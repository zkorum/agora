export interface Step5ExperienceTranslations {
  title: string;
  safeSpaceTitle: string;
  safeSpaceDescription: string;
  braveSpaceTitle: string;
  braveSpaceDescription: string;
}

export const step5ExperienceTranslations: Record<
  string,
  Step5ExperienceTranslations
> = {
  en: {
    title: "Choose how you want to experience Agora",
    safeSpaceTitle: "Safe Space",
    safeSpaceDescription:
      "Content flagged as antisocial (trolling or intolerance) is removed from my feed. If I want to see what was removed, I can check the post's moderation history.",
    braveSpaceTitle: "Brave Space",
    braveSpaceDescription:
      "Content flagged as antisocial is shown to me with a warning.",
  },
  es: {
    title: "Elija cómo quiere experimentar Agora",
    safeSpaceTitle: "Espacio seguro",
    safeSpaceDescription:
      "El contenido marcado como antisocial (trolling o intolerancia) se elimina de su feed. Si desea ver lo que fue eliminado, puede revisar el historial de moderación de la publicación.",
    braveSpaceTitle: "Espacio valiente",
    braveSpaceDescription:
      "El contenido marcado como antisocial se le muestra con una advertencia.",
  },
  fr: {
    title: "Choisissez comment vous voulez vivre Agora",
    safeSpaceTitle: "Espace Sûr",
    safeSpaceDescription:
      "Le contenu signalé comme antisocial (trolling ou intolérance) est supprimé de mon flux. Si je veux voir ce qui a été supprimé, je peux consulter l'historique de modération de la publication.",
    braveSpaceTitle: "Espace Courageux",
    braveSpaceDescription:
      "Le contenu signalé comme antisocial m'est montré avec un avertissement.",
  },
  "zh-CN": {
    title: "选择您希望如何体验 Agora",
    safeSpaceTitle: "安全空间",
    safeSpaceDescription: "被标记为反社会（挑衅或不宽容）的内容会被从我的 feed 中删除。如果我想查看被删除的内容，我可以检查帖子的 moderation 历史。",
    braveSpaceTitle: "勇敢空间",
    braveSpaceDescription: "被标记为反社会的内容会显示给我，并带有警告。",
  },
  "zh-TW": {
    title: "選擇您希望如何體驗 Agora",
    safeSpaceTitle: "安全空間",
    safeSpaceDescription: "被標記為反社會（挑釁或不寬容）的內容會被從我的 feed 中刪除。如果我想查看被刪除的內容，我可以檢查帖子的 moderation 歷史。",
    braveSpaceTitle: "勇敢空間",
    braveSpaceDescription: "被標記為反社會的內容會顯示給我，並帶有警告。",
  },
  ja: {
    title: "Agora をどのように体験したいですか",
    safeSpaceTitle: "安全な空間",
    safeSpaceDescription: "反社会的（挑発や不寛容）とフラグ付けされたコンテンツは、フィードから削除されます。削除されたコンテンツを確認したい場合は、投稿の moderation 履歴を確認できます。",
    braveSpaceTitle: "勇敢な空間",
    braveSpaceDescription: "反社会的とフラグ付けされたコンテンツは、警告とともに表示されます。",
  },
};

import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommonGroundInformationDialogTranslations {
  title: string;
  description: string;
}

export const commonGroundInformationDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommonGroundInformationDialogTranslations
> = {
  en: {
    title: "Common Ground",
    description:
      "A ranked list of opinions that people from different sides respond to in similar ways, whether agreeing or disagreeing, highlighting shared alignment across divides.",
  },
  ar: {
    title: "أرضية مشتركة",
    description:
      "قائمة مرتبة من الآراء التي يستجيب لها الأشخاص من مجموعات رأي مختلفة بطرق متشابهة، سواء بالموافقة أو الرفض، مما يبرز التوافق المشترك عبر الاختلافات.",
  },
  es: {
    title: "Puntos en Común",
    description:
      "Lista ordenada de opiniones a las que personas de distintos grupos de opinión responden de forma similar, ya sea en acuerdo o desacuerdo, resaltando alineamientos compartidos más allá de las diferencias.",
  },
  fr: {
    title: "Points Communs",
    description:
      "Liste ordonnée d'opinions auxquelles les personnes de différents groupes d'opinion réagissent de manière similaire, qu'elles soient d'accord ou non, mettant en lumière les convergences au-delà des clivages.",
  },
  "zh-Hans": {
    title: "共识",
    description:
      "不同观点群体的人们以相似方式回应的意见排名列表，无论赞成或反对，突显跨越分歧的共同立场。",
  },
  "zh-Hant": {
    title: "共識",
    description:
      "不同觀點群體的人們以相似方式回應的意見排名列表，無論贊成或反對，突顯跨越分歧的共同立場。",
  },
  ja: {
    title: "共通認識",
    description:
      "異なる意見グループの人々が、賛成・反対を問わず同様に反応する意見のランキングリスト。分断を超えた共通の立場を浮き彫りにします。",
  },
};

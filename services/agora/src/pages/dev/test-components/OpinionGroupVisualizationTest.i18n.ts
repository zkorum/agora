import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OpinionGroupVisualizationTestTranslations {
  opinionGroupVisualization: string;
  opinionGroupVisualizationDescription: string;
  openVisualizationButton: string;
}

export const opinionGroupVisualizationTestTranslations: Record<
  SupportedDisplayLanguageCodes,
  OpinionGroupVisualizationTestTranslations
> = {
  en: {
    opinionGroupVisualization: "Opinion Group Visualization",
    opinionGroupVisualizationDescription:
      "Test the OpinionGroupTab component with different cluster configurations to see how it adapts its layout.",
    openVisualizationButton: "Open Visualization Tool",
  },
  ar: {
    opinionGroupVisualization: "ترجمة: Opinion Group Visualization",
    opinionGroupVisualizationDescription:
      "ترجمة: Test the OpinionGroupTab component with different cluster configurations to see how it adapts its layout.",
    openVisualizationButton: "ترجمة: Open Visualization Tool",
  },
  es: {
    opinionGroupVisualization: "Visualización de Grupos de Opinión",
    opinionGroupVisualizationDescription:
      "Pruebe el componente OpinionGroupTab con diferentes configuraciones de clusters para ver cómo adapta su diseño.",
    openVisualizationButton: "Abrir Herramienta de Visualización",
  },
  fr: {
    opinionGroupVisualization: "Visualisation des Groupes d'Opinion",
    opinionGroupVisualizationDescription:
      "Testez le composant OpinionGroupTab avec différentes configurations de clusters pour voir comment il adapte sa mise en page.",
    openVisualizationButton: "Ouvrir l'Outil de Visualisation",
  },
  "zh-Hans": {
    opinionGroupVisualization: "意见群组可视化",
    opinionGroupVisualizationDescription:
      "使用不同的集群配置测试 OpinionGroupTab 组件，以查看其如何调整布局。",
    openVisualizationButton: "打开可视化工具",
  },
  "zh-Hant": {
    opinionGroupVisualization: "意見群組視覺化",
    opinionGroupVisualizationDescription:
      "使用不同的集群配置測試 OpinionGroupTab 組件，以查看其如何調整佈局。",
    openVisualizationButton: "打開視覺化工具",
  },
  ja: {
    opinionGroupVisualization: "意見グループ可視化",
    opinionGroupVisualizationDescription:
      "異なるクラスター構成でOpinionGroupTabコンポーネントをテストして、レイアウトがどのように適応するかを確認します。",
    openVisualizationButton: "可視化ツールを開く",
  },
};

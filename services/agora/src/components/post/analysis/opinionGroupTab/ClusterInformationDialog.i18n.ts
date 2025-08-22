export interface ClusterInformationDialogTranslations {
  title: string;
  description1: string;
  description2: string;
}

export const clusterInformationDialogTranslations: Record<
  string,
  ClusterInformationDialogTranslations
> = {
  en: {
    title: "Consensus Groups",
    description1:
      "Consensus groups are created based on how people agree and disagree with opinions.",
    description2:
      "We use machine learning to identify different schools of thought. This is the very same algorithm powering pol.is, the open-source wikisurvey tool developed by Computational Democracy.",
  },
  es: {
    title: "Grupos de Consenso",
    description1:
      "Los grupos de consenso se crean basándose en cómo las personas están de acuerdo y en desacuerdo con las opiniones.",
    description2:
      "Utilizamos aprendizaje automático para identificar diferentes escuelas de pensamiento. Este es el mismo algoritmo que impulsa pol.is, la herramienta de encuesta wiki de código abierto desarrollada por Computational Democracy.",
  },
  fr: {
    title: "Groupes de Consensus",
    description1:
      "Les groupes de consensus sont créés en fonction de la façon dont les gens sont d'accord et en désaccord avec les opinions.",
    description2:
      "Nous utilisons l'apprentissage automatique pour identifier différentes écoles de pensée. C'est le même algorithme qui alimente pol.is, l'outil de sondage wiki open-source développé par Computational Democracy.",
  },
};

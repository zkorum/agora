export interface VoteCountVisualizerTranslations {
  votes: string;
  group1: string;
  group2: string;
  group3: string;
  group4: string;
  [key: string]: string;
}

export const voteCountVisualizerTranslations: Record<
  string,
  VoteCountVisualizerTranslations
> = {
  en: {
    votes: "votes",
    group1: "Group 1",
    group2: "Group 2",
    group3: "Group 3",
    group4: "Group 4",
  },
  es: {
    votes: "votos",
    group1: "Grupo 1",
    group2: "Grupo 2",
    group3: "Grupo 3",
    group4: "Grupo 4",
  },
  fr: {
    votes: "votes",
    group1: "Groupe 1",
    group2: "Groupe 2",
    group3: "Groupe 3",
    group4: "Groupe 4",
  },
};

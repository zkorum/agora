export interface NotificationTranslations {
  notifications: string;
  endOfFeed: string;
  noNotifications: string;
  contributedOpinion: string;
  onePersonVoted: string;
  peopleVoted: string;
  [key: string]: string;
}

export const notificationTranslations: Record<
  string,
  NotificationTranslations
> = {
  en: {
    notifications: "Notifications",
    endOfFeed: "End of notification feed",
    noNotifications: "You have no notifications",
    contributedOpinion: "contributed an opinion to your conversation:",
    onePersonVoted: "1 person voted on your opinion:",
    peopleVoted: "people voted on your opinion:",
  },
  es: {
    notifications: "Notificaciones",
    endOfFeed: "Fin del feed de notificaciones",
    noNotifications: "No tienes notificaciones",
    contributedOpinion: "contribuyó con una opinión a tu conversación:",
    onePersonVoted: "1 persona votó en tu opinión:",
    peopleVoted: "personas votaron en tu opinión:",
  },
  fr: {
    notifications: "Notifications",
    endOfFeed: "Fin du flux de notifications",
    noNotifications: "Vous n'avez aucune notification",
    contributedOpinion: "a contribué avec une opinion à votre conversation :",
    onePersonVoted: "1 personne a voté sur votre opinion :",
    peopleVoted: "personnes ont voté sur votre opinion :",
  },
};

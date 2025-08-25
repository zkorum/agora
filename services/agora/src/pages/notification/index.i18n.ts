export interface NotificationTranslations {
  notifications: string;
  endOfFeed: string;
  noNotifications: string;
  contributedOpinion: string;
  onePersonVoted: string;
  peopleVoted: string;
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
    noNotifications: "No tiene notificaciones",
    contributedOpinion: "contribuyó con una opinión a su conversación:",
    onePersonVoted: "1 persona votó en su opinión:",
    peopleVoted: "personas votaron en su opinión:",
  },
  fr: {
    notifications: "Notifications",
    endOfFeed: "Fin du flux de notifications",
    noNotifications: "Vous n'avez aucune notification",
    contributedOpinion: "a contribué une opinion à votre conversation :",
    onePersonVoted: "1 personne a voté sur votre opinion :",
    peopleVoted: "personnes ont voté sur votre opinion :",
  },
  "zh-CN": {
    notifications: "通知",
    endOfFeed: "通知列表结束",
    noNotifications: "您没有通知",
    contributedOpinion: "为您的对话贡献了意见：",
    onePersonVoted: "1 人为您的意见投票：",
    peopleVoted: "人为您的意见投票：",
  },
  "zh-TW": {
    notifications: "通知",
    endOfFeed: "通知列表結束",
    noNotifications: "您沒有通知",
    contributedOpinion: "為您的對話貢獻了意見：",
    onePersonVoted: "1 人為您的意見投票：",
    peopleVoted: "人為您的意見投票：",
  },
  ja: {
    notifications: "通知",
    endOfFeed: "通知フィードの終了",
    noNotifications: "通知はありません",
    contributedOpinion: "あなたの会話に意見を投稿しました：",
    onePersonVoted: "1人があなたの意見に投票しました：",
    peopleVoted: "人があなたの意見に投票しました：",
  },
};

import {
  getDisplayLanguageFallbackChain,
  parseSupportedDisplayLanguageOrUndefined,
  type SupportedDisplayLanguageCodes,
} from "src/shared/languages";

export interface ProjectPageTranslations {
  languageLabel: string;
  languageDialogTitle: string;
  languageSearchPlaceholder: string;
  bannerImageAlt: string;
  liveConsultation: string;
  closedConsultation: string;
  participantsJoined: string;
  activitiesCount: string;
  votesCount: string;
  activitiesTitle: string;
  emptyActivities: string;
  allActivitiesLoaded: string;
  projectDetailsAriaLabel: string;
  behindThisTitle: string;
  sponsorsTitle: string;
  projectOwnersTitle: string;
  partnersTitle: string;
  projectContactTitle: string;
  poweredBy: string;
  homeAriaLabel: string;
  contentOwnedByProjectOwners: string;
  activityStatisticsAriaLabel: string;
  conversationType: string;
  voteType: string;
  closedStatus: string;
  openStatus: string;
  statementsCount: string;
  participantsCount: string;
  viewAction: string;
  joinAction: string;
  voteAction: string;
  activityActionAriaLabel: string;
  openWebsiteAriaLabel: string;
  contactImageAlt: string;
  emailContactLabel: string;
  emailContactAriaLabel: string;
  contactPageLabel: string;
  contactPageAriaLabel: string;
}

export const projectPageTranslations: Readonly<
  Partial<Record<SupportedDisplayLanguageCodes, ProjectPageTranslations>> & {
    en: ProjectPageTranslations;
  }
> = {
  en: {
    languageLabel: "Language",
    languageDialogTitle: "Display language",
    languageSearchPlaceholder: "Search languages",
    bannerImageAlt: "{title} banner",
    liveConsultation: "Live consultation",
    closedConsultation: "Closed consultation",
    participantsJoined: "{count} participants have joined",
    activitiesCount: "{count} activities",
    votesCount: "{count} votes",
    activitiesTitle: "Activities",
    emptyActivities: "No activities have been published yet.",
    allActivitiesLoaded: "All activities loaded",
    projectDetailsAriaLabel: "Project details",
    behindThisTitle: "Who is behind this",
    sponsorsTitle: "Sponsors",
    projectOwnersTitle: "Project Owners",
    partnersTitle: "Partners",
    projectContactTitle: "Project contact",
    poweredBy: "Powered by",
    homeAriaLabel: "Go to Agora Citizen Network home",
    contentOwnedByProjectOwners:
      "Project content is owned by the Project Owners",
    activityStatisticsAriaLabel: "Activity statistics",
    conversationType: "Conversation",
    voteType: "Vote",
    closedStatus: "Closed",
    openStatus: "Open",
    statementsCount: "{count} statements",
    participantsCount: "{count} participants",
    viewAction: "View",
    joinAction: "Join",
    voteAction: "Vote",
    activityActionAriaLabel: "{action} {title}",
    openWebsiteAriaLabel: "Open {name} website",
    contactImageAlt: "{name} image",
    emailContactLabel: "Email contact",
    emailContactAriaLabel: "Email {name}",
    contactPageLabel: "Contact page",
    contactPageAriaLabel: "Open {name} contact page",
  },
  ky: {
    languageLabel: "Тил",
    languageDialogTitle: "Көрсөтүү тили",
    languageSearchPlaceholder: "Тилдерди издөө",
    bannerImageAlt: "{title} баннери",
    liveConsultation: "Жандуу консультация",
    closedConsultation: "Жабылган консультация",
    participantsJoined: "{count} катышуучу кошулду",
    activitiesCount: "{count} иш-чара",
    votesCount: "{count} добуш",
    activitiesTitle: "Иш-чаралар",
    emptyActivities: "Азырынча иш-чаралар жарыялана элек.",
    allActivitiesLoaded: "Бардык иш-чаралар жүктөлдү",
    projectDetailsAriaLabel: "Долбоор тууралуу маалымат",
    behindThisTitle: "Бул долбоордун артында ким турат",
    sponsorsTitle: "Демөөрчүлөр",
    projectOwnersTitle: "Долбоор ээлери",
    partnersTitle: "Өнөктөштөр",
    projectContactTitle: "Долбоор байланышы",
    poweredBy: "Түзгөн",
    homeAriaLabel: "Agora Citizen Network башкы бетине өтүү",
    contentOwnedByProjectOwners: "Долбоордун мазмуну Долбоор ээлерине таандык",
    activityStatisticsAriaLabel: "Иш-чара статистикасы",
    conversationType: "Талкуу",
    voteType: "Добуш берүү",
    closedStatus: "Жабык",
    openStatus: "Ачык",
    statementsCount: "{count} пикир",
    participantsCount: "{count} катышуучу",
    viewAction: "Көрүү",
    joinAction: "Кошулуу",
    voteAction: "Добуш берүү",
    activityActionAriaLabel: "{action}: {title}",
    openWebsiteAriaLabel: "{name} веб-сайтын ачуу",
    contactImageAlt: "{name} сүрөтү",
    emailContactLabel: "Email аркылуу байланышуу",
    emailContactAriaLabel: "{name} дарегине email жазуу",
    contactPageLabel: "Байланыш барагы",
    contactPageAriaLabel: "{name} байланыш барагын ачуу",
  },
  ru: {
    languageLabel: "Язык",
    languageDialogTitle: "Язык отображения",
    languageSearchPlaceholder: "Поиск языков",
    bannerImageAlt: "Баннер: {title}",
    liveConsultation: "Живая консультация",
    closedConsultation: "Закрытая консультация",
    participantsJoined: "{count} участников присоединились",
    activitiesCount: "{count} активности",
    votesCount: "{count} голосов",
    activitiesTitle: "Активности",
    emptyActivities: "Активности пока не опубликованы.",
    allActivitiesLoaded: "Все активности загружены",
    projectDetailsAriaLabel: "Информация о проекте",
    behindThisTitle: "Кто за этим стоит",
    sponsorsTitle: "Спонсоры",
    projectOwnersTitle: "Владельцы проекта",
    partnersTitle: "Партнеры",
    projectContactTitle: "Контакт проекта",
    poweredBy: "Работает на",
    homeAriaLabel: "Перейти на главную Agora Citizen Network",
    contentOwnedByProjectOwners:
      "Содержание проекта принадлежит владельцам проекта",
    activityStatisticsAriaLabel: "Статистика активности",
    conversationType: "Обсуждение",
    voteType: "Голосование",
    closedStatus: "Закрыто",
    openStatus: "Открыто",
    statementsCount: "{count} высказываний",
    participantsCount: "{count} участников",
    viewAction: "Посмотреть",
    joinAction: "Присоединиться",
    voteAction: "Голосовать",
    activityActionAriaLabel: "{action}: {title}",
    openWebsiteAriaLabel: "Открыть сайт: {name}",
    contactImageAlt: "Изображение: {name}",
    emailContactLabel: "Написать контакту",
    emailContactAriaLabel: "Написать {name}",
    contactPageLabel: "Страница контактов",
    contactPageAriaLabel: "Открыть страницу контактов: {name}",
  },
};

export function translateProjectPageText({
  languageCode,
  key,
  params = {},
}: {
  languageCode: string;
  key: keyof ProjectPageTranslations;
  params?: Readonly<Record<string, string | number>>;
}): string {
  const parsedLanguageCode =
    parseSupportedDisplayLanguageOrUndefined(languageCode);
  const fallbackLanguageCode: SupportedDisplayLanguageCodes = "en";
  const languageChain =
    parsedLanguageCode === undefined
      ? [fallbackLanguageCode]
      : [
          ...getDisplayLanguageFallbackChain({
            languageCode: parsedLanguageCode,
          }),
          fallbackLanguageCode,
        ];

  let translation = projectPageTranslations.en[key];

  for (const nextLanguageCode of languageChain) {
    const nextTranslation = projectPageTranslations[nextLanguageCode]?.[key];
    if (nextTranslation !== undefined) {
      translation = nextTranslation;
      break;
    }
  }

  for (const [paramKey, paramValue] of Object.entries(params)) {
    translation = translation.replace(
      new RegExp(`\\{${paramKey}\\}`, "g"),
      String(paramValue)
    );
  }

  return translation;
}

export function formatProjectPageNumber({
  languageCode,
  value,
}: {
  languageCode: string;
  value: number;
}): string {
  const parsedLanguageCode =
    parseSupportedDisplayLanguageOrUndefined(languageCode);
  return getProjectPageNumberFormatter({
    languageCode: parsedLanguageCode ?? "en",
  }).format(value);
}

const numberFormatters = new Map<string, Intl.NumberFormat>();

function getProjectPageNumberFormatter({
  languageCode,
}: {
  languageCode: SupportedDisplayLanguageCodes;
}): Intl.NumberFormat {
  const existingFormatter = numberFormatters.get(languageCode);
  if (existingFormatter !== undefined) return existingFormatter;

  const formatter = new Intl.NumberFormat(languageCode);
  numberFormatters.set(languageCode, formatter);
  return formatter;
}

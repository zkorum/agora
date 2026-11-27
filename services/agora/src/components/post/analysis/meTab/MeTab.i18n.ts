import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface MeTabTranslations {
  whereDoIStandTitle: string;
  notAssignedToGroup: string;
  youAgreeWith: string;
  // Vote banner
  voteToUnlock: string;
  keepVotingToRefineAnalysis: string;
  voteMore: string;
}

export const meTabTranslations: Record<
  SupportedDisplayLanguageCodes,
  MeTabTranslations
> = {
  en: {
    whereDoIStandTitle: "Where do I stand",
    notAssignedToGroup: "You are not assigned to any group",
    youAgreeWith: "You agree with {group}",
    voteToUnlock: "Vote on more statements to unlock",
    keepVotingToRefineAnalysis: "Keep voting to refine the analysis",
    voteMore: "Vote more",
  },
  de: {
    whereDoIStandTitle: "Wo stehe ich?",
    notAssignedToGroup: "Sie sind noch keiner Meinungsgruppe zugeordnet.",
    youAgreeWith: "Ihre Stimmen ähneln denen der folgenden Gruppe: {group}",
    voteToUnlock: "Stimmen Sie über weitere Aussagen ab, um Ihre Gruppenanalyse zu sehen.",
    keepVotingToRefineAnalysis:
      "Jede weitere Stimme macht die Analyse genauer.",
    voteMore: "Weiter abstimmen",
  },
  hi: {
    whereDoIStandTitle: "मेरी राय कहाँ मिलती है?",
    notAssignedToGroup: "अभी आप किसी मत समूह में नहीं हैं।",
    youAgreeWith: "आपके मत “{group}” के मतों से मिलते हैं।",
    voteToUnlock: "अपना समूह विश्लेषण देखने के लिए और कथनों पर मत दें।",
    keepVotingToRefineAnalysis:
      "आप जितने अधिक कथनों पर मत देंगे, विश्लेषण उतना ही सटीक होगा।",
    voteMore: "और कथनों पर मत दें",
  },
  ar: {
    whereDoIStandTitle: "أين أقف",
    notAssignedToGroup: "لم يتم تعيينك في أي مجموعة",
    youAgreeWith: "أنت توافق على {group}",
    voteToUnlock: "صوّت على المزيد من العبارات لفتح التحليل",
    keepVotingToRefineAnalysis: "واصل التصويت لتحسين التحليل",
    voteMore: "صوّت أكثر",
  },
  es: {
    whereDoIStandTitle: "¿Dónde me sitúo?",
    notAssignedToGroup: "No está asignado a ningún grupo",
    youAgreeWith: "Está de acuerdo con {group}",
    voteToUnlock: "Vote más proposiciones para desbloquear",
    keepVotingToRefineAnalysis: "Siga votando para refinar el análisis",
    voteMore: "Vote más",
  },
  fa: {
    whereDoIStandTitle: "جایگاه من",
    notAssignedToGroup: "شما به هیچ گروهی اختصاص داده نشده‌اید",
    youAgreeWith: "شما موافق هستید با {group}",
    voteToUnlock: "برای باز کردن قفل، به گزاره‌های بیشتری رأی دهید",
    keepVotingToRefineAnalysis: "برای دقیق‌تر شدن تحلیل به رأی‌گیری ادامه دهید",
    voteMore: "رأی‌گیری بیشتر",
  },
  fr: {
    whereDoIStandTitle: "Où je me situe",
    notAssignedToGroup: "Vous n'êtes assigné à aucun groupe",
    youAgreeWith: "Vous êtes d'accord avec {group}",
    voteToUnlock: "Votez sur plus de propositions pour débloquer",
    keepVotingToRefineAnalysis: "Continuez à voter pour affiner l'analyse",
    voteMore: "Votez plus",
  },
  "zh-Hans": {
    whereDoIStandTitle: "我的立场",
    notAssignedToGroup: "您未被分配到任何群组",
    youAgreeWith: "您同意 {group}",
    voteToUnlock: "对更多意见投票以解锁",
    keepVotingToRefineAnalysis: "继续投票以完善分析",
    voteMore: "投票更多",
  },
  "zh-Hant": {
    whereDoIStandTitle: "我的立場",
    notAssignedToGroup: "您未被分配到任何群組",
    youAgreeWith: "您同意 {group}",
    voteToUnlock: "對更多意見投票以解鎖",
    keepVotingToRefineAnalysis: "繼續投票以完善分析",
    voteMore: "投票更多",
  },
  he: {
    whereDoIStandTitle: "איפה אני עומד/ת",
    notAssignedToGroup: "לא שויכת לאף קבוצה",
    youAgreeWith: "אתם מסכימים עם {group}",
    voteToUnlock: "הצביעו על עוד הצהרות כדי לפתוח",
    keepVotingToRefineAnalysis: "המשיכו להצביע כדי לחדד את הניתוח",
    voteMore: "הצביעו עוד",
  },
  ja: {
    whereDoIStandTitle: "私の立場",
    notAssignedToGroup: "グループに割り当てられていません",
    youAgreeWith: "あなたは同意します {group}",
    voteToUnlock: "もっと意見に投票して解除する",
    keepVotingToRefineAnalysis: "投票を続けて分析を改善する",
    voteMore: "もっと投票する",
  },
  ky: {
    whereDoIStandTitle: "Менин позициям",
    notAssignedToGroup: "Сиз эч бир топко дайындалган жоксуз",
    youAgreeWith: "Сиз макулсуз {group}",
    voteToUnlock: "Ачуу үчүн көбүрөөк пикирлерге добуш бериңиз",
    keepVotingToRefineAnalysis: "Анализди тактоо үчүн добуш берүүнү улантыңыз",
    voteMore: "Көбүрөөк добуш бериңиз",
  },
  ru: {
    whereDoIStandTitle: "Моя позиция",
    notAssignedToGroup: "Вы не распределены ни в одну группу",
    youAgreeWith: "Вы согласны с {group}",
    voteToUnlock: "Голосуйте за больше высказываний, чтобы разблокировать",
    keepVotingToRefineAnalysis: "Продолжайте голосовать для уточнения анализа",
    voteMore: "Голосовать ещё",
  },
};

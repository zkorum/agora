import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AppTranslations {
  connectionLost: string;
  reconnecting: string;
  retrying: string;
  connected: string;
  retryNow: string;
}

export const appTranslations: Record<
  SupportedDisplayLanguageCodes,
  AppTranslations
> = {
  en: {
    connectionLost: "Connection lost",
    reconnecting: "Reconnecting...",
    retrying: "Retrying...",
    connected: "Connected",
    retryNow: "Retry now",
  },
  ar: {
    connectionLost: "انقطع الاتصال",
    reconnecting: "جارٍ إعادة الاتصال...",
    retrying: "جارٍ إعادة المحاولة...",
    connected: "متصل",
    retryNow: "أعد المحاولة الآن",
  },
  es: {
    connectionLost: "Conexión perdida",
    reconnecting: "Reconectando...",
    retrying: "Reintentando...",
    connected: "Conectado",
    retryNow: "Reintentar ahora",
  },
  fr: {
    connectionLost: "Connexion perdue",
    reconnecting: "Reconnexion en cours...",
    retrying: "Nouvelle tentative...",
    connected: "Connecté",
    retryNow: "Réessayer maintenant",
  },
  "zh-Hans": {
    connectionLost: "连接已断开",
    reconnecting: "正在重新连接...",
    retrying: "正在重试...",
    connected: "已连接",
    retryNow: "立即重试",
  },
  "zh-Hant": {
    connectionLost: "連線已中斷",
    reconnecting: "正在重新連線...",
    retrying: "正在重試...",
    connected: "已連線",
    retryNow: "立即重試",
  },
  ja: {
    connectionLost: "接続が切断されました",
    reconnecting: "再接続中...",
    retrying: "再試行中...",
    connected: "接続されました",
    retryNow: "今すぐ再試行",
  },
  ky: {
    connectionLost: "Байланыш үзүлдү",
    reconnecting: "Кайра туташууда...",
    retrying: "Кайра аракет кылынууда...",
    connected: "Туташты",
    retryNow: "Азыр кайра аракет кыл",
  },
  ru: {
    connectionLost: "Соединение потеряно",
    reconnecting: "Переподключение...",
    retrying: "Повторная попытка...",
    connected: "Подключено",
    retryNow: "Повторить сейчас",
  },
};

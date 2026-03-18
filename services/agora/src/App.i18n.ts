import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AppTranslations {
  connectionLost: string;
  reconnecting: string;
  connected: string;
}

export const appTranslations: Record<
  SupportedDisplayLanguageCodes,
  AppTranslations
> = {
  en: {
    connectionLost: "Connection lost",
    reconnecting: "Reconnecting...",
    connected: "Connected",
  },
  ar: {
    connectionLost: "انقطع الاتصال",
    reconnecting: "جارٍ إعادة الاتصال...",
    connected: "متصل",
  },
  es: {
    connectionLost: "Conexión perdida",
    reconnecting: "Reconectando...",
    connected: "Conectado",
  },
  fr: {
    connectionLost: "Connexion perdue",
    reconnecting: "Reconnexion en cours...",
    connected: "Connecté",
  },
  "zh-Hans": {
    connectionLost: "连接已断开",
    reconnecting: "正在重新连接...",
    connected: "已连接",
  },
  "zh-Hant": {
    connectionLost: "連線已中斷",
    reconnecting: "正在重新連線...",
    connected: "已連線",
  },
  ja: {
    connectionLost: "接続が切断されました",
    reconnecting: "再接続中...",
    connected: "接続されました",
  },
  ky: {
    connectionLost: "Байланыш үзүлдү",
    reconnecting: "Кайра туташууда...",
    connected: "Туташты",
  },
  ru: {
    connectionLost: "Соединение потеряно",
    reconnecting: "Переподключение...",
    connected: "Подключено",
  },
};

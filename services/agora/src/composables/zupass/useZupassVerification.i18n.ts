import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UseZupassVerificationTranslations {
  connectionCancelled: string;
  dialogClosedWithoutApproval: string;
  failedToConnect: string;
}

export const useZupassVerificationTranslations: Record<
  SupportedDisplayLanguageCodes,
  UseZupassVerificationTranslations
> = {
  en: {
    connectionCancelled: "Connection cancelled by user",
    dialogClosedWithoutApproval: "Dialog closed without approving permissions",
    failedToConnect: "Failed to connect",
  },
  ar: {
    connectionCancelled: "ألغى المستخدم الاتصال",
    dialogClosedWithoutApproval: "أُغلق مربع الحوار دون الموافقة على الأذونات",
    failedToConnect: "فشل الاتصال",
  },
  es: {
    connectionCancelled: "El usuario canceló la conexión",
    dialogClosedWithoutApproval: "Se cerró el diálogo sin aprobar los permisos",
    failedToConnect: "No se pudo conectar",
  },
  fa: {
    connectionCancelled: "اتصال توسط کاربر لغو شد",
    dialogClosedWithoutApproval: "پنجره بدون تأیید مجوزها بسته شد",
    failedToConnect: "اتصال برقرار نشد",
  },
  he: {
    connectionCancelled: "החיבור בוטל על ידי המשתמש",
    dialogClosedWithoutApproval: "תיבת הדו-שיח נסגרה ללא אישור ההרשאות",
    failedToConnect: "ההתחברות נכשלה",
  },
  fr: {
    connectionCancelled: "Connexion annulée par l’utilisateur",
    dialogClosedWithoutApproval:
      "La boîte de dialogue a été fermée sans autoriser les permissions",
    failedToConnect: "Échec de la connexion",
  },
  "zh-Hans": {
    connectionCancelled: "用户已取消连接",
    dialogClosedWithoutApproval: "对话框已关闭，未批准权限",
    failedToConnect: "连接失败",
  },
  "zh-Hant": {
    connectionCancelled: "使用者已取消連線",
    dialogClosedWithoutApproval: "對話框已關閉，未核准權限",
    failedToConnect: "連線失敗",
  },
  ja: {
    connectionCancelled: "ユーザーが接続をキャンセルしました",
    dialogClosedWithoutApproval: "権限を承認せずにダイアログが閉じられました",
    failedToConnect: "接続できませんでした",
  },
  ky: {
    connectionCancelled: "Колдонуучу туташууну жокко чыгарды",
    dialogClosedWithoutApproval: "Уруксаттар берилбей туруп диалог жабылды",
    failedToConnect: "Туташуу ишке ашкан жок",
  },
  ru: {
    connectionCancelled: "Пользователь отменил подключение",
    dialogClosedWithoutApproval: "Диалог закрыт без подтверждения разрешений",
    failedToConnect: "Не удалось подключиться",
  },
};

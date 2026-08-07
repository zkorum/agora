import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AdministratorPremiumEntitlementApiTranslations {
  failedToFetchEntitlements: string;
  createdEntitlement: string;
  failedToCreateEntitlement: string;
  revokedEntitlement: string;
  failedToRevokeEntitlement: string;
}

const en: AdministratorPremiumEntitlementApiTranslations = {
  failedToFetchEntitlements: "Failed to fetch premium entitlements",
  createdEntitlement: "Premium entitlement created",
  failedToCreateEntitlement: "Failed to create premium entitlement",
  revokedEntitlement: "Premium entitlement revoked",
  failedToRevokeEntitlement: "Failed to revoke premium entitlement",
};

const ar: AdministratorPremiumEntitlementApiTranslations = {
  failedToFetchEntitlements: "تعذر جلب استحقاقات الميزات المميزة",
  createdEntitlement: "تم إنشاء استحقاق الميزة المميزة",
  failedToCreateEntitlement: "تعذر إنشاء استحقاق الميزة المميزة",
  revokedEntitlement: "تم إلغاء استحقاق الميزة المميزة",
  failedToRevokeEntitlement: "تعذر إلغاء استحقاق الميزة المميزة",
};

const es: AdministratorPremiumEntitlementApiTranslations = {
  failedToFetchEntitlements:
    "No se pudieron obtener los derechos de acceso prémium",
  createdEntitlement: "Se creó el derecho de acceso prémium",
  failedToCreateEntitlement: "No se pudo crear el derecho de acceso prémium",
  revokedEntitlement: "Se revocó el derecho de acceso prémium",
  failedToRevokeEntitlement: "No se pudo revocar el derecho de acceso prémium",
};

const fa: AdministratorPremiumEntitlementApiTranslations = {
  failedToFetchEntitlements: "دریافت مجوزهای دسترسی ویژه ناموفق بود",
  createdEntitlement: "مجوز دسترسی ویژه ایجاد شد",
  failedToCreateEntitlement: "ایجاد مجوز دسترسی ویژه ناموفق بود",
  revokedEntitlement: "مجوز دسترسی ویژه لغو شد",
  failedToRevokeEntitlement: "لغو مجوز دسترسی ویژه ناموفق بود",
};

const fr: AdministratorPremiumEntitlementApiTranslations = {
  failedToFetchEntitlements:
    "Impossible de récupérer les droits d’accès premium",
  createdEntitlement: "Le droit d’accès premium a été créé",
  failedToCreateEntitlement: "Impossible de créer le droit d’accès premium",
  revokedEntitlement: "Le droit d’accès premium a été révoqué",
  failedToRevokeEntitlement: "Impossible de révoquer le droit d’accès premium",
};

const he: AdministratorPremiumEntitlementApiTranslations = {
  failedToFetchEntitlements: "אחזור הרשאות הפרימיום נכשל",
  createdEntitlement: "הרשאת הפרימיום נוצרה",
  failedToCreateEntitlement: "יצירת הרשאת הפרימיום נכשלה",
  revokedEntitlement: "הרשאת הפרימיום בוטלה",
  failedToRevokeEntitlement: "ביטול הרשאת הפרימיום נכשל",
};

const ja: AdministratorPremiumEntitlementApiTranslations = {
  failedToFetchEntitlements: "プレミアム権限を取得できませんでした",
  createdEntitlement: "プレミアム権限を作成しました",
  failedToCreateEntitlement: "プレミアム権限を作成できませんでした",
  revokedEntitlement: "プレミアム権限を取り消しました",
  failedToRevokeEntitlement: "プレミアム権限を取り消せませんでした",
};

const zhHans: AdministratorPremiumEntitlementApiTranslations = {
  failedToFetchEntitlements: "无法获取高级功能权限",
  createdEntitlement: "已创建高级功能权限",
  failedToCreateEntitlement: "无法创建高级功能权限",
  revokedEntitlement: "已撤销高级功能权限",
  failedToRevokeEntitlement: "无法撤销高级功能权限",
};

const zhHant: AdministratorPremiumEntitlementApiTranslations = {
  failedToFetchEntitlements: "無法取得進階功能權限",
  createdEntitlement: "已建立進階功能權限",
  failedToCreateEntitlement: "無法建立進階功能權限",
  revokedEntitlement: "已撤銷進階功能權限",
  failedToRevokeEntitlement: "無法撤銷進階功能權限",
};

export const administratorPremiumEntitlementApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  AdministratorPremiumEntitlementApiTranslations
> = {
  en,
  ar,
  es,
  fa,
  fr,
  he,
  ja,
  ky: {
    failedToFetchEntitlements:
      "Премиум функцияларга жетүү укуктарын алуу ишке ашкан жок",
    createdEntitlement: "Премиум функцияга жетүү укугу берилди",
    failedToCreateEntitlement:
      "Премиум функцияга жетүү укугун берүү ишке ашкан жок",
    revokedEntitlement: "Премиум функцияга жетүү укугу жокко чыгарылды",
    failedToRevokeEntitlement:
      "Премиум функцияга жетүү укугун жокко чыгаруу ишке ашкан жок",
  },
  ru: {
    failedToFetchEntitlements:
      "Не удалось получить данные о правах доступа к премиум-функциям",
    createdEntitlement: "Доступ к премиум-функции предоставлен",
    failedToCreateEntitlement:
      "Не удалось предоставить доступ к премиум-функции",
    revokedEntitlement: "Доступ к премиум-функции отозван",
    failedToRevokeEntitlement: "Не удалось отозвать доступ к премиум-функции",
  },
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
};

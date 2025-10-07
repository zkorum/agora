import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SettingsTranslations {
  pageTitle: string;
  deleteAccount: string;
  deleteGuestAccount: string;
  profile: string;
  contentPreference: string;
  language: string;
  privacyPolicy: string;
  termsOfService: string;
  communityGuidelines: string;
  logOut: string;
  moderatorOrganization: string;
  componentTesting: string;
  accountDeleted: string;
  accountDeletionFailed: string;
}

export const settingsTranslations: Record<
  SupportedDisplayLanguageCodes,
  SettingsTranslations
> = {
  en: {
    pageTitle: "Settings",
    deleteAccount: "Delete Account",
    deleteGuestAccount: "Delete Guest Account",
    profile: "Profile",
    contentPreference: "Content Preference",
    language: "Language",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    communityGuidelines: "Community Guidelines",
    logOut: "Log Out",
    moderatorOrganization: "Moderator - Organization",
    componentTesting: "🔧 Component Testing",
    accountDeleted: "Account deleted",
    accountDeletionFailed: "Oops! Account deletion failed. Please try again",
  },
  ar: {
    pageTitle: "الإعدادات",
    deleteAccount: "حذف الحساب",
    deleteGuestAccount: "حذف حساب الضيف",
    profile: "الملف الشخصي",
    contentPreference: "تفضيلات المحتوى",
    language: "اللغة",
    privacyPolicy: "سياسة الخصوصية",
    termsOfService: "شروط الخدمة",
    communityGuidelines: "إرشادات المجتمع",
    logOut: "تسجيل الخروج",
    moderatorOrganization: "المشرف - المنظمة",
    componentTesting: "🔧 اختبار المكونات",
    accountDeleted: "تم حذف الحساب",
    accountDeletionFailed: "عذراً! فشل حذف الحساب. يرجى المحاولة مرة أخرى",
  },
  es: {
    pageTitle: "Configuración",
    deleteAccount: "Eliminar cuenta",
    deleteGuestAccount: "Eliminar cuenta de invitado",
    profile: "Perfil",
    contentPreference: "Preferencia de contenido",
    language: "Idioma",
    privacyPolicy: "Política de privacidad",
    termsOfService: "Términos de servicio",
    communityGuidelines: "Directrices de la comunidad",
    logOut: "Cerrar sesión",
    moderatorOrganization: "Moderador - Organización",
    componentTesting: "🔧 Pruebas de componentes",
    accountDeleted: "Cuenta eliminada",
    accountDeletionFailed:
      "¡Ups! Error al eliminar la cuenta. Inténtalo de nuevo",
  },
  fr: {
    pageTitle: "Paramètres",
    deleteAccount: "Supprimer le compte",
    deleteGuestAccount: "Supprimer le compte invité",
    profile: "Profil",
    contentPreference: "Préférence de contenu",
    language: "Langue",
    privacyPolicy: "Politique de confidentialité",
    termsOfService: "Conditions d'utilisation",
    communityGuidelines: "Règles de la communauté",
    logOut: "Se déconnecter",
    moderatorOrganization: "Modérateur - Organisation",
    componentTesting: "🔧 Tests de composants",
    accountDeleted: "Compte supprimé",
    accountDeletionFailed:
      "Oups ! Échec de la suppression du compte. Veuillez réessayer",
  },
  "zh-Hans": {
    pageTitle: "设置",
    deleteAccount: "删除账户",
    deleteGuestAccount: "删除访客账户",
    profile: "个人资料",
    contentPreference: "内容偏好",
    language: "语言",
    privacyPolicy: "隐私政策",
    termsOfService: "服务条款",
    communityGuidelines: "社区准则",
    logOut: "登出",
    moderatorOrganization: "版主 - 组织",
    componentTesting: "🔧 组件测试",
    accountDeleted: "账户已删除",
    accountDeletionFailed: "哎呀！账户删除失败，请重试",
  },
  "zh-Hant": {
    pageTitle: "設定",
    deleteAccount: "刪除帳戶",
    deleteGuestAccount: "刪除訪客帳戶",
    profile: "個人資料",
    contentPreference: "內容偏好",
    language: "語言",
    privacyPolicy: "隱私政策",
    termsOfService: "服務條款",
    communityGuidelines: "社群準則",
    logOut: "登出",
    moderatorOrganization: "版主 - 組織",
    componentTesting: "🔧 組件測試",
    accountDeleted: "帳戶已刪除",
    accountDeletionFailed: "哎呀！帳戶刪除失敗，請重試",
  },
  ja: {
    pageTitle: "設定",
    deleteAccount: "アカウントを削除",
    deleteGuestAccount: "ゲストアカウントを削除",
    profile: "プロフィール",
    contentPreference: "コンテンツ設定",
    language: "言語",
    privacyPolicy: "プライバシーポリシー",
    termsOfService: "利用規約",
    communityGuidelines: "コミュニティガイドライン",
    logOut: "ログアウト",
    moderatorOrganization: "モデレーター - 組織",
    componentTesting: "🔧 コンポーネントテスト",
    accountDeleted: "アカウントが削除されました",
    accountDeletionFailed:
      "おっと！アカウントの削除に失敗しました。もう一度お試しください",
  },
};

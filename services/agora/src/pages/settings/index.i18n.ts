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
  deleteAccountDialogTitle: string;
  deleteAccountDialogMessage: string;
  deleteGuestAccountDialogMessage: string;
  deleteAccountDialogPlaceholder: string;
  deleteAccountDialogError: string;
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
    deleteAccountDialogTitle: "Delete Account",
    deleteAccountDialogMessage: "Your account will be permanently deleted immediately. This action cannot be undone. Data may remain in third-party backups and services for up to 30 days.\n\nTo confirm, type DELETE below:",
    deleteGuestAccountDialogMessage: "Your guest account will be permanently deleted immediately. This action cannot be undone. Data may remain in backups for up to 30 days.\n\nTo confirm, type DELETE below:",
    deleteAccountDialogPlaceholder: "Type DELETE to confirm",
    deleteAccountDialogError: "Account deletion request failed. Try again later.",
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
    deleteAccountDialogTitle: "حذف الحساب",
    deleteAccountDialogMessage: "سيتم حذف حسابك نهائيًا على الفور. لا يمكن التراجع عن هذا الإجراء. قد تبقى البيانات في النسخ الاحتياطية والخدمات الخارجية لمدة تصل إلى 30 يومًا.\n\nللتأكيد، اكتب DELETE أدناه:",
    deleteGuestAccountDialogMessage: "سيتم حذف حساب الضيف الخاص بك نهائيًا على الفور. لا يمكن التراجع عن هذا الإجراء. قد تبقى البيانات في النسخ الاحتياطية لمدة تصل إلى 30 يومًا.\n\nللتأكيد، اكتب DELETE أدناه:",
    deleteAccountDialogPlaceholder: "اكتب DELETE للتأكيد",
    deleteAccountDialogError: "فشل طلب حذف الحساب. حاول مرة أخرى لاحقاً.",
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
    deleteAccountDialogTitle: "Eliminar cuenta",
    deleteAccountDialogMessage: "Tu cuenta se eliminará permanentemente de inmediato. Esta acción no se puede deshacer. Los datos pueden permanecer en copias de seguridad y servicios de terceros hasta 30 días.\n\nPara confirmar, escribe DELETE a continuación:",
    deleteGuestAccountDialogMessage: "Tu cuenta de invitado se eliminará permanentemente de inmediato. Esta acción no se puede deshacer. Los datos pueden permanecer en copias de seguridad hasta 30 días.\n\nPara confirmar, escribe DELETE a continuación:",
    deleteAccountDialogPlaceholder: "Escribe DELETE para confirmar",
    deleteAccountDialogError: "Falló la solicitud de eliminación de cuenta. Intenta de nuevo más tarde.",
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
    deleteAccountDialogTitle: "Supprimer le compte",
    deleteAccountDialogMessage: "Votre compte sera définitivement supprimé immédiatement. Cette action ne peut pas être annulée. Les données peuvent rester dans les sauvegardes et services tiers jusqu'à 30 jours.\n\nPour confirmer, tapez DELETE ci-dessous:",
    deleteGuestAccountDialogMessage: "Votre compte invité sera définitivement supprimé immédiatement. Cette action ne peut pas être annulée. Les données peuvent rester dans les sauvegardes jusqu'à 30 jours.\n\nPour confirmer, tapez DELETE ci-dessous:",
    deleteAccountDialogPlaceholder: "Tapez DELETE pour confirmer",
    deleteAccountDialogError: "La demande de suppression du compte a échoué. Réessayez plus tard.",
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
    deleteAccountDialogTitle: "删除账户",
    deleteAccountDialogMessage: "您的账户将立即被永久删除。此操作无法撤销。数据可能会在第三方备份和服务中保留最多30天。\n\n要确认，请在下方输入 DELETE:",
    deleteGuestAccountDialogMessage: "您的访客账户将立即被永久删除。此操作无法撤销。数据可能会在备份中保留最多30天。\n\n要确认，请在下方输入 DELETE:",
    deleteAccountDialogPlaceholder: "输入 DELETE 确认",
    deleteAccountDialogError: "账户删除请求失败。请稍后重试。",
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
    deleteAccountDialogTitle: "刪除帳戶",
    deleteAccountDialogMessage: "您的帳戶將立即被永久刪除。此操作無法撤銷。數據可能會在第三方備份和服務中保留最多30天。\n\n要確認，請在下方輸入 DELETE:",
    deleteGuestAccountDialogMessage: "您的訪客帳戶將立即被永久刪除。此操作無法撤銷。數據可能會在備份中保留最多30天。\n\n要確認，請在下方輸入 DELETE:",
    deleteAccountDialogPlaceholder: "輸入 DELETE 確認",
    deleteAccountDialogError: "帳戶刪除請求失敗。請稍後重試。",
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
    deleteAccountDialogTitle: "アカウントを削除",
    deleteAccountDialogMessage: "アカウントは即座に完全削除されます。この操作は取り消すことができません。データは最大30日間サードパーティのバックアップとサービスに残る場合があります。\n\n確認するには、以下にDELETEと入力してください:",
    deleteGuestAccountDialogMessage: "ゲストアカウントは即座に完全削除されます。この操作は取り消すことができません。データは最大30日間バックアップに残る場合があります。\n\n確認するには、以下にDELETEと入力してください:",
    deleteAccountDialogPlaceholder: "DELETE と入力して確認",
    deleteAccountDialogError: "アカウント削除リクエストが失敗しました。後でもう一度お試しください。",
  },
};

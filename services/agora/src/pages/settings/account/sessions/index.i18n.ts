import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SessionSettingsTranslations {
  pageTitle: string;
  description: string;
  currentSession: string;
  otherSession: string;
  started: string;
  expires: string;
  logoutCurrent: string;
  revoke: string;
  revokeTitle: string;
  revokeMessage: string;
  logoutAll: string;
  logoutAllTitle: string;
  logoutAllMessage: string;
  confirm: string;
  cancel: string;
  loadFailed: string;
  revokeFailed: string;
  logoutAllFailed: string;
  localOnlyTitle: string;
  localOnlyMessage: string;
  clearLocalData: string;
  retry: string;
  localCleanupFailed: string;
  retryLocalCleanup: string;
  navigationFailed: string;
  retryNavigation: string;
}

export const sessionSettingsTranslations: Record<
  SupportedDisplayLanguageCodes,
  SessionSettingsTranslations
> = {
  en: {
    pageTitle: "Sessions",
    description: "Review your active sessions.",
    currentSession: "Current session",
    otherSession: "Other session",
    started: "Started:",
    expires: "Expires:",
    logoutCurrent: "Log out",
    revoke: "Revoke access",
    revokeTitle: "Revoke access for this session?",
    revokeMessage:
      "The selected session, started {startedAt}, will lose access immediately.",
    logoutAll: "Log out all devices",
    logoutAllTitle: "Log out all devices?",
    logoutAllMessage:
      "Every active session, including this one, will be revoked.",
    confirm: "Confirm",
    cancel: "Cancel",
    loadFailed: "Sessions could not be loaded. Try again.",
    revokeFailed: "Access could not be revoked. Try again.",
    logoutAllFailed: "Server logout could not be confirmed.",
    localOnlyTitle: "Clear this device only?",
    localOnlyMessage:
      "Local account data and keys will be erased, but server sessions may remain active until you revoke them after logging in again or they expire.",
    clearLocalData: "Clear this device",
    retry: "Retry",
    localCleanupFailed:
      "Local account data or keys may remain on this device. Stay on this page and retry to finish logging out safely.",
    retryLocalCleanup: "Retry device cleanup",
    navigationFailed:
      "Local logout finished, but the home page could not be opened.",
    retryNavigation: "Open home page",
  },
  ar: {
    pageTitle: "الجلسات",
    description: "راجع جلساتك النشطة.",
    currentSession: "الجلسة الحالية",
    otherSession: "جلسة أخرى",
    started: "بدأت:",
    expires: "تنتهي:",
    logoutCurrent: "تسجيل الخروج",
    revoke: "إلغاء الوصول",
    revokeTitle: "إلغاء وصول هذه الجلسة؟",
    revokeMessage:
      "ستفقد الجلسة المحددة، التي بدأت في {startedAt}، إمكانية الوصول فورًا.",
    logoutAll: "تسجيل الخروج من جميع الأجهزة",
    logoutAllTitle: "تسجيل الخروج من جميع الأجهزة؟",
    logoutAllMessage: "سيتم إلغاء كل الجلسات النشطة، بما فيها هذه الجلسة.",
    confirm: "تأكيد",
    cancel: "إلغاء",
    loadFailed: "تعذر تحميل الجلسات. حاول مرة أخرى.",
    revokeFailed: "تعذر إلغاء الوصول. حاول مرة أخرى.",
    logoutAllFailed: "تعذر تأكيد تسجيل الخروج من الخادم.",
    localOnlyTitle: "مسح هذا الجهاز فقط؟",
    localOnlyMessage:
      "سيتم مسح بيانات الحساب والمفاتيح المحلية، لكن قد تبقى جلسات الخادم نشطة حتى تلغيها بعد تسجيل الدخول مجددًا أو تنتهي صلاحيتها.",
    clearLocalData: "مسح هذا الجهاز",
    retry: "إعادة المحاولة",
    localCleanupFailed:
      "قد تبقى بيانات الحساب أو المفاتيح على هذا الجهاز. ابق في هذه الصفحة وحاول مرة أخرى لإكمال تسجيل الخروج بأمان.",
    retryLocalCleanup: "إعادة محاولة مسح الجهاز",
    navigationFailed: "اكتمل تسجيل الخروج المحلي، لكن تعذر فتح الصفحة الرئيسية.",
    retryNavigation: "فتح الصفحة الرئيسية",
  },
  es: {
    pageTitle: "Sesiones",
    description: "Revise sus sesiones activas.",
    currentSession: "Sesión actual",
    otherSession: "Otra sesión",
    started: "Inicio:",
    expires: "Caduca:",
    logoutCurrent: "Cerrar sesión",
    revoke: "Revocar acceso",
    revokeTitle: "¿Revocar el acceso de esta sesión?",
    revokeMessage:
      "La sesión seleccionada, iniciada el {startedAt}, perderá el acceso inmediatamente.",
    logoutAll: "Cerrar sesión en todos los dispositivos",
    logoutAllTitle: "¿Cerrar sesión en todos los dispositivos?",
    logoutAllMessage:
      "Se revocarán todas las sesiones activas, incluida esta.",
    confirm: "Confirmar",
    cancel: "Cancelar",
    loadFailed: "No se pudieron cargar las sesiones. Inténtelo de nuevo.",
    revokeFailed: "No se pudo revocar el acceso. Inténtelo de nuevo.",
    logoutAllFailed: "No se pudo confirmar el cierre de sesión en el servidor.",
    localOnlyTitle: "¿Borrar solo este dispositivo?",
    localOnlyMessage:
      "Se borrarán los datos y las claves locales de la cuenta, pero las sesiones del servidor pueden seguir activas hasta que las revoque tras iniciar sesión de nuevo o caduquen.",
    clearLocalData: "Borrar este dispositivo",
    retry: "Reintentar",
    localCleanupFailed:
      "Puede que queden datos o claves de la cuenta en este dispositivo. Permanezca en esta página y vuelva a intentarlo para cerrar sesión de forma segura.",
    retryLocalCleanup: "Reintentar el borrado",
    navigationFailed:
      "La sesión local se cerró, pero no se pudo abrir la página de inicio.",
    retryNavigation: "Abrir la página de inicio",
  },
  fa: {
    pageTitle: "نشست‌ها",
    description: "نشست‌های فعال خود را بررسی کنید.",
    currentSession: "نشست فعلی",
    otherSession: "نشست دیگر",
    started: "شروع:",
    expires: "انقضا:",
    logoutCurrent: "خروج",
    revoke: "لغو دسترسی",
    revokeTitle: "دسترسی این نشست لغو شود؟",
    revokeMessage:
      "نشست انتخاب‌شده که در {startedAt} آغاز شده است، فوراً دسترسی خود را از دست می‌دهد.",
    logoutAll: "خروج از همه دستگاه‌ها",
    logoutAllTitle: "از همه دستگاه‌ها خارج می‌شوید؟",
    logoutAllMessage: "همه نشست‌های فعال، از جمله این نشست، لغو می‌شوند.",
    confirm: "تأیید",
    cancel: "لغو",
    loadFailed: "نشست‌ها بارگذاری نشدند. دوباره تلاش کنید.",
    revokeFailed: "لغو دسترسی انجام نشد. دوباره تلاش کنید.",
    logoutAllFailed: "خروج از حساب در سرور تأیید نشد.",
    localOnlyTitle: "فقط این دستگاه پاک شود؟",
    localOnlyMessage:
      "داده‌ها و کلیدهای محلی حساب پاک می‌شوند، اما نشست‌های سرور ممکن است تا زمان لغو پس از ورود دوباره یا انقضا فعال بمانند.",
    clearLocalData: "پاک کردن این دستگاه",
    retry: "تلاش مجدد",
    localCleanupFailed:
      "ممکن است داده‌ها یا کلیدهای حساب روی این دستگاه باقی مانده باشند. در این صفحه بمانید و برای خروج امن دوباره تلاش کنید.",
    retryLocalCleanup: "تلاش دوباره برای پاک‌سازی",
    navigationFailed: "خروج محلی انجام شد، اما صفحه اصلی باز نشد.",
    retryNavigation: "باز کردن صفحه اصلی",
  },
  fr: {
    pageTitle: "Sessions",
    description: "Consultez vos sessions actives.",
    currentSession: "Session actuelle",
    otherSession: "Autre session",
    started: "Début :",
    expires: "Expiration :",
    logoutCurrent: "Se déconnecter",
    revoke: "Révoquer l’accès",
    revokeTitle: "Révoquer l’accès de cette session ?",
    revokeMessage:
      "La session sélectionnée, démarrée le {startedAt}, perdra immédiatement son accès.",
    logoutAll: "Déconnecter tous les appareils",
    logoutAllTitle: "Déconnecter tous les appareils ?",
    logoutAllMessage:
      "Toutes les sessions actives, y compris celle-ci, seront révoquées.",
    confirm: "Confirmer",
    cancel: "Annuler",
    loadFailed: "Impossible de charger les sessions. Réessayez.",
    revokeFailed: "Impossible de révoquer l’accès. Réessayez.",
    logoutAllFailed: "La déconnexion du serveur n’a pas pu être confirmée.",
    localOnlyTitle: "Effacer uniquement cet appareil ?",
    localOnlyMessage:
      "Les données et clés locales du compte seront effacées, mais les sessions sur le serveur peuvent rester actives jusqu’à leur révocation après une nouvelle connexion ou leur expiration.",
    clearLocalData: "Effacer cet appareil",
    retry: "Réessayer",
    localCleanupFailed:
      "Des données ou clés du compte peuvent rester sur cet appareil. Restez sur cette page et réessayez pour terminer la déconnexion en toute sécurité.",
    retryLocalCleanup: "Réessayer l’effacement",
    navigationFailed:
      "La déconnexion locale est terminée, mais la page d’accueil n’a pas pu être ouverte.",
    retryNavigation: "Ouvrir la page d’accueil",
  },
  "zh-Hans": {
    pageTitle: "会话",
    description: "查看您的活跃会话。",
    currentSession: "当前会话",
    otherSession: "其他会话",
    started: "开始时间：",
    expires: "到期时间：",
    logoutCurrent: "退出登录",
    revoke: "撤销访问权限",
    revokeTitle: "撤销此会话的访问权限？",
    revokeMessage: "所选会话于 {startedAt} 开始，将立即失去访问权限。",
    logoutAll: "退出所有设备",
    logoutAllTitle: "退出所有设备？",
    logoutAllMessage: "所有活跃会话（包括此会话）都将被撤销。",
    confirm: "确认",
    cancel: "取消",
    loadFailed: "无法加载会话。请重试。",
    revokeFailed: "无法撤销访问权限。请重试。",
    logoutAllFailed: "无法确认服务器退出状态。",
    localOnlyTitle: "仅清除此设备？",
    localOnlyMessage:
      "本地账户数据和密钥将被清除，但服务器会话可能会保持活跃，直到您重新登录后将其撤销或会话到期。",
    clearLocalData: "清除此设备",
    retry: "重试",
    localCleanupFailed:
      "此设备上可能仍有账户数据或密钥。请留在此页面并重试，以安全完成退出。",
    retryLocalCleanup: "重试设备清理",
    navigationFailed: "本地退出已完成，但无法打开主页。",
    retryNavigation: "打开主页",
  },
  "zh-Hant": {
    pageTitle: "工作階段",
    description: "查看您使用中的工作階段。",
    currentSession: "目前的工作階段",
    otherSession: "其他工作階段",
    started: "開始時間：",
    expires: "到期時間：",
    logoutCurrent: "登出",
    revoke: "撤銷存取權限",
    revokeTitle: "撤銷此工作階段的存取權限？",
    revokeMessage: "所選工作階段於 {startedAt} 開始，將立即失去存取權限。",
    logoutAll: "登出所有裝置",
    logoutAllTitle: "登出所有裝置？",
    logoutAllMessage: "所有使用中的工作階段（包括此工作階段）都將被撤銷。",
    confirm: "確認",
    cancel: "取消",
    loadFailed: "無法載入工作階段。請重試。",
    revokeFailed: "無法撤銷存取權限。請重試。",
    logoutAllFailed: "無法確認伺服器登出狀態。",
    localOnlyTitle: "只清除此裝置？",
    localOnlyMessage:
      "本機帳戶資料和金鑰將被清除，但伺服器工作階段可能會保持使用中，直到您重新登入後將其撤銷或工作階段到期。",
    clearLocalData: "清除此裝置",
    retry: "重試",
    localCleanupFailed:
      "此裝置上可能仍有帳戶資料或金鑰。請留在此頁面並重試，以安全完成登出。",
    retryLocalCleanup: "重試裝置清理",
    navigationFailed: "本機登出已完成，但無法開啟首頁。",
    retryNavigation: "開啟首頁",
  },
  he: {
    pageTitle: "הפעלות",
    description: "הצגת ההפעלות הפעילות שלכם.",
    currentSession: "הפעלה נוכחית",
    otherSession: "הפעלה אחרת",
    started: "התחלה:",
    expires: "תפוגה:",
    logoutCurrent: "התנתקות",
    revoke: "ביטול גישה",
    revokeTitle: "לבטל את הגישה של הפעלה זו?",
    revokeMessage: "ההפעלה שנבחרה, שהתחילה ב-{startedAt}, תאבד גישה מיד.",
    logoutAll: "התנתקות מכל המכשירים",
    logoutAllTitle: "להתנתק מכל המכשירים?",
    logoutAllMessage: "כל ההפעלות הפעילות, כולל זו, יבוטלו.",
    confirm: "אישור",
    cancel: "ביטול",
    loadFailed: "לא ניתן לטעון את ההפעלות. נסו שוב.",
    revokeFailed: "לא ניתן לבטל את הגישה. נסו שוב.",
    logoutAllFailed: "לא ניתן לאשר את ההתנתקות מהשרת.",
    localOnlyTitle: "למחוק רק מכשיר זה?",
    localOnlyMessage:
      "נתוני החשבון והמפתחות המקומיים יימחקו, אך הפעלות השרת עשויות להישאר פעילות עד לביטולן לאחר התחברות מחדש או עד תפוגתן.",
    clearLocalData: "מחיקת מכשיר זה",
    retry: "ניסיון חוזר",
    localCleanupFailed:
      "ייתכן שנתוני חשבון או מפתחות נשארו במכשיר זה. הישארו בדף ונסו שוב כדי להשלים את ההתנתקות בבטחה.",
    retryLocalCleanup: "ניסיון ניקוי נוסף",
    navigationFailed: "ההתנתקות המקומית הושלמה, אך לא ניתן לפתוח את דף הבית.",
    retryNavigation: "פתיחת דף הבית",
  },
  ja: {
    pageTitle: "セッション",
    description: "有効なセッションを確認できます。",
    currentSession: "現在のセッション",
    otherSession: "その他のセッション",
    started: "開始：",
    expires: "有効期限：",
    logoutCurrent: "ログアウト",
    revoke: "アクセス権を取り消す",
    revokeTitle: "このセッションのアクセス権を取り消しますか？",
    revokeMessage:
      "{startedAt} に開始された選択中のセッションは、直ちにアクセスできなくなります。",
    logoutAll: "すべてのデバイスからログアウト",
    logoutAllTitle: "すべてのデバイスからログアウトしますか？",
    logoutAllMessage: "このセッションを含むすべての有効なセッションが無効になります。",
    confirm: "確認",
    cancel: "キャンセル",
    loadFailed: "セッションを読み込めませんでした。もう一度お試しください。",
    revokeFailed: "アクセス権を取り消せませんでした。もう一度お試しください。",
    logoutAllFailed: "サーバーでのログアウトを確認できませんでした。",
    localOnlyTitle: "このデバイスだけを消去しますか？",
    localOnlyMessage:
      "ローカルのアカウントデータと鍵は消去されますが、サーバー上のセッションは、再ログイン後に無効にするか期限が切れるまで有効な場合があります。",
    clearLocalData: "このデバイスを消去",
    retry: "再試行",
    localCleanupFailed:
      "このデバイスにアカウントデータまたは鍵が残っている可能性があります。このページで再試行し、安全にログアウトを完了してください。",
    retryLocalCleanup: "デバイスの消去を再試行",
    navigationFailed: "ローカルのログアウトは完了しましたが、ホームを開けませんでした。",
    retryNavigation: "ホームを開く",
  },
  ky: {
    pageTitle: "Сеанстар",
    description: "Активдүү сеанстарыңызды караңыз.",
    currentSession: "Учурдагы сеанс",
    otherSession: "Башка сеанс",
    started: "Башталды:",
    expires: "Мөөнөтү бүтөт:",
    logoutCurrent: "Чыгуу",
    revoke: "Кирүү мүмкүнчүлүгүн жокко чыгаруу",
    revokeTitle: "Бул сеанстын кирүү мүмкүнчүлүгүн жокко чыгарасызбы?",
    revokeMessage:
      "{startedAt} убактысында башталган тандалган сеанс дароо кирүү мүмкүнчүлүгүн жоготот.",
    logoutAll: "Бардык түзмөктөрдөн чыгуу",
    logoutAllTitle: "Бардык түзмөктөрдөн чыгасызбы?",
    logoutAllMessage: "Бардык активдүү сеанстар, анын ичинде бул сеанс да жокко чыгарылат.",
    confirm: "Ырастоо",
    cancel: "Жокко чыгаруу",
    loadFailed: "Сеанстар жүктөлгөн жок. Кайра аракет кылыңыз.",
    revokeFailed: "Кирүү мүмкүнчүлүгүн жокко чыгаруу мүмкүн болгон жок. Кайра аракет кылыңыз.",
    logoutAllFailed: "Сервердеги чыгууну ырастоо мүмкүн болгон жок.",
    localOnlyTitle: "Ушул түзмөктү гана тазалообу?",
    localOnlyMessage:
      "Жергиликтүү аккаунт маалыматтары жана ачкычтар өчүрүлөт, бирок сервердик сеанстар кайра киргенден кийин жокко чыгарылганга же мөөнөтү бүткөнгө чейин активдүү калышы мүмкүн.",
    clearLocalData: "Бул түзмөктү тазалоо",
    retry: "Кайра аракет",
    localCleanupFailed:
      "Бул түзмөктө аккаунт маалыматтары же ачкычтар калышы мүмкүн. Коопсуз чыгууну бүтүрүү үчүн ушул бетте калып, кайра аракет кылыңыз.",
    retryLocalCleanup: "Тазалоону кайра аракет кылуу",
    navigationFailed: "Жергиликтүү чыгуу аяктады, бирок башкы бет ачылган жок.",
    retryNavigation: "Башкы бетти ачуу",
  },
  ru: {
    pageTitle: "Сеансы",
    description: "Просматривайте свои активные сеансы.",
    currentSession: "Текущий сеанс",
    otherSession: "Другой сеанс",
    started: "Начало:",
    expires: "Истекает:",
    logoutCurrent: "Выйти",
    revoke: "Отозвать доступ",
    revokeTitle: "Отозвать доступ для этого сеанса?",
    revokeMessage:
      "Выбранный сеанс, начатый {startedAt}, немедленно потеряет доступ.",
    logoutAll: "Выйти на всех устройствах",
    logoutAllTitle: "Выйти на всех устройствах?",
    logoutAllMessage: "Все активные сеансы, включая этот, будут отозваны.",
    confirm: "Подтвердить",
    cancel: "Отмена",
    loadFailed: "Не удалось загрузить сеансы. Попробуйте снова.",
    revokeFailed: "Не удалось отозвать доступ. Попробуйте снова.",
    logoutAllFailed: "Не удалось подтвердить выход на сервере.",
    localOnlyTitle: "Очистить только это устройство?",
    localOnlyMessage:
      "Локальные данные аккаунта и ключи будут удалены, но серверные сеансы могут оставаться активными, пока вы не отзовёте их после повторного входа или пока не истечёт их срок.",
    clearLocalData: "Очистить это устройство",
    retry: "Повторить",
    localCleanupFailed:
      "На этом устройстве могли остаться данные аккаунта или ключи. Оставайтесь на этой странице и повторите попытку, чтобы безопасно завершить выход.",
    retryLocalCleanup: "Повторить очистку",
    navigationFailed: "Локальный выход завершён, но открыть главную страницу не удалось.",
    retryNavigation: "Открыть главную страницу",
  },
};

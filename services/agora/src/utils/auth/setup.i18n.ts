import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AuthSetupTranslations {
  loggedOut: string;
  logoutFailed: string;
  localOnlyTitle: string;
  localOnlyMessage: string;
  clearLocalData: string;
  retry: string;
  localCleanupFailedTitle: string;
  localCleanupFailedMessage: string;
  navigationFailedTitle: string;
  navigationFailedMessage: string;
}

export const authSetupTranslations: Record<
  SupportedDisplayLanguageCodes,
  AuthSetupTranslations
> = {
  en: {
    loggedOut: "Logged out",
    logoutFailed: "Oops! Logout failed. Please try again",
    localOnlyTitle: "Clear this device only?",
    localOnlyMessage:
      "Server logout could not be confirmed. Local account data and keys can still be erased, but server sessions may remain active until you revoke them after logging in again or they expire.",
    clearLocalData: "Clear this device",
    retry: "Retry",
    localCleanupFailedTitle: "This device could not be cleared",
    localCleanupFailedMessage:
      "Local account data or keys may remain on this device. Stay here and retry to finish logging out safely.",
    navigationFailedTitle: "Could not open the home page",
    navigationFailedMessage:
      "Local logout finished, but the home page could not be opened. Try navigating again.",
  },
  es: {
    loggedOut: "Sesión cerrada",
    logoutFailed: "¡Ups! No se pudo cerrar sesión. Inténtelo de nuevo",
    localOnlyTitle: "¿Borrar solo los datos de este dispositivo?",
    localOnlyMessage:
      "No se pudo confirmar el cierre de sesión en el servidor. Los datos y las claves de la cuenta local aún pueden borrarse, pero las sesiones del servidor pueden permanecer activas hasta que las revoque después de volver a iniciar sesión o hasta que caduquen.",
    clearLocalData: "Borrar los datos de este dispositivo",
    retry: "Reintentar",
    localCleanupFailedTitle:
      "No se pudieron borrar los datos de este dispositivo",
    localCleanupFailedMessage:
      "Es posible que queden datos de la cuenta o claves en este dispositivo. Permanezca aquí y vuelva a intentarlo para terminar de cerrar sesión de forma segura.",
    navigationFailedTitle: "No se pudo abrir la página de inicio",
    navigationFailedMessage:
      "El cierre de sesión local finalizó, pero no se pudo abrir la página de inicio. Intente acceder a ella de nuevo.",
  },
  fr: {
    loggedOut: "Déconnecté",
    logoutFailed: "Oups ! La déconnexion a échoué. Veuillez réessayer",
    localOnlyTitle: "Effacer uniquement les données de cet appareil ?",
    localOnlyMessage:
      "La déconnexion du serveur n’a pas pu être confirmée. Les données et les clés du compte local peuvent toujours être effacées, mais les sessions sur le serveur peuvent rester actives jusqu’à ce que vous les révoquiez après vous être reconnecté ou jusqu’à leur expiration.",
    clearLocalData: "Effacer les données de cet appareil",
    retry: "Réessayer",
    localCleanupFailedTitle: "Impossible d’effacer les données de cet appareil",
    localCleanupFailedMessage:
      "Des données du compte ou des clés peuvent subsister sur cet appareil. Restez sur cette page et réessayez pour terminer la déconnexion en toute sécurité.",
    navigationFailedTitle: "Impossible d’ouvrir la page d’accueil",
    navigationFailedMessage:
      "La déconnexion locale est terminée, mais la page d’accueil n’a pas pu être ouverte. Essayez d’y accéder à nouveau.",
  },
  "zh-Hant": {
    loggedOut: "已登出",
    logoutFailed: "糟糕！登出失敗。請重試",
    localOnlyTitle: "只清除此裝置上的資料嗎？",
    localOnlyMessage:
      "無法確認已從伺服器登出。仍可清除此裝置上的帳號資料和金鑰，但伺服器工作階段可能會保持有效，直到您重新登入後將其撤銷，或其自行到期。",
    clearLocalData: "清除此裝置",
    retry: "重試",
    localCleanupFailedTitle: "無法清除此裝置",
    localCleanupFailedMessage:
      "此裝置上可能仍留有帳號資料或金鑰。請留在此頁面並重試，以安全地完成登出。",
    navigationFailedTitle: "無法開啟首頁",
    navigationFailedMessage:
      "本機登出已完成，但無法開啟首頁。請嘗試再次前往首頁。",
  },
  "zh-Hans": {
    loggedOut: "已退出登录",
    logoutFailed: "糟糕！退出登录失败。请重试",
    localOnlyTitle: "只清除此设备上的数据吗？",
    localOnlyMessage:
      "无法确认已从服务器退出登录。仍可清除此设备上的账户数据和密钥，但服务器会话可能会保持有效，直到您重新登录后将其撤销，或其自行过期。",
    clearLocalData: "清除此设备",
    retry: "重试",
    localCleanupFailedTitle: "无法清除此设备",
    localCleanupFailedMessage:
      "此设备上可能仍留有账户数据或密钥。请留在此页面并重试，以安全地完成退出登录。",
    navigationFailedTitle: "无法打开首页",
    navigationFailedMessage:
      "本地退出登录已完成，但无法打开首页。请尝试再次前往首页。",
  },
  ja: {
    loggedOut: "ログアウトしました",
    logoutFailed: "ログアウトに失敗しました。もう一度お試しください",
    localOnlyTitle: "このデバイスのデータのみを消去しますか？",
    localOnlyMessage:
      "サーバーからのログアウトを確認できませんでした。このデバイス上のアカウントデータとキーは消去できますが、再度ログインしてセッションを無効にするか、セッションの有効期限が切れるまで、サーバー上のセッションが有効なままになる可能性があります。",
    clearLocalData: "このデバイスのデータを消去",
    retry: "再試行",
    localCleanupFailedTitle: "このデバイスのデータを消去できませんでした",
    localCleanupFailedMessage:
      "このデバイスにアカウントデータまたはキーが残っている可能性があります。安全にログアウトを完了するには、このページで再試行してください。",
    navigationFailedTitle: "ホームページを開けませんでした",
    navigationFailedMessage:
      "ローカルでのログアウトは完了しましたが、ホームページを開けませんでした。もう一度移動してみてください。",
  },
  ar: {
    loggedOut: "تم تسجيل الخروج",
    logoutFailed: "عفواً! فشل تسجيل الخروج. يرجى المحاولة مرة أخرى",
    localOnlyTitle: "هل تريد مسح بيانات هذا الجهاز فقط؟",
    localOnlyMessage:
      "تعذر تأكيد تسجيل الخروج من الخادم. لا يزال من الممكن مسح بيانات الحساب المحلية والمفاتيح، لكن جلسات الخادم قد تظل نشطة إلى أن تلغيها بعد تسجيل الدخول مجددًا أو إلى أن تنتهي صلاحيتها.",
    clearLocalData: "مسح بيانات هذا الجهاز",
    retry: "إعادة المحاولة",
    localCleanupFailedTitle: "تعذر مسح بيانات هذا الجهاز",
    localCleanupFailedMessage:
      "قد تبقى بيانات الحساب أو المفاتيح على هذا الجهاز. ابقَ هنا وأعد المحاولة لإكمال تسجيل الخروج بأمان.",
    navigationFailedTitle: "تعذر فتح الصفحة الرئيسية",
    navigationFailedMessage:
      "اكتمل تسجيل الخروج المحلي، لكن تعذر فتح الصفحة الرئيسية. حاول الانتقال إليها مجددًا.",
  },
  fa: {
    loggedOut: "از حساب خارج شدید",
    logoutFailed: "متأسفیم! خروج ناموفق بود. لطفاً دوباره تلاش کنید",
    localOnlyTitle: "فقط داده‌های این دستگاه پاک شوند؟",
    localOnlyMessage:
      "تأیید خروج از حساب در سرور ممکن نشد. همچنان می‌توان داده‌ها و کلیدهای محلی حساب را پاک کرد، اما نشست‌های سرور ممکن است تا زمانی که پس از ورود دوباره آن‌ها را لغو کنید یا منقضی شوند، فعال بمانند.",
    clearLocalData: "پاک کردن داده‌های این دستگاه",
    retry: "تلاش دوباره",
    localCleanupFailedTitle: "داده‌های این دستگاه پاک نشد",
    localCleanupFailedMessage:
      "ممکن است داده‌ها یا کلیدهای حساب روی این دستگاه باقی مانده باشند. در همین صفحه بمانید و برای تکمیل ایمن خروج از حساب دوباره تلاش کنید.",
    navigationFailedTitle: "صفحه اصلی باز نشد",
    navigationFailedMessage:
      "خروج محلی از حساب انجام شد، اما صفحه اصلی باز نشد. دوباره به آن بروید.",
  },
  he: {
    loggedOut: "התנתקת",
    logoutFailed: "אופס! ההתנתקות נכשלה. נסו שוב",
    localOnlyTitle: "למחוק נתונים רק מהמכשיר הזה?",
    localOnlyMessage:
      "לא ניתן היה לאשר את ההתנתקות מהשרת. עדיין אפשר למחוק את נתוני החשבון המקומיים ואת המפתחות, אך ייתכן שההפעלות בשרת יישארו פעילות עד לביטולן לאחר התחברות מחדש או עד שתוקפן יפוג.",
    clearLocalData: "מחיקת נתוני המכשיר",
    retry: "ניסיון חוזר",
    localCleanupFailedTitle: "לא ניתן היה למחוק את נתוני המכשיר",
    localCleanupFailedMessage:
      "ייתכן שנתוני חשבון או מפתחות נשארו במכשיר הזה. הישארו כאן ונסו שוב כדי להשלים את ההתנתקות בבטחה.",
    navigationFailedTitle: "לא ניתן היה לפתוח את דף הבית",
    navigationFailedMessage:
      "ההתנתקות המקומית הושלמה, אך לא ניתן היה לפתוח את דף הבית. נסו לנווט אליו שוב.",
  },
  ky: {
    loggedOut: "Чыгып кеттиңиз",
    logoutFailed: "Ой! Чыгуу ишке ашкан жок. Кайра аракет кылыңыз",
    localOnlyTitle: "Ушул түзмөктү гана тазалайсызбы?",
    localOnlyMessage:
      "Серверден чыгуу ырасталган жок. Жергиликтүү аккаунт маалыматтарын жана ачкычтарды өчүрсө болот, бирок кайра кирип аларды жокко чыгармайынча же мөөнөтү бүткөнгө чейин сервердик сеанстар активдүү калышы мүмкүн.",
    clearLocalData: "Бул түзмөктү тазалоо",
    retry: "Кайра аракет кылуу",
    localCleanupFailedTitle: "Бул түзмөктү тазалоо мүмкүн болгон жок",
    localCleanupFailedMessage:
      "Бул түзмөктө аккаунт маалыматтары же ачкычтар калышы мүмкүн. Коопсуз чыгууну аяктоо үчүн ушул жерде калып, кайра аракет кылыңыз.",
    navigationFailedTitle: "Башкы бетти ачуу мүмкүн болгон жок",
    navigationFailedMessage:
      "Жергиликтүү чыгуу аяктады, бирок башкы бет ачылган жок. Кайра өтүп көрүңүз.",
  },
  ru: {
    loggedOut: "Вы вышли из аккаунта",
    logoutFailed: "Ой! Не удалось выйти. Попробуйте ещё раз",
    localOnlyTitle: "Очистить данные только на этом устройстве?",
    localOnlyMessage:
      "Не удалось подтвердить выход на сервере. Данные аккаунта и ключи можно удалить с этого устройства, но серверные сеансы могут оставаться активными, пока вы не отзовёте их после повторного входа или пока не истечёт срок их действия.",
    clearLocalData: "Очистить это устройство",
    retry: "Повторить",
    localCleanupFailedTitle: "Не удалось очистить это устройство",
    localCleanupFailedMessage:
      "На этом устройстве могли остаться данные аккаунта или ключи. Оставайтесь на этой странице и повторите попытку, чтобы безопасно завершить выход.",
    navigationFailedTitle: "Не удалось открыть главную страницу",
    navigationFailedMessage:
      "Локальный выход завершён, но открыть главную страницу не удалось. Попробуйте перейти на неё ещё раз.",
  },
};

import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommonApiTranslations {
  timeoutError: string;
  networkError: string;
  requestCanceled: string;
  invalidRequest: string;
  serverError: string;
  tooManyRedirects: string;
  configurationError: string;
  featureNotSupported: string;
  operationNotSupported: string;
  invalidUrl: string;
  unexpectedError: string;
  noInternetConnection: string;
}

export const commonApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommonApiTranslations
> = {
  en: {
    timeoutError:
      "Request timed out. The server is taking longer than expected to respond.",
    networkError:
      "Network error. Please check your internet connection and try again.",
    requestCanceled: "Request was canceled.",
    invalidRequest: "Invalid request. Please check your input and try again.",
    serverError: "Server error. Please try again later.",
    tooManyRedirects:
      "Too many redirects. Please contact support if this continues.",
    configurationError:
      "Configuration error. Please refresh the page and try again.",
    featureNotSupported:
      "This feature is no longer supported. Please update your app.",
    operationNotSupported:
      "This operation is not supported in your current environment.",
    invalidUrl: "Invalid request URL. Please contact support.",
    unexpectedError: "An unexpected error occurred. Please try again.",
    noInternetConnection: "No internet connection",
  },
  ar: {
    timeoutError:
      "انتهت مهلة الطلب. الخادم يستغرق وقتاً أطول من المتوقع للاستجابة.",
    networkError:
      "خطأ في الشبكة. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.",
    requestCanceled: "تم إلغاء الطلب.",
    invalidRequest: "طلب غير صحيح. يرجى التحقق من المدخلات والمحاولة مرة أخرى.",
    serverError: "خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.",
    tooManyRedirects:
      "إعادة توجيه كثيرة جداً. يرجى الاتصال بالدعم إذا استمر هذا.",
    configurationError: "خطأ في التكوين. يرجى تحديث الصفحة والمحاولة مرة أخرى.",
    featureNotSupported: "هذه الميزة لم تعد مدعومة. يرجى تحديث التطبيق.",
    operationNotSupported: "هذه العملية غير مدعومة في بيئتك الحالية.",
    invalidUrl: "رابط الطلب غير صحيح. يرجى الاتصال بالدعم.",
    unexpectedError: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
    noInternetConnection: "لا يوجد اتصال بالإنترنت",
  },
  es: {
    timeoutError:
      "Se agotó el tiempo de espera. El servidor está tardando más de lo esperado en responder.",
    networkError:
      "Error de red. Por favor verifica tu conexión a internet e inténtalo de nuevo.",
    requestCanceled: "La solicitud fue cancelada.",
    invalidRequest:
      "Solicitud inválida. Por favor verifica tu entrada e inténtalo de nuevo.",
    serverError: "Error del servidor. Por favor inténtalo de nuevo más tarde.",
    tooManyRedirects:
      "Demasiadas redirecciones. Por favor contacta soporte si esto continúa.",
    configurationError:
      "Error de configuración. Por favor actualiza la página e inténtalo de nuevo.",
    featureNotSupported:
      "Esta función ya no es compatible. Por favor actualiza tu aplicación.",
    operationNotSupported:
      "Esta operación no es compatible en tu entorno actual.",
    invalidUrl: "URL de solicitud inválida. Por favor contacta soporte.",
    unexpectedError:
      "Ocurrió un error inesperado. Por favor inténtalo de nuevo.",
    noInternetConnection: "Sin conexión a internet",
  },
  fa: {
    timeoutError:
      "زمان درخواست به پایان رسید. سرور بیش از حد انتظار طول می‌کشد.",
    networkError:
      "خطای شبکه. لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.",
    requestCanceled: "درخواست لغو شد.",
    invalidRequest: "درخواست نامعتبر. لطفاً ورودی خود را بررسی کرده و دوباره تلاش کنید.",
    serverError: "خطای سرور. لطفاً بعداً دوباره تلاش کنید.",
    tooManyRedirects:
      "تغییر مسیرهای بیش از حد. در صورت ادامه، لطفاً با پشتیبانی تماس بگیرید.",
    configurationError:
      "خطای پیکربندی. لطفاً صفحه را بارگذاری مجدد کرده و دوباره تلاش کنید.",
    featureNotSupported:
      "این قابلیت دیگر پشتیبانی نمی‌شود. لطفاً برنامه خود را به‌روزرسانی کنید.",
    operationNotSupported:
      "این عملیات در محیط فعلی شما پشتیبانی نمی‌شود.",
    invalidUrl: "آدرس درخواست نامعتبر. لطفاً با پشتیبانی تماس بگیرید.",
    unexpectedError: "خطای غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید.",
    noInternetConnection: "بدون اتصال اینترنت",
  },
  he: {
    timeoutError:
      "הבקשה חרגה מהזמן המוקצב. השרת לוקח יותר זמן מהצפוי להגיב.",
    networkError:
      "שגיאת רשת. אנא בדקו את חיבור האינטרנט שלכם ונסו שוב.",
    requestCanceled: "הבקשה בוטלה.",
    invalidRequest: "בקשה לא תקינה. אנא בדקו את הקלט ונסו שוב.",
    serverError: "שגיאת שרת. אנא נסו שוב מאוחר יותר.",
    tooManyRedirects:
      "יותר מדי הפניות. אנא פנו לתמיכה אם הבעיה נמשכת.",
    configurationError:
      "שגיאת תצורה. אנא רעננו את הדף ונסו שוב.",
    featureNotSupported:
      "תכונה זו אינה נתמכת עוד. אנא עדכנו את האפליקציה.",
    operationNotSupported:
      "פעולה זו אינה נתמכת בסביבה הנוכחית שלכם.",
    invalidUrl: "כתובת בקשה לא תקינה. אנא פנו לתמיכה.",
    unexpectedError: "אירעה שגיאה לא צפויה. אנא נסו שוב.",
    noInternetConnection: "אין חיבור לאינטרנט",
  },
  fr: {
    timeoutError:
      "Délai d'attente dépassé. Le serveur met plus de temps que prévu à répondre.",
    networkError:
      "Erreur réseau. Veuillez vérifier votre connexion internet et réessayer.",
    requestCanceled: "La demande a été annulée.",
    invalidRequest:
      "Demande invalide. Veuillez vérifier votre saisie et réessayer.",
    serverError: "Erreur serveur. Veuillez réessayer plus tard.",
    tooManyRedirects:
      "Trop de redirections. Veuillez contacter le support si cela persiste.",
    configurationError:
      "Erreur de configuration. Veuillez actualiser la page et réessayer.",
    featureNotSupported:
      "Cette fonctionnalité n'est plus supportée. Veuillez mettre à jour votre application.",
    operationNotSupported:
      "Cette opération n'est pas supportée dans votre environnement actuel.",
    invalidUrl: "URL de demande invalide. Veuillez contacter le support.",
    unexpectedError:
      "Une erreur inattendue s'est produite. Veuillez réessayer.",
    noInternetConnection: "Pas de connexion internet",
  },
  "zh-Hans": {
    timeoutError: "请求超时。服务器响应时间比预期更长。",
    networkError: "网络错误。请检查您的网络连接并重试。",
    requestCanceled: "请求已被取消。",
    invalidRequest: "无效请求。请检查您的输入并重试。",
    serverError: "服务器错误。请稍后重试。",
    tooManyRedirects: "重定向次数过多。如果问题持续，请联系支持。",
    configurationError: "配置错误。请刷新页面并重试。",
    featureNotSupported: "此功能不再受支持。请更新您的应用。",
    operationNotSupported: "当前环境不支持此操作。",
    invalidUrl: "无效的请求URL。请联系支持。",
    unexpectedError: "发生意外错误。请重试。",
    noInternetConnection: "无网络连接",
  },
  "zh-Hant": {
    timeoutError: "請求超時。伺服器回應時間比預期更長。",
    networkError: "網絡錯誤。請檢查您的網絡連接並重試。",
    requestCanceled: "請求已被取消。",
    invalidRequest: "無效請求。請檢查您的輸入並重試。",
    serverError: "伺服器錯誤。請稍後重試。",
    tooManyRedirects: "重新導向次數過多。如果問題持續，請聯繫支援。",
    configurationError: "配置錯誤。請重新整理頁面並重試。",
    featureNotSupported: "此功能不再受支援。請更新您的應用程式。",
    operationNotSupported: "目前環境不支援此操作。",
    invalidUrl: "無效的請求URL。請聯繫支援。",
    unexpectedError: "發生意外錯誤。請重試。",
    noInternetConnection: "無網絡連接",
  },
  ja: {
    timeoutError:
      "リクエストがタイムアウトしました。サーバーの応答に予想以上の時間がかかっています。",
    networkError:
      "ネットワークエラーです。インターネット接続を確認してもう一度お試しください。",
    requestCanceled: "リクエストがキャンセルされました。",
    invalidRequest:
      "無効なリクエストです。入力内容を確認してもう一度お試しください。",
    serverError: "サーバーエラーです。しばらくしてからもう一度お試しください。",
    tooManyRedirects:
      "リダイレクトが多すぎます。問題が続く場合はサポートにお問い合わせください。",
    configurationError:
      "設定エラーです。ページを更新してもう一度お試しください。",
    featureNotSupported:
      "この機能はサポートされなくなりました。アプリを更新してください。",
    operationNotSupported: "この操作は現在の環境でサポートされていません。",
    invalidUrl: "無効なリクエストURLです。サポートにお問い合わせください。",
    unexpectedError: "予期しないエラーが発生しました。もう一度お試しください。",
    noInternetConnection: "インターネット接続がありません",
  },
  ky: {
    timeoutError:
      "Суроо-талап убактысы бүттү. Сервер күтүлгөндөн көп убакыт жооп берип жатат.",
    networkError:
      "Тармак катасы. Интернет байланышыңызды текшерип, кайра аракет кылыңыз.",
    requestCanceled: "Суроо-талап жокко чыгарылды.",
    invalidRequest:
      "Жараксыз суроо-талап. Киргизгениңизди текшерип, кайра аракет кылыңыз.",
    serverError: "Сервер катасы. Кийинчерээк кайра аракет кылыңыз.",
    tooManyRedirects:
      "Өтө көп кайра багыттоо. Көйгөй улана берсе, колдоого кайрылыңыз.",
    configurationError:
      "Конфигурация катасы. Баракты жаңылап, кайра аракет кылыңыз.",
    featureNotSupported:
      "Бул функция мындан ары колдоого алынбайт. Тиркемеңизди жаңылаңыз.",
    operationNotSupported:
      "Бул операция учурдагы чөйрөңүздө колдоого алынбайт.",
    invalidUrl: "Жараксыз суроо-талап URL. Колдоого кайрылыңыз.",
    unexpectedError: "Күтүлбөгөн ката пайда болду. Кайра аракет кылыңыз.",
    noInternetConnection: "Интернет байланышы жок",
  },
  ru: {
    timeoutError:
      "Превышено время ожидания запроса. Сервер отвечает дольше, чем ожидалось.",
    networkError:
      "Ошибка сети. Пожалуйста, проверьте подключение к интернету и попробуйте снова.",
    requestCanceled: "Запрос был отменён.",
    invalidRequest:
      "Некорректный запрос. Пожалуйста, проверьте введённые данные и попробуйте снова.",
    serverError: "Ошибка сервера. Пожалуйста, попробуйте позже.",
    tooManyRedirects:
      "Слишком много перенаправлений. Обратитесь в поддержку, если проблема продолжается.",
    configurationError:
      "Ошибка конфигурации. Обновите страницу и попробуйте снова.",
    featureNotSupported:
      "Эта функция больше не поддерживается. Обновите приложение.",
    operationNotSupported:
      "Эта операция не поддерживается в вашей текущей среде.",
    invalidUrl: "Некорректный URL запроса. Обратитесь в поддержку.",
    unexpectedError:
      "Произошла непредвиденная ошибка. Пожалуйста, попробуйте снова.",
    noInternetConnection: "Нет подключения к интернету",
  },
};

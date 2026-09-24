import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SecurityAddEmailTranslations {
  category: string;
  title: string;
  description: string;
  action: string;
  addNow: string;
}

export const securityAddEmailTranslations: Record<
  SupportedDisplayLanguageCodes,
  SecurityAddEmailTranslations
> = {
  en: {
    category: "Security",
    title: "Add another way to sign in",
    description:
      "Rarimo sign-in may be unavailable for a while, and phone sign-in can be disrupted. Verify an email address so you have another way to access your account.",
    action: "Add email address",
    addNow: "Add now",
  },
  fr: {
    category: "Sécurité",
    title: "Ajoutez un autre moyen de connexion",
    description:
      "La connexion avec Rarimo pourrait être indisponible pendant un certain temps et la connexion par téléphone peut être perturbée. Vérifiez une adresse e-mail pour pouvoir accéder à votre compte autrement.",
    action: "Ajouter une adresse e-mail",
    addNow: "Ajouter maintenant",
  },
  es: {
    category: "Seguridad",
    title: "Añade otra forma de iniciar sesión",
    description:
      "Es posible que el inicio de sesión con Rarimo no esté disponible durante un tiempo y que el acceso por teléfono se interrumpa. Verifica una dirección de correo para tener otra forma de acceder a tu cuenta.",
    action: "Añadir correo electrónico",
    addNow: "Añadir ahora",
  },
  ar: {
    category: "الأمان",
    title: "أضف طريقة أخرى لتسجيل الدخول",
    description:
      "قد يتعذر تسجيل الدخول عبر Rarimo لفترة، وقد يتعطل تسجيل الدخول عبر الهاتف. تحقّق من عنوان بريد إلكتروني لتتمكن من الوصول إلى حسابك بطريقة أخرى.",
    action: "إضافة بريد إلكتروني",
    addNow: "أضفه الآن",
  },
  fa: {
    category: "امنیت",
    title: "راه دیگری برای ورود اضافه کنید",
    description:
      "ورود با Rarimo ممکن است مدتی در دسترس نباشد و ورود با تلفن هم ممکن است مختل شود. یک نشانی ایمیل را تأیید کنید تا راه دیگری برای دسترسی به حساب خود داشته باشید.",
    action: "افزودن نشانی ایمیل",
    addNow: "اکنون اضافه کنید",
  },
  he: {
    category: "אבטחה",
    title: "הוסיפו דרך נוספת להתחבר",
    description:
      "ייתכן שההתחברות דרך Rarimo לא תהיה זמינה לזמן מה, וההתחברות בטלפון עלולה להשתבש. אמתו כתובת אימייל כדי שתוכלו לגשת לחשבון בדרך נוספת.",
    action: "הוספת כתובת אימייל",
    addNow: "להוסיף עכשיו",
  },
  "zh-Hans": {
    category: "安全",
    title: "添加另一种登录方式",
    description:
      "Rarimo 登录可能会暂时不可用，手机登录也可能中断。请验证电子邮箱，以便通过另一种方式访问您的账户。",
    action: "添加电子邮箱",
    addNow: "立即添加",
  },
  "zh-Hant": {
    category: "安全",
    title: "新增另一種登入方式",
    description:
      "Rarimo 登入可能暫時無法使用，手機登入也可能中斷。請驗證電子郵件地址，以便透過另一種方式存取您的帳戶。",
    action: "新增電子郵件地址",
    addNow: "立即新增",
  },
  ja: {
    category: "セキュリティ",
    title: "別のログイン方法を追加してください",
    description:
      "Rarimoでのログインはしばらく利用できない可能性があり、電話でのログインも中断されることがあります。別の方法でアカウントにアクセスできるよう、メールアドレスを認証してください。",
    action: "メールアドレスを追加",
    addNow: "今すぐ追加",
  },
  ky: {
    category: "Коопсуздук",
    title: "Кирүүнүн дагы бир жолун кошуңуз",
    description:
      "Rarimo аркылуу кирүү бир аз убакытка жеткиликсиз болушу мүмкүн, ал эми телефон аркылуу кирүү үзгүлтүккө учурашы мүмкүн. Аккаунтуңузга башка жол менен кирүү үчүн электрондук почтаңызды ырастаңыз.",
    action: "Электрондук почтаны кошуу",
    addNow: "Азыр кошуу",
  },
  ru: {
    category: "Безопасность",
    title: "Добавьте ещё один способ входа",
    description:
      "Вход через Rarimo может быть недоступен некоторое время, а вход по телефону — прерываться. Подтвердите адрес электронной почты, чтобы у вас был ещё один способ войти в аккаунт.",
    action: "Добавить адрес почты",
    addNow: "Добавить сейчас",
  },
};

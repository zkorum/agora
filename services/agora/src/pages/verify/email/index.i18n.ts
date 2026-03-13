import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VerifyEmailTranslations {
  title: string;
  alreadyHasEmail: string;
  throttled: string;
  unreachable: string;
  disposable: string;
  credentialAlreadyLinked: string;
  somethingWrong: string;
}

export const verifyEmailTranslations: Record<
  SupportedDisplayLanguageCodes,
  VerifyEmailTranslations
> = {
  en: {
    title: "Verify Email",
    alreadyHasEmail:
      "You already have an email address linked to your account",
    throttled:
      "Too many attempts—please wait before trying again",
    unreachable:
      "This email address doesn't seem to exist—please check and try again",
    disposable:
      "Temporary or disposable email addresses are not allowed",
    credentialAlreadyLinked:
      "This email address is already linked to another account",
    somethingWrong: "Oops! Something went wrong—please try again",
  },
  ar: {
    title: "التحقق من البريد الإلكتروني",
    alreadyHasEmail:
      "لديك بالفعل عنوان بريد إلكتروني مرتبط بحسابك",
    throttled: "محاولات كثيرة جداً—يرجى الانتظار قبل المحاولة مرة أخرى",
    unreachable:
      "يبدو أن عنوان البريد الإلكتروني هذا غير موجود—يرجى التحقق والمحاولة مرة أخرى",
    disposable: "عناوين البريد الإلكتروني المؤقتة أو التي يمكن التخلص منها غير مسموح بها",
    credentialAlreadyLinked:
      "عنوان البريد الإلكتروني هذا مرتبط بالفعل بحساب آخر",
    somethingWrong: "عفواً! حدث خطأ—يرجى المحاولة مرة أخرى",
  },
  es: {
    title: "Verificar correo electrónico",
    alreadyHasEmail:
      "Ya tienes una dirección de correo electrónico vinculada a tu cuenta",
    throttled:
      "Demasiados intentos—por favor, espere antes de intentar de nuevo",
    unreachable:
      "Esta dirección de correo electrónico no parece existir—verifique e intente de nuevo",
    disposable:
      "No se permiten direcciones de correo electrónico temporales o desechables",
    credentialAlreadyLinked:
      "Esta dirección de correo electrónico ya está vinculada a otra cuenta",
    somethingWrong: "¡Ups! Algo salió mal—intente de nuevo",
  },
  fr: {
    title: "Vérifier l'e-mail",
    alreadyHasEmail:
      "Une adresse e-mail est déjà associée à votre compte",
    throttled:
      "Trop de tentatives—veuillez attendre avant de réessayer",
    unreachable:
      "Cette adresse e-mail ne semble pas exister—veuillez vérifier et réessayer",
    disposable:
      "Les adresses e-mail temporaires ou jetables ne sont pas autorisées",
    credentialAlreadyLinked:
      "Cette adresse e-mail est déjà associée à un autre compte",
    somethingWrong: "Oups ! Quelque chose a mal tourné—veuillez réessayer",
  },
  "zh-Hans": {
    title: "验证邮箱",
    alreadyHasEmail: "您的账户已关联电子邮箱地址",
    throttled: "尝试次数过多—请稍后再试",
    unreachable: "此电子邮箱地址似乎不存在—请检查后重试",
    disposable: "不允许使用临时或一次性电子邮箱地址",
    credentialAlreadyLinked: "此电子邮箱地址已关联到另一个账户",
    somethingWrong: "哎呀！出错了—请重试",
  },
  "zh-Hant": {
    title: "驗證郵箱",
    alreadyHasEmail: "您的帳戶已關聯電子郵箱地址",
    throttled: "嘗試次數過多—請稍後再試",
    unreachable: "此電子郵箱地址似乎不存在—請檢查後重試",
    disposable: "不允許使用臨時或一次性電子郵箱地址",
    credentialAlreadyLinked: "此電子郵箱地址已關聯到另一個帳戶",
    somethingWrong: "哎呀！出錯了—請重試",
  },
  ja: {
    title: "メール確認",
    alreadyHasEmail:
      "アカウントにはすでにメールアドレスがリンクされています",
    throttled: "試行回数が多すぎます—もう一度試す前にお待ちください",
    unreachable:
      "このメールアドレスは存在しないようです—確認してもう一度お試しください",
    disposable:
      "一時的または使い捨てのメールアドレスは許可されていません",
    credentialAlreadyLinked:
      "このメールアドレスはすでに別のアカウントにリンクされています",
    somethingWrong: "おっと！何かが間違っています—もう一度お試しください",
  },
  ky: {
    title: "Электрондук почтаны текшерүү",
    alreadyHasEmail:
      "Каттоо эсебиңизге электрондук почта мурунтан эле байланышкан",
    throttled: "Аракеттер өтө көп—кайра аракет кылуудан мурун күтүңүз",
    unreachable:
      "Бул электрондук почта дареги жок сыяктуу—текшерип, кайра аракет кылыңыз",
    disposable:
      "Убактылуу же бир жолку электрондук почта даректерине уруксат берилбейт",
    credentialAlreadyLinked:
      "Бул электрондук почта дареги башка каттоо эсебине байланышкан",
    somethingWrong: "Ой! Бир нерсе туура эмес болду—кайра аракет кылыңыз",
  },
  ru: {
    title: "Подтверждение email",
    alreadyHasEmail:
      "К вашему аккаунту уже привязан адрес электронной почты",
    throttled: "Слишком много попыток — подождите перед повторной попыткой",
    unreachable:
      "Этот адрес электронной почты, похоже, не существует — проверьте и попробуйте снова",
    disposable:
      "Временные или одноразовые адреса электронной почты не допускаются",
    credentialAlreadyLinked:
      "Этот адрес электронной почты уже привязан к другому аккаунту",
    somethingWrong: "Ой! Что-то пошло не так — попробуйте ещё раз",
  },
};

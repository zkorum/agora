import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface VerifyPassportTranslations {
  title: string;
  description: string;
  preferPhoneVerification: string;
  alreadyHasPassport: string;
}

export const verifyPassportTranslations: Record<
  SupportedDisplayLanguageCodes,
  VerifyPassportTranslations
> = {
  en: {
    title: "Verify Identity",
    description:
      "Rarimo is a ZK-powered identity wallet that converts your passport into an anonymous digital ID, stored on your device, so you can prove that you're a unique human without sharing any personal data with anyone.",
    preferPhoneVerification: "I'd rather verify with my phone number",
    alreadyHasPassport:
      "You already have a verified passport linked to your account",
  },
  ar: {
    title: "تحقق من الهوية",
    description:
      "رقمي هي محفظة هوية مدعومة بتقنية ZK تحول جواز سفرك إلى هوية رقمية مجهولة، محفوظة على جهازك، حتى تتمكن من إثبات أنك إنسان فريد دون مشاركة أي بيانات شخصية مع أي شخص.",
    preferPhoneVerification: "أفضل التحقق برقم الهاتف",
    alreadyHasPassport: "لديك بالفعل جواز سفر موثق مرتبط بحسابك",
  },
  es: {
    title: "Verificar identidad",
    description:
      "Rarimo es una billetera de identidad con tecnología ZK que convierte su pasaporte en una ID digital anónima, almacenada en su dispositivo, para que pueda demostrar que es un humano único sin compartir datos personales con nadie.",
    preferPhoneVerification: "Prefiero verificar con mi número de teléfono",
    alreadyHasPassport:
      "Ya tienes un pasaporte verificado vinculado a tu cuenta",
  },
  fa: {
    title: "تأیید هویت",
    description:
      "Rarimo یک کیف پول هویت مبتنی بر ZK است که پاسپورت شما را به یک شناسه دیجیتال ناشناس تبدیل می‌کند که در دستگاه شما ذخیره می‌شود، بنابراین می‌توانید بدون اشتراک‌گذاری هیچ داده شخصی با هیچ‌کس، ثابت کنید که یک انسان منحصربه‌فرد هستید.",
    preferPhoneVerification: "ترجیح می‌دهم با شماره تلفنم تأیید هویت کنم",
    alreadyHasPassport:
      "قبلاً یک پاسپورت تأییدشده به حساب شما متصل شده است",
  },
  he: {
    title: "אימות זהות",
    description:
      "Rarimo הוא ארנק זהות מבוסס ZK שממיר את הדרכון שלכם לזהות דיגיטלית אנונימית, המאוחסנת במכשיר שלכם, כך שתוכלו להוכיח שאתם אדם ייחודי מבלי לשתף מידע אישי עם אף אחד.",
    preferPhoneVerification: "אני מעדיף/ה לאמת עם מספר הטלפון שלי",
    alreadyHasPassport:
      "דרכון מאומת כבר מקושר לחשבון שלכם",
  },
  fr: {
    title: "Vérifier l'identité",
    description:
      "Rarimo est un portefeuille d'identité alimenté par ZK qui convertit votre passeport en ID numérique anonyme, stockée sur votre appareil, pour que vous puissiez prouver que vous êtes un humain unique sans partager de données personnelles avec quiconque.",
    preferPhoneVerification:
      "Je préfère vérifier avec mon numéro de téléphone",
    alreadyHasPassport:
      "Un passeport vérifié est déjà associé à votre compte",
  },
  "zh-Hans": {
    title: "验证身份",
    description:
      "Rarimo 是一个 ZK 驱动的身份钱包，将您的护照转换为匿名数字 ID，存储在您的设备上，这样您就可以证明您是一个独特的、没有与任何人分享任何个人数据的人。",
    preferPhoneVerification: "我更喜欢使用手机号验证",
    alreadyHasPassport: "您的账户已关联已验证的护照",
  },
  "zh-Hant": {
    title: "驗證身份",
    description:
      "Rarimo 是一個 ZK 驅動的身份錢包，將您的護照轉換為匿名數字 ID，存儲在您的設備上，這樣您就可以證明您是一個獨特的、沒有與任何人分享任何個人數據的人。",
    preferPhoneVerification: "我更喜歡使用手機號驗證",
    alreadyHasPassport: "您的帳戶已關聯已驗證的護照",
  },
  ja: {
    title: "本人確認",
    description:
      "Rarimo は ZK 駆動の身元ウォレットで、あなたのパスポートを匿名の数字 ID に変換し、あなたのデバイスに保存します。これにより、あなたは誰とも個人情報を共有せずに、独自の人間であることを証明できます。",
    preferPhoneVerification: "携帯電話で検証したい",
    alreadyHasPassport:
      "アカウントにはすでに認証済みのパスポートがリンクされています",
  },
  ky: {
    title: "Инсандыкты текшерүү",
    description:
      "Rarimo — бул ZK технологиясына негизделген инсандык капчык, ал паспортуңузду анонимдүү санариптик IDге айландырат жана түзмөгүңүздө сактайт, ошондуктан сиз жеке маалыматыңызды эч ким менен бөлүшпөстөн, уникалдуу адам экениңизди далилдей аласыз.",
    preferPhoneVerification: "Телефон номерим менен текшерүүнү каалайм",
    alreadyHasPassport:
      "Каттоо эсебиңизге текшерилген паспорт мурунтан эле байланышкан",
  },
  ru: {
    title: "Верификация личности",
    description:
      "Rarimo — это кошелёк идентификации на основе ZK-доказательств, который преобразует ваш паспорт в анонимный цифровой ID, хранящийся на вашем устройстве, позволяя доказать свою уникальность без раскрытия персональных данных.",
    preferPhoneVerification: "Предпочитаю верификацию по номеру телефона",
    alreadyHasPassport:
      "К вашему аккаунту уже привязан верифицированный паспорт",
  },
};

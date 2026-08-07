import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UsernameChangeTranslations {
  usernameLabel: string;
  updateButton: string;
  usernameChanged: string;
  usernameAlreadyInUse: string;
  usernameCurrentlyInUse: string;
  submitError: string;
  invalidCharacters: string;
  letterOrNumberRequired: string;
  consecutiveUnderscores: string;
  tooShort: string;
  tooLong: string;
  reservedPrefix: string;
  reservedUsername: string;
  invalidUsername: string;
}

export const usernameChangeTranslations: Record<
  SupportedDisplayLanguageCodes,
  UsernameChangeTranslations
> = {
  en: {
    usernameLabel: "Username",
    updateButton: "Update",
    usernameChanged: "Username changed",
    usernameAlreadyInUse: "Username is already in use",
    usernameCurrentlyInUse: "This username is currently in use",
    submitError: "Error while trying to submit username change",
    invalidCharacters:
      "Username may only contain lowercase letters, numbers, and underscores",
    letterOrNumberRequired:
      "Username must contain at least one letter or number",
    consecutiveUnderscores:
      "Username must not contain two consecutive underscores",
    tooShort: "Username must contain at least {min} characters",
    tooLong: "Username cannot exceed {max} characters",
    reservedPrefix: "Username must not start with 'ext'",
    reservedUsername: "This username is reserved",
    invalidUsername: "Invalid username",
  },
  ar: {
    usernameLabel: "اسم المستخدم",
    updateButton: "تحديث",
    usernameChanged: "تم تغيير اسم المستخدم",
    usernameAlreadyInUse: "اسم المستخدم مُستخدم بالفعل",
    usernameCurrentlyInUse: "هذا الاسم مُستخدم حالياً",
    submitError: "خطأ أثناء محاولة تغيير اسم المستخدم",
    invalidCharacters:
      "لا يجوز أن يحتوي اسم المستخدم إلا على أحرف إنجليزية صغيرة وأرقام وشرطات سفلية",
    letterOrNumberRequired:
      "يجب أن يحتوي اسم المستخدم على حرف أو رقم واحد على الأقل",
    consecutiveUnderscores:
      "يجب ألا يحتوي اسم المستخدم على شرطتين سفليتين متتاليتين",
    tooShort: "يجب أن يتكون اسم المستخدم من {min} أحرف على الأقل",
    tooLong: "يجب ألا يتجاوز اسم المستخدم {max} حرفاً",
    reservedPrefix: "يجب ألا يبدأ اسم المستخدم بـ 'ext'",
    reservedUsername: "اسم المستخدم هذا محجوز",
    invalidUsername: "اسم المستخدم غير صالح",
  },
  es: {
    usernameLabel: "Nombre de usuario",
    updateButton: "Actualizar",
    usernameChanged: "Nombre de usuario cambiado",
    usernameAlreadyInUse: "El nombre de usuario ya está en uso",
    usernameCurrentlyInUse: "Este nombre de usuario está actualmente en uso",
    submitError: "Error al intentar enviar el cambio de nombre de usuario",
    invalidCharacters:
      "El nombre de usuario solo puede contener letras minúsculas, números y guiones bajos",
    letterOrNumberRequired:
      "El nombre de usuario debe contener al menos una letra o un número",
    consecutiveUnderscores:
      "El nombre de usuario no puede contener dos guiones bajos consecutivos",
    tooShort: "El nombre de usuario debe contener al menos {min} caracteres",
    tooLong: "El nombre de usuario no puede superar los {max} caracteres",
    reservedPrefix: "El nombre de usuario no puede comenzar por 'ext'",
    reservedUsername: "Este nombre de usuario está reservado",
    invalidUsername: "Nombre de usuario no válido",
  },
  fa: {
    usernameLabel: "نام کاربری",
    updateButton: "به‌روزرسانی",
    usernameChanged: "نام کاربری تغییر کرد",
    usernameAlreadyInUse: "این نام کاربری قبلاً استفاده شده است",
    usernameCurrentlyInUse: "این نام کاربری در حال حاضر در حال استفاده است",
    submitError: "خطا هنگام ارسال تغییر نام کاربری",
    invalidCharacters:
      "نام کاربری فقط می‌تواند شامل حروف کوچک انگلیسی، اعداد و زیرخط باشد",
    letterOrNumberRequired: "نام کاربری باید حداقل یک حرف یا عدد داشته باشد",
    consecutiveUnderscores: "نام کاربری نباید دو زیرخط پیاپی داشته باشد",
    tooShort: "نام کاربری باید حداقل {min} نویسه داشته باشد",
    tooLong: "نام کاربری نباید بیش از {max} نویسه باشد",
    reservedPrefix: "نام کاربری نباید با 'ext' شروع شود",
    reservedUsername: "این نام کاربری رزرو شده است",
    invalidUsername: "نام کاربری نامعتبر است",
  },
  fr: {
    usernameLabel: "Nom d'utilisateur",
    updateButton: "Mettre à jour",
    usernameChanged: "Nom d'utilisateur modifié",
    usernameAlreadyInUse: "Le nom d'utilisateur est déjà utilisé",
    usernameCurrentlyInUse: "Ce nom d'utilisateur est actuellement utilisé",
    submitError:
      "Erreur lors de la tentative de soumission du changement de nom d'utilisateur",
    invalidCharacters:
      "Le nom d'utilisateur ne peut contenir que des lettres minuscules, des chiffres et des traits de soulignement",
    letterOrNumberRequired:
      "Le nom d'utilisateur doit contenir au moins une lettre ou un chiffre",
    consecutiveUnderscores:
      "Le nom d'utilisateur ne doit pas contenir deux traits de soulignement consécutifs",
    tooShort: "Le nom d'utilisateur doit contenir au moins {min} caractères",
    tooLong: "Le nom d'utilisateur ne peut pas dépasser {max} caractères",
    reservedPrefix: "Le nom d'utilisateur ne doit pas commencer par 'ext'",
    reservedUsername: "Ce nom d'utilisateur est réservé",
    invalidUsername: "Nom d'utilisateur invalide",
  },
  "zh-Hans": {
    usernameLabel: "用户名",
    updateButton: "更新",
    usernameChanged: "用户名已更改",
    usernameAlreadyInUse: "用户名已被使用",
    usernameCurrentlyInUse: "此用户名当前已被使用",
    submitError: "尝试提交用户名更改时出错",
    invalidCharacters: "用户名只能包含小写字母、数字和下划线",
    letterOrNumberRequired: "用户名必须至少包含一个字母或数字",
    consecutiveUnderscores: "用户名不能包含两个连续的下划线",
    tooShort: "用户名必须至少包含 {min} 个字符",
    tooLong: "用户名不能超过 {max} 个字符",
    reservedPrefix: "用户名不能以 'ext' 开头",
    reservedUsername: "此用户名已被保留",
    invalidUsername: "用户名无效",
  },
  "zh-Hant": {
    usernameLabel: "用戶名",
    updateButton: "更新",
    usernameChanged: "用戶名已更改",
    usernameAlreadyInUse: "用戶名已被使用",
    usernameCurrentlyInUse: "此用戶名當前已被使用",
    submitError: "嘗試提交用戶名更改時出錯",
    invalidCharacters: "用戶名只能包含小寫字母、數字和底線",
    letterOrNumberRequired: "用戶名必須至少包含一個字母或數字",
    consecutiveUnderscores: "用戶名不能包含兩個連續的底線",
    tooShort: "用戶名必須至少包含 {min} 個字元",
    tooLong: "用戶名不能超過 {max} 個字元",
    reservedPrefix: "用戶名不能以 'ext' 開頭",
    reservedUsername: "此用戶名已被保留",
    invalidUsername: "用戶名無效",
  },
  he: {
    usernameLabel: "שם משתמש",
    updateButton: "עדכון",
    usernameChanged: "שם המשתמש שונה",
    usernameAlreadyInUse: "שם המשתמש כבר בשימוש",
    usernameCurrentlyInUse: "שם משתמש זה נמצא כעת בשימוש",
    submitError: "שגיאה בעת ניסיון לשלוח שינוי שם משתמש",
    invalidCharacters:
      "שם המשתמש יכול להכיל רק אותיות לטיניות קטנות, מספרים וקווים תחתונים",
    letterOrNumberRequired: "שם המשתמש חייב להכיל לפחות אות או מספר אחד",
    consecutiveUnderscores: "שם המשתמש לא יכול להכיל שני קווים תחתונים רצופים",
    tooShort: "שם המשתמש חייב להכיל לפחות {min} תווים",
    tooLong: "שם המשתמש לא יכול להכיל יותר מ-{max} תווים",
    reservedPrefix: "שם המשתמש לא יכול להתחיל ב-'ext'",
    reservedUsername: "שם המשתמש הזה שמור",
    invalidUsername: "שם משתמש לא תקין",
  },
  ja: {
    usernameLabel: "ユーザー名",
    updateButton: "更新",
    usernameChanged: "ユーザー名が変更されました",
    usernameAlreadyInUse: "ユーザー名はすでに使用されています",
    usernameCurrentlyInUse: "このユーザー名は現在使用されています",
    submitError: "ユーザー名の変更を送信する際にエラーが発生しました",
    invalidCharacters:
      "ユーザー名には小文字、数字、アンダースコアのみ使用できます",
    letterOrNumberRequired:
      "ユーザー名には少なくとも 1 つの文字または数字が必要です",
    consecutiveUnderscores:
      "ユーザー名にアンダースコアを 2 つ続けて使用することはできません",
    tooShort: "ユーザー名は {min} 文字以上である必要があります",
    tooLong: "ユーザー名は {max} 文字以内である必要があります",
    reservedPrefix: "ユーザー名を 'ext' で始めることはできません",
    reservedUsername: "このユーザー名は予約されています",
    invalidUsername: "ユーザー名が無効です",
  },
  ky: {
    usernameLabel: "Колдонуучу аты",
    updateButton: "Жаңыртуу",
    usernameChanged: "Колдонуучу аты өзгөртүлдү",
    usernameAlreadyInUse: "Колдонуучу аты мурунтан эле колдонулууда",
    usernameCurrentlyInUse: "Бул колдонуучу аты учурда колдонулууда",
    submitError: "Колдонуучу атын өзгөртүүнү жөнөтүүдө ката кетти",
    invalidCharacters:
      "Колдонуучу аты кичине латын тамгаларын, сандарды жана астын сызууларды гана камтышы мүмкүн",
    letterOrNumberRequired:
      "Колдонуучу аты кеминде бир тамга же санды камтышы керек",
    consecutiveUnderscores:
      "Колдонуучу аты катары менен эки астын сызууну камтыбашы керек",
    tooShort: "Колдонуучу аты кеминде {min} белгиден турушу керек",
    tooLong: "Колдонуучу аты {max} белгиден ашпашы керек",
    reservedPrefix: "Колдонуучу аты 'ext' менен башталбашы керек",
    reservedUsername: "Бул колдонуучу аты ээленген",
    invalidUsername: "Колдонуучу аты жараксыз",
  },
  ru: {
    usernameLabel: "Имя пользователя",
    updateButton: "Обновить",
    usernameChanged: "Имя пользователя изменено",
    usernameAlreadyInUse: "Имя пользователя уже используется",
    usernameCurrentlyInUse: "Это имя пользователя сейчас используется",
    submitError: "Ошибка при отправке запроса на изменение имени пользователя",
    invalidCharacters:
      "Имя пользователя может содержать только строчные латинские буквы, цифры и символы подчёркивания",
    letterOrNumberRequired:
      "Имя пользователя должно содержать хотя бы одну букву или цифру",
    consecutiveUnderscores:
      "Имя пользователя не должно содержать два символа подчёркивания подряд",
    tooShort: "Имя пользователя должно содержать не менее {min} символов",
    tooLong: "Имя пользователя не должно превышать {max} символов",
    reservedPrefix: "Имя пользователя не должно начинаться с 'ext'",
    reservedUsername: "Это имя пользователя зарезервировано",
    invalidUsername: "Недопустимое имя пользователя",
  },
};

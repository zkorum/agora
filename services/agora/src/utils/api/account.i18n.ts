import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface AccountApiTranslations {
  failedToCheckUsername: string;
  failedToGenerateRandomUsername: string;
}

export const accountApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  AccountApiTranslations
> = {
  en: { failedToCheckUsername: "Error while checking if the username is in use.", failedToGenerateRandomUsername: "Failed to generate random username" },
  es: { failedToCheckUsername: "Error al comprobar si el nombre de usuario está en uso.", failedToGenerateRandomUsername: "No se pudo generar un nombre de usuario aleatorio" },
  fr: { failedToCheckUsername: "Erreur lors de la vérification de la disponibilité du nom d’utilisateur.", failedToGenerateRandomUsername: "Échec de la génération d’un nom d’utilisateur aléatoire" },
  "zh-Hant": { failedToCheckUsername: "檢查使用者名稱是否被使用時發生錯誤。", failedToGenerateRandomUsername: "產生隨機使用者名稱失敗" },
  "zh-Hans": { failedToCheckUsername: "检查用户名是否被占用时出错。", failedToGenerateRandomUsername: "生成随机用户名失败" },
  ja: { failedToCheckUsername: "ユーザー名が使用中か確認中にエラーが発生しました。", failedToGenerateRandomUsername: "ランダムなユーザー名を生成できませんでした" },
  ar: { failedToCheckUsername: "حدث خطأ أثناء التحقق مما إذا كان اسم المستخدم مستخدماً.", failedToGenerateRandomUsername: "فشل إنشاء اسم مستخدم عشوائي" },
  fa: { failedToCheckUsername: "هنگام بررسی استفاده بودن نام کاربری خطایی رخ داد.", failedToGenerateRandomUsername: "ایجاد نام کاربری تصادفی ناموفق بود" },
  he: { failedToCheckUsername: "אירעה שגיאה בבדיקה אם שם המשתמש בשימוש.", failedToGenerateRandomUsername: "יצירת שם משתמש אקראי נכשלה" },
  ky: { failedToCheckUsername: "Колдонуучу аты колдонулуп жатканын текшерүүдө ката кетти.", failedToGenerateRandomUsername: "Кокус колдонуучу атын түзүү ишке ашкан жок" },
  ru: { failedToCheckUsername: "Ошибка при проверке занятости имени пользователя.", failedToGenerateRandomUsername: "Не удалось создать случайное имя пользователя" },
};

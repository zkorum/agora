import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface MuteUserApiTranslations {
  userMuted: string;
  userUnmuted: string;
  failedToMuteUser: string;
  failedToUnmuteUser: string;
  failedToFetchMutedUsers: string;
}

export const muteUserApiTranslations: Record<
  SupportedDisplayLanguageCodes,
  MuteUserApiTranslations
> = {
  en: { userMuted: "User muted", userUnmuted: "User unmuted", failedToMuteUser: "Failed to mute user", failedToUnmuteUser: "Failed to unmute user", failedToFetchMutedUsers: "Failed to fetch muted user list" },
  es: { userMuted: "Usuario silenciado", userUnmuted: "Usuario reactivado", failedToMuteUser: "No se pudo silenciar al usuario", failedToUnmuteUser: "No se pudo reactivar al usuario", failedToFetchMutedUsers: "No se pudo obtener la lista de usuarios silenciados" },
  fr: { userMuted: "Utilisateur masqué", userUnmuted: "Utilisateur rétabli", failedToMuteUser: "Échec du masquage de l’utilisateur", failedToUnmuteUser: "Échec du rétablissement de l’utilisateur", failedToFetchMutedUsers: "Échec de la récupération de la liste des utilisateurs masqués" },
  "zh-Hant": { userMuted: "使用者已靜音", userUnmuted: "使用者已取消靜音", failedToMuteUser: "靜音使用者失敗", failedToUnmuteUser: "取消靜音使用者失敗", failedToFetchMutedUsers: "取得靜音使用者列表失敗" },
  "zh-Hans": { userMuted: "用户已静音", userUnmuted: "用户已取消静音", failedToMuteUser: "静音用户失败", failedToUnmuteUser: "取消静音用户失败", failedToFetchMutedUsers: "获取静音用户列表失败" },
  ja: { userMuted: "ユーザーをミュートしました", userUnmuted: "ユーザーのミュートを解除しました", failedToMuteUser: "ユーザーをミュートできませんでした", failedToUnmuteUser: "ユーザーのミュートを解除できませんでした", failedToFetchMutedUsers: "ミュート済みユーザー一覧を取得できませんでした" },
  ar: { userMuted: "تم كتم المستخدم", userUnmuted: "تم إلغاء كتم المستخدم", failedToMuteUser: "فشل كتم المستخدم", failedToUnmuteUser: "فشل إلغاء كتم المستخدم", failedToFetchMutedUsers: "فشل جلب قائمة المستخدمين المكتومين" },
  fa: { userMuted: "کاربر بی‌صدا شد", userUnmuted: "بی‌صدا کردن کاربر لغو شد", failedToMuteUser: "بی‌صدا کردن کاربر ناموفق بود", failedToUnmuteUser: "لغو بی‌صدا کردن کاربر ناموفق بود", failedToFetchMutedUsers: "دریافت فهرست کاربران بی‌صدا ناموفق بود" },
  he: { userMuted: "המשתמש הושתק", userUnmuted: "השתקת המשתמש בוטלה", failedToMuteUser: "השתקת המשתמש נכשלה", failedToUnmuteUser: "ביטול השתקת המשתמש נכשל", failedToFetchMutedUsers: "טעינת רשימת המשתמשים המושתקים נכשלה" },
  ky: { userMuted: "Колдонуучу үнсүз кылынды", userUnmuted: "Колдонуучунун үнсүз абалы алынды", failedToMuteUser: "Колдонуучуну үнсүз кылуу ишке ашкан жок", failedToUnmuteUser: "Колдонуучунун үнсүз абалын алуу ишке ашкан жок", failedToFetchMutedUsers: "Үнсүз колдонуучулар тизмесин алуу ишке ашкан жок" },
  ru: { userMuted: "Пользователь скрыт", userUnmuted: "Пользователь больше не скрыт", failedToMuteUser: "Не удалось скрыть пользователя", failedToUnmuteUser: "Не удалось показать пользователя", failedToFetchMutedUsers: "Не удалось получить список скрытых пользователей" },
};

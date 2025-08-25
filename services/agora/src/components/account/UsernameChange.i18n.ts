export interface UsernameChangeTranslations {
  usernameLabel: string;
  updateButton: string;
  usernameChanged: string;
  usernameAlreadyInUse: string;
  usernameCurrentlyInUse: string;
  submitError: string;
  [key: string]: string;
}

export const usernameChangeTranslations: Record<
  string,
  UsernameChangeTranslations
> = {
  en: {
    usernameLabel: "Username",
    updateButton: "Update",
    usernameChanged: "Username changed",
    usernameAlreadyInUse: "Username is already in use",
    usernameCurrentlyInUse: "This username is currently in use",
    submitError: "Error while trying to submit username change",
  },
  es: {
    usernameLabel: "Nombre de usuario",
    updateButton: "Actualizar",
    usernameChanged: "Nombre de usuario cambiado",
    usernameAlreadyInUse: "El nombre de usuario ya está en uso",
    usernameCurrentlyInUse: "Este nombre de usuario está actualmente en uso",
    submitError: "Error al intentar enviar el cambio de nombre de usuario",
  },
  fr: {
    usernameLabel: "Nom d'utilisateur",
    updateButton: "Mettre à jour",
    usernameChanged: "Nom d'utilisateur modifié",
    usernameAlreadyInUse: "Le nom d'utilisateur est déjà utilisé",
    usernameCurrentlyInUse: "Ce nom d'utilisateur est actuellement utilisé",
    submitError:
      "Erreur lors de la tentative de soumission du changement de nom d'utilisateur",
  },
  "zh-CN": {
    usernameLabel: "用户名",
    updateButton: "更新",
    usernameChanged: "用户名已更改",
    usernameAlreadyInUse: "用户名已被使用",
    usernameCurrentlyInUse: "此用户名当前已被使用",
    submitError: "尝试提交用户名更改时出错",
  },
  "zh-TW": {
    usernameLabel: "用戶名",
    updateButton: "更新",
    usernameChanged: "用戶名已更改",
    usernameAlreadyInUse: "用戶名已被使用",
    usernameCurrentlyInUse: "此用戶名當前已被使用",
    submitError: "嘗試提交用戶名更改時出錯",
  },
  ja: {
    usernameLabel: "ユーザー名",
    updateButton: "更新",
    usernameChanged: "ユーザー名が変更されました",
    usernameAlreadyInUse: "ユーザー名はすでに使用されています",
    usernameCurrentlyInUse: "このユーザー名は現在使用されています",
    submitError: "ユーザー名の変更を送信する際にエラーが発生しました",
  },
};

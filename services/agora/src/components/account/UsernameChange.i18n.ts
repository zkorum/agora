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
};

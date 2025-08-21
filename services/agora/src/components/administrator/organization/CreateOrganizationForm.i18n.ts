export interface CreateOrganizationFormTranslations {
  nameLabel: string;
  descriptionLabel: string;
  imagePathLabel: string;
  fileNameExample: string;
  fullPathExample: string;
  websiteUrlLabel: string;
  addOrganizationButton: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const createOrganizationFormTranslations: Record<
  string,
  CreateOrganizationFormTranslations
> = {
  en: {
    nameLabel: "Name",
    descriptionLabel: "Description",
    imagePathLabel: "Image Path (file name or https path)",
    fileNameExample: "File name: avatar_default_0.png",
    fullPathExample:
      "Full path: https://agoracitizen.network/images/big_logo_agora.png",
    websiteUrlLabel: "Website URL",
    addOrganizationButton: "Add Organization",
  },
  es: {
    nameLabel: "Nombre",
    descriptionLabel: "Descripción",
    imagePathLabel: "Ruta de imagen (nombre de archivo o ruta https)",
    fileNameExample: "Nombre de archivo: avatar_default_0.png",
    fullPathExample:
      "Ruta completa: https://agoracitizen.network/images/big_logo_agora.png",
    websiteUrlLabel: "URL del sitio web",
    addOrganizationButton: "Agregar Organización",
  },
  fr: {
    nameLabel: "Nom",
    descriptionLabel: "Description",
    imagePathLabel: "Chemin d'image (nom de fichier ou chemin https)",
    fileNameExample: "Nom de fichier : avatar_default_0.png",
    fullPathExample:
      "Chemin complet : https://agoracitizen.network/images/big_logo_agora.png",
    websiteUrlLabel: "URL du site web",
    addOrganizationButton: "Ajouter une Organisation",
  },
};

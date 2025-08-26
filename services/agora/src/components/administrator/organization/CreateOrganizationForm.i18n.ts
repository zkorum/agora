export interface CreateOrganizationFormTranslations {
  nameLabel: string;
  descriptionLabel: string;
  imagePathLabel: string;
  fileNameExample: string;
  fullPathExample: string;
  websiteUrlLabel: string;
  addOrganizationButton: string;
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
  "zh-CN": {
    nameLabel: "名称",
    descriptionLabel: "描述",
    imagePathLabel: "图片路径（文件名或 https 路径）",
    fileNameExample: "文件名：avatar_default_0.png",
    fullPathExample:
      "完整路径：https://agoracitizen.network/images/big_logo_agora.png",
    websiteUrlLabel: "网站网址",
    addOrganizationButton: "添加组织",
  },
  "zh-TW": {
    nameLabel: "名稱",
    descriptionLabel: "描述",
    imagePathLabel: "圖片路徑（檔案名稱或 https 路徑）",
    fileNameExample: "檔案名稱：avatar_default_0.png",
    fullPathExample:
      "完整路徑：https://agoracitizen.network/images/big_logo_agora.png",
    websiteUrlLabel: "網站網址",
    addOrganizationButton: "新增組織",
  },
  ja: {
    nameLabel: "名前",
    descriptionLabel: "説明",
    imagePathLabel: "画像パス（ファイル名または https パス）",
    fileNameExample: "ファイル名：avatar_default_0.png",
    fullPathExample:
      "完全パス：https://agoracitizen.network/images/big_logo_agora.png",
    websiteUrlLabel: "ウェブサイトURL",
    addOrganizationButton: "組織を追加",
  },
};

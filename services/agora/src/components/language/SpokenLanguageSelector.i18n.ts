import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SpokenLanguageSelectorTranslations {
  selectedLanguages: string;
  addMoreLanguages: string;
  selectLanguages: string;
  searchLanguages: string;
  noLanguagesFound: string;
  allLanguagesSelected: string;
  cannotRemoveLastLanguage: string;
  failedToSaveLanguages: string;
  failedToLoadLanguages: string;
}

export const spokenLanguageSelectorTranslations: Record<
  SupportedDisplayLanguageCodes,
  SpokenLanguageSelectorTranslations
> = {
  en: {
    selectedLanguages: "Selected Languages",
    addMoreLanguages: "Add More Languages",
    selectLanguages: "Select Languages",
    searchLanguages: "Search languages...",
    noLanguagesFound: "No languages found",
    allLanguagesSelected: "All languages selected",
    cannotRemoveLastLanguage: "You must have at least one language selected",
    failedToSaveLanguages: "Failed to save language preferences",
    failedToLoadLanguages: "Failed to load language preferences",
  },
  es: {
    selectedLanguages: "Idiomas seleccionados",
    addMoreLanguages: "Agregar más idiomas",
    selectLanguages: "Seleccionar idiomas",
    searchLanguages: "Buscar idiomas...",
    noLanguagesFound: "No se encontraron idiomas",
    allLanguagesSelected: "Todos los idiomas seleccionados",
    cannotRemoveLastLanguage: "Debe tener al menos un idioma seleccionado",
    failedToSaveLanguages: "Error al guardar las preferencias de idioma",
    failedToLoadLanguages: "Error al cargar las preferencias de idioma",
  },
  fr: {
    selectedLanguages: "Langues sélectionnées",
    addMoreLanguages: "Ajouter plus de langues",
    selectLanguages: "Sélectionner des langues",
    searchLanguages: "Rechercher des langues...",
    noLanguagesFound: "Aucune langue trouvée",
    allLanguagesSelected: "Toutes les langues sélectionnées",
    cannotRemoveLastLanguage:
      "Vous devez avoir au moins une langue sélectionnée",
    failedToSaveLanguages:
      "Échec de la sauvegarde des préférences linguistiques",
    failedToLoadLanguages: "Échec du chargement des préférences linguistiques",
  },
  "zh-Hans": {
    selectedLanguages: "已选择的语言",
    addMoreLanguages: "添加更多语言",
    selectLanguages: "选择语言",
    searchLanguages: "搜索语言...",
    noLanguagesFound: "未找到语言",
    allLanguagesSelected: "所有语言已选择",
    cannotRemoveLastLanguage: "您必须至少选择一种语言",
    failedToSaveLanguages: "保存语言偏好设置失败",
    failedToLoadLanguages: "加载语言偏好设置失败",
  },
  "zh-Hant": {
    selectedLanguages: "已選擇的語言",
    addMoreLanguages: "新增更多語言",
    selectLanguages: "選擇語言",
    searchLanguages: "搜尋語言...",
    noLanguagesFound: "未找到語言",
    allLanguagesSelected: "所有語言已選擇",
    cannotRemoveLastLanguage: "您必須至少選擇一種語言",
    failedToSaveLanguages: "儲存語言偏好設定失敗",
    failedToLoadLanguages: "載入語言偏好設定失敗",
  },
  ja: {
    selectedLanguages: "選択された言語",
    addMoreLanguages: "さらに言語を追加",
    selectLanguages: "言語を選択",
    searchLanguages: "言語を検索...",
    noLanguagesFound: "言語が見つかりません",
    allLanguagesSelected: "すべての言語が選択されています",
    cannotRemoveLastLanguage: "少なくとも1つの言語を選択する必要があります",
    failedToSaveLanguages: "言語設定の保存に失敗しました",
    failedToLoadLanguages: "言語設定の読み込みに失敗しました",
  },
};

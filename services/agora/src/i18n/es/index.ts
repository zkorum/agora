// Spanish translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  navigation: {
    sideDrawer: {
      home: "Hogar",
      explore: "Explorar",
      dings: "Notificaciones",
      profile: "Perfil",
      settings: "Configuración",
    },
  },
  settings: {
    language: {
      title: "Idioma",
      displayLanguage: {
        title: "Idioma de visualización",
      },
      spokenLanguages: {
        title: "Idiomas hablados",
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
    },
  },
};

export default translations;

// English translations

export default {
  navigation: {
    sideDrawer: {
      home: "Home",
      explore: "Explore",
      dings: "Dings",
      profile: "Profile",
      settings: "Settings",
    },
  },
  help: "Help",
  welcome: {
    login: "Login",
  },
  boot: {
    capacitorStorage: {
      title: "Fatal error",
      message:
        "A fatal error occured while setting up secure storage. Try updating the app, or try again later. An error log has been sent to our server, we are onto it! We apologize for the inconvenience.",
      ok: "Close app",
    },
  },
  onboarding: {
    login: {
      title: "What is your email address?",
      email: {
        label: "Email Address",
        hint: "Such as xxx{'@'}gmail.com", // to avoid Message compilation error: Unexpected empty linked key:  https://github.com/intlify/bundle-tools/issues/53#issuecomment-1879024073
        invalid: "Not a valid email address",
        unauthorized: "Please provide a valid email address",
      },
    },
    language: {
      title: "What language do you speak?",
      subtitle: "Select your display language",
      displayLanguage: "Display language",
      spokenLanguages: "Spoken languages",
      addLanguage: "Add language",
      selectLanguages: "Select languages",
      saveAndClose: "Save & Close",
      atLeastOne: "You must select at least one spoken language",
    },
  },
  settings: {
    language: {
      title: "Language",
      displayLanguage: "Display language",
      spokenLanguages: "Spoken languages",
      changeDisplayLanguage: "Change display language",
      manageSpokenLanguages: "Manage spoken languages",
    },
  },
  languages: {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    nl: "Dutch",
    ru: "Russian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
    hi: "Hindi",
    bn: "Bengali",
    pa: "Punjabi",
    tr: "Turkish",
    vi: "Vietnamese",
    pl: "Polish",
    uk: "Ukrainian",
    ro: "Romanian",
    el: "Greek",
    he: "Hebrew",
    sv: "Swedish",
    no: "Norwegian",
    da: "Danish",
    fi: "Finnish",
    cs: "Czech",
    hu: "Hungarian",
    th: "Thai",
    id: "Indonesian",
    ms: "Malay",
  },
  capacitorStore: {
    secureLockScreenError: {
      title: "Secure storage error",
      message:
        "Agora requires you to enable a secure lock screen (PIN code, password, biometrics - not swipe)",
      ok: "Close app",
    },
    fatalError: {
      title: "Secure storage error",
      message: "Fatal error while trying to access secure storage",
      ok: "Close app",
    },
  },
};

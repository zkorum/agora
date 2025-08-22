import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface PassportOnboardingTranslations {
  pageTitle: string;
  description: string;
  download: string;
  claimAnonymousId: string;
  comeBackAndVerify: string;
  scanQrCode: string;
  failedToGenerateLink: string;
  loadingVerificationLink: string;
  openLinkOnMobile: string;
  copy: string;
  waitingForVerification: string;
  verify: string;
  preferPhoneVerification: string;
  verificationSuccessful: string;
  verificationFailed: string;
  passportAlreadyLinked: string;
  unexpectedError: string;
  syncHiccup: string;
}

export const passportOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  PassportOnboardingTranslations
> = {
  en: {
    pageTitle: "Own Your Privacy",
    description:
      "RariMe is a ZK-powered identity wallet that converts your passport into an anonymous digital ID, stored on your device, so you can prove that you're a unique human without sharing any personal data with anyone.",
    download: "Download",
    claimAnonymousId: "Claim your anonymous ID",
    comeBackAndVerify: "Come back here and click Verify",
    scanQrCode: "Scan the QR code with RariMe to verify your identity",
    failedToGenerateLink: "Failed to generate verification link",
    loadingVerificationLink: "Loading verification link",
    openLinkOnMobile: "Or open the below link on your mobile browser:",
    copy: "Copy",
    waitingForVerification: "Waiting for verification...",
    verify: "Verify",
    preferPhoneVerification: "I'd rather verify with my phone number",
    verificationSuccessful: "Verification successful 🎉",
    verificationFailed: "Verification attempt failed. Please retry.",
    passportAlreadyLinked:
      "This passport is already linked to another RariMe account. Please try a different one.",
    unexpectedError: "Oops! Unexpected error—try refreshing the page",
    syncHiccup:
      "Oops! Sync hiccup detected. We've refreshed your QR code—try scanning it again!",
  },
  es: {
    pageTitle: "Protege tu Privacidad",
    description:
      "RariMe es una billetera de identidad con tecnología ZK que convierte tu pasaporte en una ID digital anónima, almacenada en tu dispositivo, para que puedas demostrar que eres un humano único sin compartir datos personales con nadie.",
    download: "Descargar",
    claimAnonymousId: "Reclama tu ID anónima",
    comeBackAndVerify: "Regresa aquí y haz clic en Verificar",
    scanQrCode: "Escanea el código QR con RariMe para verificar tu identidad",
    failedToGenerateLink: "Error al generar el enlace de verificación",
    loadingVerificationLink: "Cargando enlace de verificación",
    openLinkOnMobile: "O abre el siguiente enlace en tu navegador móvil:",
    copy: "Copiar",
    waitingForVerification: "Esperando verificación...",
    verify: "Verificar",
    preferPhoneVerification: "Prefiero verificar con mi número de teléfono",
    verificationSuccessful: "Verificación exitosa 🎉",
    verificationFailed:
      "El intento de verificación falló. Por favor inténtalo de nuevo.",
    passportAlreadyLinked:
      "Este pasaporte ya está vinculado a otra cuenta de RariMe. Por favor intenta con uno diferente.",
    unexpectedError: "¡Ups! Error inesperado—intenta refrescar la página",
    syncHiccup:
      "¡Ups! Detectamos un problema de sincronización. Hemos actualizado tu código QR—¡intenta escanearlo de nuevo!",
  },
  fr: {
    pageTitle: "Maîtrisez votre Confidentialité",
    description:
      "RariMe est un portefeuille d'identité alimenté par ZK qui convertit votre passeport en ID numérique anonyme, stockée sur votre appareil, pour que vous puissiez prouver que vous êtes un humain unique sans partager de données personnelles avec quiconque.",
    download: "Télécharger",
    claimAnonymousId: "Réclamez votre ID anonyme",
    comeBackAndVerify: "Revenez ici et cliquez sur Vérifier",
    scanQrCode: "Scannez le code QR avec RariMe pour vérifier votre identité",
    failedToGenerateLink: "Échec de la génération du lien de vérification",
    loadingVerificationLink: "Chargement du lien de vérification",
    openLinkOnMobile:
      "Ou ouvrez le lien ci-dessous dans votre navigateur mobile :",
    copy: "Copier",
    waitingForVerification: "En attente de vérification...",
    verify: "Vérifier",
    preferPhoneVerification: "Je préfère vérifier avec mon numéro de téléphone",
    verificationSuccessful: "Vérification réussie 🎉",
    verificationFailed:
      "La tentative de vérification a échoué. Veuillez réessayer.",
    passportAlreadyLinked:
      "Ce passeport est déjà lié à un autre compte RariMe. Veuillez en essayer un différent.",
    unexpectedError: "Oups ! Erreur inattendue—essayez de rafraîchir la page",
    syncHiccup:
      "Oups ! Problème de synchronisation détecté. Nous avons actualisé votre code QR—essayez de le scanner à nouveau !",
  },
};

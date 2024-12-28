import {
  AndroidBiometryStrength,
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
} from "@aparajita/capacitor-biometric-auth";
import { Dialog } from "quasar";
import { i18n } from "boot/i18n";
import { App } from "@capacitor/app";

export async function nativeAuthenticate() {
  const info = await BiometricAuth.checkBiometry();
  if (info.isAvailable) {
    try {
      await BiometricAuth.authenticate({
        reason: "Please authenticate",
        cancelTitle: "Cancel",
        allowDeviceCredential: true,
        iosFallbackTitle: "Use passcode",
        androidTitle: "Biometric login",
        androidSubtitle: "Log in using biometric authentication",
        androidConfirmationRequired: false,
        androidBiometryStrength: AndroidBiometryStrength.weak,
      });
    } catch (error) {
      // error is always an instance of BiometryError.
      if (error instanceof BiometryError) {
        if (error.code === BiometryErrorType.userCancel) {
          await nativeAuthenticate();
        } else {
          console.error(
            "Biometrics error occured authenticate, fatal error",
            error
          );
          Dialog.create({
            title: i18n.global.t("Fatal error"),
            message: i18n.global.t(
              `Biometrics authentication failed: ${error.code} - ${error.message}`
            ),
            ok: i18n.global.t("Exit app"),
          }).onOk(async () => {
            await App.exitApp();
          });
        }
      } else {
        throw error;
      }
    }
  } else {
    throw new Error(
      "Secure storage is not available, so user cannot be authenticated"
    );
  }
}

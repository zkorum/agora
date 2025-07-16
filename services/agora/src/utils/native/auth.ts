import {
  AndroidBiometryStrength,
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
} from "@aparajita/capacitor-biometric-auth";
import { Dialog } from "quasar";
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
            title: "Fatal error",
            message: `Biometrics authentication failed: ${error.code} - ${error.message}`,
            ok: "Exit app",
          }).onOk(() => {
            void App.exitApp();
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

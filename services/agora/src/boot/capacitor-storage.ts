import { defineBoot } from "#q-app/wrappers";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { Dialog } from "quasar";
import { i18n } from "boot/i18n";
import { App } from "@capacitor/app";

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default defineBoot(async (/* { app } */) => {
  try {
    await SecureStorage.setKeyPrefix("com.zkorum.agora/v1");
    // await nativeAuthenticate();
  } catch (e) {
    console.error(
      "Error while setting up secure storage key prefix and authenticating",
      e
    );
    Dialog.create({
      title: i18n.global.t("boot.capacitorStorage.title"),
      message: i18n.global.t("boot.capacitorStorage.message"),
      ok: i18n.global.t("boot.capacitorStorage.ok"),
    }).onOk(async () => {
      await App.exitApp();
    });
  }
});

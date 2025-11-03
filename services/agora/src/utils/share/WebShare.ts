import { useShare } from "@vueuse/core";
import { useClipboard } from "@vueuse/core";
import { useDialog } from "../ui/dialog";
import { useNotify } from "../ui/notify";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  webShareTranslations,
  type WebShareTranslations,
} from "./WebShare.i18n";

export function useWebShare() {
  const webShare = useShare();
  const clipBoard = useClipboard();
  const dialog = useDialog();
  const notify = useNotify();
  const { t } = useComponentI18n<WebShareTranslations>(webShareTranslations);

  function isSupportedSharePlatform() {
    if (webShare.isSupported) {
      return true;
    } else {
      console.log("Not a supported web share platform");
      return false;
    }
  }

  async function share(title: string, url: string) {
    if (isSupportedSharePlatform()) {
      await webShare.share({
        title: title,
        text: "",
        url: url,
      });
    } else {
      if (clipBoard.isSupported) {
        await clipBoard.copy(url);
        notify.showNotifyMessage(t("copiedToClipboard"));
      } else {
        console.log("Clipboard is not supported");
        dialog.showMessage("Share Link", url);
      }
    }
  }

  return { share };
}

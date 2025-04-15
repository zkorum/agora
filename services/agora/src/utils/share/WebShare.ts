import { useShare } from "@vueuse/core";
import { Platform } from "quasar";
import { useClipboard } from "@vueuse/core";
import { useDialog } from "../ui/dialog";
import { useNotify } from "../ui/notify";

export function useWebShare() {
  const webShare = useShare();
  const clipBoard = useClipboard();
  const dialog = useDialog();
  const notify = useNotify();

  function isSupportedSharePlatform() {
    // Ignore desktop browsers
    if (webShare.isSupported && Platform.is.mobile) {
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
        notify.showNotifyMessage("Copied link to clipboard");
      } else {
        console.log("Clipboard is not supported");
        dialog.showMessage("Share Link", url);
      }
    }
  }

  return { share };
}

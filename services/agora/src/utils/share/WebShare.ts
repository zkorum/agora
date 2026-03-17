import { useShare } from "@vueuse/core";
import { useClipboard } from "@vueuse/core";

import { useDialog } from "../ui/dialog";
import { useNotify } from "../ui/notify";

export function useWebShare() {
  const webShare = useShare();
  const clipBoard = useClipboard();
  const dialog = useDialog();
  const notify = useNotify();

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
        notify.showCopiedToClipboard();
      } else {
        console.log("Clipboard is not supported");
        dialog.showMessage("Share Link", url);
      }
    }
  }

  return { share };
}

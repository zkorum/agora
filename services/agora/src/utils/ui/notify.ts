import { useQuasar } from "quasar";
import { isNetworkOffline } from "src/composables/useNetworkStatus";

interface NotifyOptions {
  message: string;
  caption?: string;
  icon?: string;
  showSpinner?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  force?: boolean;
  group?: string | false;
}

interface PersistentNotifyOptions extends NotifyOptions {
  onDismiss?: () => void;
}

export const useNotify = () => {
  const quasar = useQuasar();

  function showNotifyMessage(
    messageOrOptions: string | NotifyOptions,
  ): (() => void) | undefined {
    const options =
      typeof messageOrOptions === "string"
        ? { message: messageOrOptions }
        : messageOrOptions;

    if (!options.force && isNetworkOffline.value) {
      return undefined;
    }

    const dismiss = quasar.notify({
      message: options.message,
      caption: options.caption,
      position: "bottom-right",
      color: "white",
      textColor: "primary",
      classes: "zk-toast-alert",
      spinner: options.showSpinner === true ? true : undefined,
      icon: options.icon,
      group: options.group ?? false,
      actions: options.actionLabel
        ? [
            {
              label: options.actionLabel,
              flat: true,
              noCaps: true,
              dense: true,
              color: "primary",
              handler: () => options.onAction?.(),
            },
          ]
        : undefined,
    });
    return dismiss;
  }

  function showPersistentNotifyMessage({
    message,
    caption,
    icon,
    showSpinner,
    actionLabel,
    onAction,
    onDismiss,
    group,
  }: PersistentNotifyOptions): () => void {
    const dismiss = quasar.notify({
      message,
      caption,
      timeout: 0,
      group: group ?? false,
      position: "bottom-right",
      color: "white",
      textColor: "primary",
      classes: "zk-toast-alert",
      spinner: showSpinner === true ? true : undefined,
      icon: icon,
      actions: actionLabel
        ? [
            {
              label: actionLabel,
              flat: true,
              noCaps: true,
              dense: true,
              color: "primary",
              handler: () => onAction?.(),
            },
          ]
        : undefined,
      onDismiss: onDismiss,
    });
    return dismiss;
  }

  return { showNotifyMessage, showPersistentNotifyMessage };
};

import { useQuasar } from "quasar";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { isNetworkOffline } from "src/composables/useNetworkStatus";

import {
  type NotifyTranslations,
  notifyTranslations,
} from "./notify.i18n";

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

const MOBILE_BREAKPOINT = 1000;

export const useNotify = () => {
  const quasar = useQuasar();

  function getPosition(): "bottom-left" | "bottom-right" {
    return quasar.screen.width <= MOBILE_BREAKPOINT ? "bottom-left" : "bottom-right";
  }

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
      position: getPosition(),
      color: "white",
      textColor: "primary",
      classes: "zk-toast-alert",
      spinner: options.showSpinner === true ? true : undefined,
      icon: options.icon,
      group: options.group ?? true,
      badgeColor: "white",
      badgeTextColor: "primary",
      badgeClass: "zk-toast-badge",
      badgeStyle: {
        top: "50%",
        marginTop: "-13px",
        marginLeft: "-15px",
      },
      actions: [
        ...(options.actionLabel
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
          : []),
        { icon: "mdi-close", flat: true, round: true, dense: true, size: "sm", color: "grey-7" },
      ],
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
      position: getPosition(),
      color: "white",
      textColor: "primary",
      classes: "zk-toast-alert",
      spinner: showSpinner === true ? true : undefined,
      icon: icon,
      actions: [
        ...(actionLabel
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
          : []),
        { icon: "mdi-close", flat: true, round: true, dense: true, size: "sm", color: "grey-7" },
      ],
      onDismiss: onDismiss,
    });
    return dismiss;
  }

  const { t } = useComponentI18n<NotifyTranslations>(notifyTranslations);

  function showCopiedToClipboard(): (() => void) | undefined {
    return showNotifyMessage({
      message: t("copiedToClipboard"),
      icon: "mdi-check-circle-outline",
    });
  }

  return { showNotifyMessage, showPersistentNotifyMessage, showCopiedToClipboard };
};

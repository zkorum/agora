/**
 * Share action definitions for the share menu system
 * Provides actions for sharing content via different methods
 */

import type { ContentAction, ContentActionContext } from "../core/types";

export interface ShareActionTranslations {
  copyLink: string;
  showQrCode: string;
  shareVia: string;
}

export interface ShareActionCallbacks {
  copyLinkCallback: () => void | Promise<void>;
  openQrCodeCallback?: () => void | Promise<void>;
}

function isWebShareAvailable(): boolean {
  return typeof navigator !== "undefined" && navigator.share !== undefined;
}

/**
 * Get all share actions with their configurations
 */
export function getShareActions({
  copyLinkCallback,
  openQrCodeCallback,
  showShareVia,
  shareUrl,
  shareTitle,
  translations,
}: {
  copyLinkCallback: () => void | Promise<void>;
  openQrCodeCallback?: () => void | Promise<void>;
  showShareVia: boolean;
  shareUrl: string;
  shareTitle: string;
  translations: ShareActionTranslations;
}): ContentAction[] {
  const actions: ContentAction[] = [
    {
      id: "copyLink",
      label: translations.copyLink,
      icon: "mdi-content-copy",
      variant: "default",
      handler: copyLinkCallback,
      isVisible: () => true,
    },
  ];

  if (openQrCodeCallback) {
    actions.push({
      id: "showQrCode",
      label: translations.showQrCode,
      icon: "mdi-qrcode",
      variant: "default",
      handler: openQrCodeCallback,
      isVisible: () => true,
    });
  }

  if (showShareVia && isWebShareAvailable()) {
    actions.push({
      id: "shareVia",
      label: translations.shareVia,
      icon: "mdi-share-variant",
      variant: "default",
      handler: async () => {
        await navigator.share({
          title: shareTitle,
          url: shareUrl,
        });
      },
      isVisible: () => true,
    });
  }

  return actions;
}

/**
 * Get available share actions filtered by visibility rules
 */
export function getAvailableShareActions({
  context,
  copyLinkCallback,
  openQrCodeCallback,
  showShareVia,
  shareUrl,
  shareTitle,
  translations,
}: {
  context: ContentActionContext;
  copyLinkCallback: () => void | Promise<void>;
  openQrCodeCallback?: () => void | Promise<void>;
  showShareVia: boolean;
  shareUrl: string;
  shareTitle: string;
  translations: ShareActionTranslations;
}): ContentAction[] {
  const allActions = getShareActions({
    copyLinkCallback,
    openQrCodeCallback,
    showShareVia,
    shareUrl,
    shareTitle,
    translations,
  });

  return allActions.filter((action) => action.isVisible(context));
}

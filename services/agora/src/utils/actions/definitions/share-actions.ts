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
  openQrCodeCallback: () => void | Promise<void>;
  shareViaCallback: () => void | Promise<void>;
}

/**
 * Get all share actions with their configurations
 */
export function getShareActions({
  copyLinkCallback,
  openQrCodeCallback,
  shareViaCallback,
  translations,
  isWebShareAvailable,
}: {
  copyLinkCallback: () => void | Promise<void>;
  openQrCodeCallback: () => void | Promise<void>;
  shareViaCallback: () => void | Promise<void>;
  translations: ShareActionTranslations;
  isWebShareAvailable: boolean;
}): ContentAction[] {
  return [
    {
      id: "copyLink",
      label: translations.copyLink,
      icon: "mdi-content-copy",
      variant: "default",
      handler: copyLinkCallback,
      isVisible: () => true, // Always show copy link
    },
    {
      id: "showQrCode",
      label: translations.showQrCode,
      icon: "mdi-qrcode",
      variant: "default",
      handler: openQrCodeCallback,
      isVisible: () => true, // Always show QR code option
    },
    {
      id: "shareVia",
      label: translations.shareVia,
      icon: "mdi-share-variant",
      variant: "default",
      handler: shareViaCallback,
      isVisible: () => isWebShareAvailable, // Only show if Web Share API is available
    },
  ];
}

/**
 * Get available share actions filtered by visibility rules
 */
export function getAvailableShareActions({
  context,
  copyLinkCallback,
  openQrCodeCallback,
  shareViaCallback,
  translations,
  isWebShareAvailable,
}: {
  context: ContentActionContext;
  copyLinkCallback: () => void | Promise<void>;
  openQrCodeCallback: () => void | Promise<void>;
  shareViaCallback: () => void | Promise<void>;
  translations: ShareActionTranslations;
  isWebShareAvailable: boolean;
}): ContentAction[] {
  const allActions = getShareActions({
    copyLinkCallback,
    openQrCodeCallback,
    shareViaCallback,
    translations,
    isWebShareAvailable,
  });

  return allActions.filter((action) => action.isVisible(context));
}

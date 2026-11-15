import type { Button, Dialog, ToggleGroup } from "bits-ui";
import type { Snippet } from "svelte";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "soft"
  | "outline"
  | "ghost"
  | "solid"
  | "neutral"
  | "quiet"
  | "danger"
  | "unstyled";
export type ButtonSize = "sm" | "md" | "lg" | "block" | "control" | "icon";

interface ButtonPresentationProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: Button.RootProps["disabled"];
  class?: Button.RootProps["class"];
  children: Snippet;
  ref?: Button.RootProps["ref"];
  trailingIcon?: string;
}

type AnchorRootProps = Extract<Button.RootProps, { href: unknown }>;
type NativeRootProps = Exclude<Button.RootProps, AnchorRootProps>;

export type ButtonAnchorProps = ButtonPresentationProps &
  Omit<AnchorRootProps, keyof ButtonPresentationProps | "href"> & {
    href: NonNullable<AnchorRootProps["href"]>;
  };

export type ButtonNativeProps = ButtonPresentationProps &
  Omit<NativeRootProps, keyof ButtonPresentationProps> & {
    target?: undefined;
    rel?: undefined;
  };

export type ButtonProps = ButtonNativeProps | ButtonAnchorProps;

export type IconName = keyof typeof iconClasses;

export const iconClasses = {
  plus: "icon-[lucide--plus]",
  close: "icon-[lucide--x]",
  menu: "icon-[lucide--menu]",
  panel: "icon-[lucide--panel-left-close]",
  folder: "icon-[lucide--folder]",
  history: "icon-[lucide--history]",
  explore: "icon-[lucide--map]",
  bell: "icon-[lucide--bell]",
  search: "icon-[lucide--search]",
  grid: "icon-[lucide--layout-grid]",
  list: "icon-[lucide--list]",
  people: "icon-[lucide--users]",
  message: "icon-[lucide--message-square]",
  polis: "icon-[lucide--messages-square]",
  gathering: "icon-[lucide--notebook-pen]",
  prioritizing: "icon-[lucide--chart-no-axes-column-increasing]",
  more: "icon-[lucide--ellipsis-vertical]",
  link: "icon-[lucide--link]",
  settings: "icon-[lucide--sliders-horizontal]",
  eye: "icon-[lucide--eye]",
  globe: "icon-[lucide--globe]",
  back: "icon-[lucide--arrow-left]",
  forward: "icon-[lucide--arrow-right]",
  chevron: "icon-[lucide--chevron-down]",
  check: "icon-[lucide--check]",
  shield: "icon-[lucide--shield-check]",
  mail: "icon-[lucide--mail]",
  sparkles: "icon-[lucide--sparkles]",
  building: "icon-[lucide--building-2]",
  minus: "icon-[lucide--minus]",
  thumbsUp: "icon-[lucide--thumbs-up]",
  thumbsDown: "icon-[lucide--thumbs-down]",
};

export interface SelectItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface CollectionToolbarProps {
  label: string;
  query?: string;
  layout: "grid" | "list";
  onlayoutchange: (layout: "grid" | "list") => void;
}

export interface DialogProps {
  title: string;
  description: string;
  open?: boolean;
  children: Snippet;
  footer?: Snippet;
  wide?: boolean;
  dir?: "ltr" | "rtl";
  rootProps?: Omit<Dialog.RootProps, "children" | "open">;
  contentProps?: Omit<Dialog.ContentProps, "children" | "ref" | "dir">;
  contentRef?: Dialog.ContentProps["ref"];
}

export interface MobileNavDrawerProps {
  open?: boolean;
  links?: { label: string; href: string }[];
  onNavigate?: () => void;
  action?: Snippet;
  children?: Snippet;
  navigation?: Snippet;
  appearance?: "default" | "sidebar";
  title?: string;
  closeLabel?: string;
  dir?: "ltr" | "rtl";
  rootProps?: Omit<Dialog.RootProps, "children" | "open">;
  contentProps?: Omit<Dialog.ContentProps, "children" | "ref" | "dir">;
  contentRef?: Dialog.ContentProps["ref"];
}

export interface SegmentedControlProps {
  label: string;
  items: readonly SegmentedControlItem[];
  value: string;
  onchange: (value: string) => void;
  appearance?: "pill" | "underline" | "unstyled";
  itemContent?: Snippet<[SegmentedControlItem]>;
  disabled?: boolean;
  rootProps?: Omit<
    Extract<ToggleGroup.RootProps, { type: "single" }>,
    "type" | "value" | "children" | "disabled" | "ref" | "onValueChange"
  >;
  ref?: ToggleGroup.RootProps["ref"];
}

export interface SegmentedControlItem {
  value: string;
  label: string;
  count?: string;
}

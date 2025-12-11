import type { RouteNamedMap } from "vue-router/auto-routes";

export interface SettingsNavigationItem {
  type: "navigation";
  label: string;
  to: keyof RouteNamedMap;
  style?: "none" | "warning" | "negative";
  value?: string;
  key?: string;
}

export interface SettingsActionItem {
  type: "action";
  label: string;
  action: () => void;
  style?: "none" | "warning" | "negative";
  value?: string;
  key?: string;
}

export type SettingsInterface = SettingsNavigationItem | SettingsActionItem;

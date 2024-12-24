export interface SettingsInterface {
  icon: string;
  label: string;
  action: () => void;
  style: "none" | "warning" | "negative";
}

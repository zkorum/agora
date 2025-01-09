export interface SettingsInterface {
  label: string;
  action: () => void;
  style: "none" | "warning" | "negative";
}

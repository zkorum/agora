export interface SettingsInterface {
  label: string;
  action: () => void;
  style: "none" | "warning" | "negative";
  value?: string; // Optional current value to display
}

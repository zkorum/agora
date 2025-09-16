// Navigation Icons - Centralized SVG string imports for navigation components

// Import SVG icons as raw strings
import HomeStandardIcon from "src/assets/icons/navigation/home-standard.svg?raw";
import HomeFilledIcon from "src/assets/icons/navigation/home-filled.svg?raw";
import ExploreStandardIcon from "src/assets/icons/navigation/explore-standard.svg?raw";
import ExploreFilledIcon from "src/assets/icons/navigation/explore-filled.svg?raw";
import NotificationStandardIcon from "src/assets/icons/navigation/notification-standard.svg?raw";
import NotificationFilledIcon from "src/assets/icons/navigation/notification-filled.svg?raw";
import ProfileStandardIcon from "src/assets/icons/navigation/profile-standard.svg?raw";
import ProfileFilledIcon from "src/assets/icons/navigation/profile-filled.svg?raw";
import SettingsStandardIcon from "src/assets/icons/navigation/settings-standard.svg?raw";
import SettingsFilledIcon from "src/assets/icons/navigation/settings-filled.svg?raw";

export interface NavigationIcon {
  standard: string;
  filled: string;
}

export const navigationIcons = {
  home: {
    standard: HomeStandardIcon,
    filled: HomeFilledIcon,
  },
  explore: {
    standard: ExploreStandardIcon,
    filled: ExploreFilledIcon,
  },
  notification: {
    standard: NotificationStandardIcon,
    filled: NotificationFilledIcon,
  },
  profile: {
    standard: ProfileStandardIcon,
    filled: ProfileFilledIcon,
  },
  settings: {
    standard: SettingsStandardIcon,
    filled: SettingsFilledIcon,
  },
} as const;

export type NavigationIconName = keyof typeof navigationIcons;

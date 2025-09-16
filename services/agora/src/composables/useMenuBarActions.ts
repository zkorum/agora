import BackButton from "src/components/navigation/buttons/BackButton.vue";
import CloseButton from "src/components/navigation/buttons/CloseButton.vue";
import MenuButton from "src/components/navigation/buttons/MenuButton.vue";
import LoginButton from "src/components/navigation/buttons/LoginButton.vue";

export function useMenuBarActions() {
  return {
    MenuButton,
    BackButton,
    CloseButton,
    LoginButton,
  };
}

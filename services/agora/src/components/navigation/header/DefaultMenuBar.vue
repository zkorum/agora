<template>
  <div>
    <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility -->
    <!-- Footer navigation items should be keyboard accessible for users with motor disabilities -->
    <div class="container" @click="scrollToTop()">
      <TopMenuWrapper>
        <div class="gridContainer">
          <div
            class="leftContainer"
            :class="{ individualContainer: fixedHeight }"
          >
            <div v-if="hasMenuButton">
              <div>
                <UserAvatar
                  v-if="
                    isGuestOrLoggedIn &&
                    !isCapacitor &&
                    drawerBehavior == 'mobile'
                  "
                  class="menuButtonHover"
                  :size="40"
                  :user-identity="profileData.userName"
                  @click="menuButtonClicked()"
                />
              </div>

              <ZKIconButton
                v-if="
                  !isGuestOrLoggedIn &&
                  !isCapacitor &&
                  drawerBehavior == 'mobile'
                "
                icon="mdi-menu"
                icon-color="black"
                @click="menuButtonClicked()"
              />
            </div>

            <BackButton v-if="hasBackButton" />

            <CloseButton v-if="hasCloseButton" />
            <slot name="left"></slot>
          </div>
          <div
            class="centerContainer"
            :class="{ individualContainer: fixedHeight }"
          >
            <slot name="middle"></slot>
          </div>
          <div
            class="rightContainer"
            :class="{ individualContainer: fixedHeight }"
          >
            <div>
              <RouterLink
                v-if="hasLoginButton && !isLoggedIn && isAuthInitialized"
                :to="{ name: '/welcome/' }"
              >
                <ZKButton
                  button-type="largeButton"
                  :label="t('logIn')"
                  text-color="white"
                  color="primary"
                />
              </RouterLink>
            </div>

            <slot name="right"></slot>
          </div>
        </div>
      </TopMenuWrapper>
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIconButton from "src/components/ui-library/ZKIconButton.vue";
import BackButton from "../buttons/BackButton.vue";
import { type DefaultMenuBarProps } from "src/utils/model/props";
import TopMenuWrapper from "./TopMenuWrapper.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import CloseButton from "../buttons/CloseButton.vue";
import { storeToRefs } from "pinia";
import { useNavigationStore } from "src/stores/navigation";
import { useUserStore } from "src/stores/user";
import UserAvatar from "src/components/account/UserAvatar.vue";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  defaultMenuBarTranslations,
  type DefaultMenuBarTranslations,
} from "./DefaultMenuBar.i18n";

defineProps<DefaultMenuBarProps>();

const isCapacitor = process.env.MODE == "capacitor";

const { profileData } = storeToRefs(useUserStore());

const { showMobileDrawer, drawerBehavior } = storeToRefs(useNavigationStore());

const { isLoggedIn, isGuestOrLoggedIn, isAuthInitialized } = storeToRefs(
  useAuthenticationStore()
);

const { t } = useComponentI18n<DefaultMenuBarTranslations>(
  defaultMenuBarTranslations
);

function menuButtonClicked() {
  showMobileDrawer.value = !showMobileDrawer.value;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
</script>

<style scoped lang="scss">
.gridContainer {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr;
  gap: 1rem 1rem;
  grid-template-areas: ". . .";
  width: 100%;
  padding-bottom: 0.2rem;
}

.individualContainer {
  height: 2.5rem;
}

.container:hover {
  cursor: pointer;
}

.container {
  padding: 0.5rem;
}

.leftContainer {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.centerContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 1rem;
  color: black;
}

.rightContainer {
  display: flex;
  justify-content: end;
}

.menuButtonHover:hover {
  cursor: pointer;
}
</style>

<template>
  <div>
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
                    isAuthenticated &&
                    !isCapacitor &&
                    drawerBehavior == 'mobile'
                  "
                  class="menuButtonHover"
                  :size="40"
                  :user-name="profileData.userName"
                  @click="menuButtonClicked()"
                />
              </div>

              <ZKButton
                v-if="
                  !isAuthenticated && !isCapacitor && drawerBehavior == 'mobile'
                "
                button-type="standardButton"
                icon="mdi-menu"
                text-color="black"
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
                v-if="hasLoginButton && !isAuthenticated && showAuthButton"
                :to="{ name: '/welcome/' }"
              >
                <ZKButton
                  button-type="standardButton"
                  label="Log in"
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
import BackButton from "../buttons/BackButton.vue";
import { type DefaultMenuBarProps } from "src/utils/model/props";
import TopMenuWrapper from "./TopMenuWrapper.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { onMounted, ref } from "vue";
import CloseButton from "../buttons/CloseButton.vue";
import { storeToRefs } from "pinia";
import { useNavigationStore } from "src/stores/navigation";
import { useUserStore } from "src/stores/user";
import UserAvatar from "src/components/account/UserAvatar.vue";

defineProps<DefaultMenuBarProps>();

const isCapacitor = process.env.MODE == "capacitor";

const { profileData } = storeToRefs(useUserStore());

const { showMobileDrawer, drawerBehavior } = storeToRefs(useNavigationStore());

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const showAuthButton = ref(false);

onMounted(() => {
  setTimeout(function () {
    showAuthButton.value = true;
  }, 50);
});

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
  grid-template-columns: 1fr auto 1fr;
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
  background-color: $app-background-color;
  padding: 0.5rem;
  font: black;
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

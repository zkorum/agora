<template>
  <div>
    <div class="container">
      <TopMenuWrapper :reveal="true">
        <div class="standardContainer">
          <div v-if="hasMenuButton">
            <div class="menuButtonHover">
              <UserAvatar
                v-if="
                  isAuthenticated && !isCapacitor && drawerBehavior == 'mobile'
                "
                :size="40"
                :user-name="profileData.userName"
                @click="menuButtonClicked()"
              />
            </div>

            <ZKButton
              v-if="
                !isAuthenticated && !isCapacitor && drawerBehavior == 'mobile'
              "
              icon="mdi-menu"
              text-color="black"
            />
          </div>

          <BackButton v-if="hasBackButton" />

          <CloseButton v-if="hasCloseButton" />
          <slot name="left"></slot>
        </div>
        <div class="standardContainer centerContainer">
          <slot name="middle"></slot>
        </div>
        <div class="standardContainer">
          <RouterLink
            v-if="hasLoginButton && !isAuthenticated && showAuthButton"
            :to="{ name: '/welcome/' }"
          >
            <ZKButton label="Log in" text-color="white" color="primary" />
          </RouterLink>

          <slot name="right"></slot>
        </div>
      </TopMenuWrapper>
      <q-separator />
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import BackButton from "../buttons/BackButton.vue";
import { type DefaultMenuBarProps } from "src/utils/model/props";
import TopMenuWrapper from "../TopMenuWrapper.vue";
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
</script>

<style scoped lang="scss">
.container {
  background-color: $app-background-color;
  padding: 0.5rem;
}

.standardContainer {
  font: black;
  min-width: 3rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.centerContainer {
  margin: auto;
  font-weight: 500;
  font-size: 1rem;
  color: black;
}

.menuButtonHover:hover {
  cursor: pointer;
}
</style>

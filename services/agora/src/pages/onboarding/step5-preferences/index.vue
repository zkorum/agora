<template>
  <MainLayout
    :general-props="{
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: false,
      reducedWidth: true,
    }"
    :menu-bar-props="{
      hasBackButton: true,
      hasSettingsButton: false,
      hasCloseButton: false,
      hasLoginButton: false,
    }"
  >
    <StepperLayout
      :submit-call-back="() => {}"
      :current-step="6"
      :total-steps="6"
      :enable-next-button="true"
      :show-next-button="false"
    >
      <template #header>
        <InfoHeader
          title="Content Preferences"
          description=""
          icon-name="mdi-star-box"
        />
      </template>

      <template #body>
        <div class="headerContainer">
          <q-icon name="mdi-translate" size="2rem" />
          What languages do you speak?
        </div>

        <div class="tagContainer">
          <div v-for="lang in languageList" :key="lang" class="tagWrapper">
            <q-btn
              outline
              no-caps
              class="tagStyle"
              rounded
              size="small"
              text-color="primary"
            >
              <div class="tagFlexContainer">
                <div>
                  {{ lang }}
                </div>
                <q-icon name="mdi-close" />
              </div>
            </q-btn>
          </div>
          <q-btn round outline no-caps color="secondary" icon="mdi-plus" />
        </div>

        <div class="headerContainer">
          <q-icon name="mdi-pound" size="2rem" />
          Select topics to get started
        </div>

        <div class="tagContainer">
          <q-btn
            v-for="topic in topicList"
            :key="topic"
            outline
            no-caps
            :label="topic"
            class="tagStyle"
            rounded
            size="small"
            text-color="primary"
          />
        </div>

        <ZKButton label="Save and Close" color="primary" @click="goToHome" />
      </template>
    </StepperLayout>
  </MainLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useRouter } from "vue-router";
import MainLayout from "src/layouts/MainLayout.vue";

const router = useRouter();

const languageList = ["English", "Spanish", "French", "Chinese"];
const topicList = ["Technology", "Environment", "Politics"];

function goToHome() {
  router.push({ name: "/" });
}
</script>

<style scoped lang="scss">
.tagContainer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.headerContainer {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.tagStyle:hover {
  cursor: pointer;
}

.tagWrapper {
  position: relative;
}

.tagFlexContainer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>

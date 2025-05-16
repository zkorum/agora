<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: false,
      reducedWidth: true,
    }"
  >
    <StepperLayout
      :submit-call-back="() => {}"
      :current-step="6"
      :total-steps="6"
      :enable-next-button="true"
      :show-next-button="false"
      :show-loading-button="false"
    >
      <template #header>
        <InfoHeader
          title="Content Preferences"
          description=""
          icon-name="mdi-star-box"
        />
      </template>

      <template #body>
        <!--
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
        -->

        <div class="headerContainer">
          <q-icon name="mdi-pound" size="2rem" />
          <span class="title"> Select topics to get started </span>
        </div>

        <div class="tagContainer">
          <Button
            v-for="topic in fullTopicList"
            :key="topic.code"
            :label="topic.name"
            rounded
            :icon="
              followedTopicCodeList.includes(topic.code) ? 'pi pi-check' : ''
            "
            :pt="
              followedTopicCodeList.includes(topic.code)
                ? {
                    root: {
                      class: 'followingButtonStyle generalStyle',
                    },
                  }
                : {
                    root: {
                      class: 'followButtonStyle generalStyle',
                    },
                  }
            "
          />
        </div>

        <ZKButton
          button-type="largeButton"
          label="Save & Close"
          color="primary"
          @click="clickedSaveAndClose()"
        />
      </template>
    </StepperLayout>
  </DrawerLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { storeToRefs } from "pinia";
import { useTopicStore } from "src/stores/topic";
import { onMounted } from "vue";
import Button from "primevue/button";
import { useLoginIntentionStore } from "src/stores/loginIntention";

const { loadTopicsData } = useTopicStore();
const { fullTopicList, followedTopicCodeList } = storeToRefs(useTopicStore());

const { routeUserAfterLogin } = useLoginIntentionStore();

onMounted(async () => {
  await loadTopicsData();
});

async function clickedSaveAndClose() {
  await routeUserAfterLogin();
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

.tagWrapper {
  position: relative;
}

.tagFlexContainer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.generalStyle {
  font-weight: 400;
  font-size: 1rem;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
  padding-left: 1rem;
  padding-right: 1rem;
  border-width: 1px;
  border-style: solid;
  border-radius: 15px;
}

.followButtonStyle {
  background-color: transparent;
  border-color: #e9e9f2;
  color: black;
}

.followingButtonStyle {
  background-color: $primary;
  border-color: transparent;
  color: white;
}

.title {
  font-size: 1.1rem;
}
</style>

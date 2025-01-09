<template>
  <div>
    <q-layout
      view="hHh lpR fFf"
      :class="{ bottomPagePadding: props.generalProps.addBottomPadding }"
    >
      <q-page-container>
        <q-page>
          <DefaultMenuBar
            :has-back-button="props.menuBarProps.hasBackButton"
            :has-close-button="props.menuBarProps.hasCloseButton"
            :has-login-button="props.menuBarProps.hasLoginButton"
            :has-settings-button="props.menuBarProps.hasSettingsButton"
          />

          <WidthWrapper
            :width="props.generalProps.reducedWidth ? '25rem' : '35rem'"
          >
            <slot />
          </WidthWrapper>
        </q-page>
      </q-page-container>

      <q-footer
        v-if="props.generalProps.enableFooter"
        bordered
        class="coloredFooter"
      >
        <FooterBar />
      </q-footer>
    </q-layout>
  </div>
</template>

<script setup lang="ts">
import FooterBar from "src/components/footer/FooterBar.vue";
import DefaultMenuBar from "src/components/navigation/DefaultMenuBar.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import { type MainLayoutProps } from "src/utils/model/props";

const props = defineProps<MainLayoutProps>();
</script>

<style scoped lang="scss">
.outerPadding {
  padding: 0.5rem;
}

.coloredFooter {
  background-color: $navigation-bar-color;
}

.bottomPagePadding {
  padding-bottom: 10rem;
}
</style>

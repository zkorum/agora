<template>
  <q-layout view="lHh LpR lFf">
    <q-header
      :reveal="enableHeaderReveal"
      :model-value="layoutConfig.enableHeader"
      class="headerStyle"
      @reveal="captureHeaderReveal"
    >
      <div id="page-header"></div>
    </q-header>

    <q-footer
      v-if="drawerBehavior === 'mobile' && layoutConfig.enableFooter"
      reveal
      :model-value="revealHeader"
      class="footerBackground"
    >
      <FooterBar />
    </q-footer>

    <q-page-container>
      <q-page>
        <div
          :class="{
            bottomPagePadding: layoutConfig.addBottomPadding,
            generalPagePadding: layoutConfig.addGeneralPadding,
          }"
        >
          <WidthWrapper :enable="layoutConfig.reducedWidth">
            <slot />
          </WidthWrapper>
        </div>
      </q-page>
    </q-page-container>

    <q-drawer
      v-model="showMobileDrawer"
      :behavior="drawerBehavior"
      :width="300"
      :overlay="drawerBehavior === 'mobile'"
      :no-swipe-open="true"
      bordered
    >
      <q-scroll-area class="scrollContainer">
        <SideDrawer />
      </q-scroll-area>
    </q-drawer>
  </q-layout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import FooterBar from "src/components/navigation/footer/FooterBar.vue";
import SideDrawer from "src/components/navigation/SideDrawer.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import { useLayoutHeaderStore } from "src/stores/layout/header";
import { usePageLayoutStore } from "src/stores/layout/pageLayout";
import { useNavigationStore } from "src/stores/navigation";
import { useNotificationRefresher } from "src/utils/component/notification/menuRefresher";
import { ref } from "vue";

const { config: layoutConfig } = storeToRefs(usePageLayoutStore());
const { showMobileDrawer, drawerBehavior } = storeToRefs(useNavigationStore());
const { reveal: revealHeader } = storeToRefs(useLayoutHeaderStore());

useNotificationRefresher();


// Header reveal — one-time init, not per-navigation
const enableHeaderReveal = ref(false);
setTimeout(() => {
  enableHeaderReveal.value = true;
}, 500);

function captureHeaderReveal(reveal: boolean) {
  revealHeader.value = reveal;
}
</script>

<style scoped lang="scss">
.bottomPagePadding {
  padding-bottom: 10rem;
}

.footerBackground {
  background-color: white;
  box-shadow:
    0px 0px 1px rgba(20, 20, 20, 0.04),
    0px 0px 8px rgba(20, 20, 20, 0.08);
}

.generalPagePadding {
  padding: 1rem;
}

.scrollContainer {
  width: 100%;
  height: 100%;
}

#page-header {
  padding-bottom: 0.5rem;
}

.headerStyle {
  background-color: $app-background-color;
}
</style>

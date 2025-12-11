<template>
  <div>
    <q-layout :view="'lHh LpR lFf'">
      <q-header
        :reveal="enableHeaderReveal"
        :model-value="props.generalProps.enableHeader"
        class="headerStyle"
        @reveal="captureHeaderReveal"
      >
        <slot name="header"></slot>
      </q-header>

      <q-footer
        v-if="drawerBehavior == 'mobile' && props.generalProps.enableFooter"
        :reveal="revealHeader"
        class="footerBackground"
      >
        <FooterBar />
      </q-footer>

      <q-page-container>
        <q-page>
          <div
            :class="{
              bottomPagePadding: props.generalProps.addBottomPadding,
              generalPagePadding: props.generalProps.addGeneralPadding,
            }"
          >
            <WidthWrapper :enable="props.generalProps.reducedWidth">
              <slot />
            </WidthWrapper>
          </div>
        </q-page>
      </q-page-container>

      <q-drawer
        v-model="showMobileDrawer"
        :behavior="drawerBehavior"
        :width="300"
        :overlay="drawerBehavior == 'mobile'"
        :no-swipe-open="noSwipeOpen"
        bordered
      >
        <q-scroll-area class="scrollContainer">
          <SideDrawer />
        </q-scroll-area>
      </q-drawer>
    </q-layout>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import FooterBar from "src/components/navigation/footer/FooterBar.vue";
import SideDrawer from "src/components/navigation/SideDrawer.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import { useLayoutHeaderStore } from "src/stores/layout/header";
import { useNavigationStore } from "src/stores/navigation";
import { useNotificationRefresher } from "src/utils/component/notification/menuRefresher";
import { type MainLayoutProps } from "src/utils/model/props";
import { ref } from "vue";

const props = defineProps<MainLayoutProps>();

const { showMobileDrawer, drawerBehavior } = storeToRefs(useNavigationStore());
const { reveal: revealHeader } = storeToRefs(useLayoutHeaderStore());

useNotificationRefresher();

const noSwipeOpen = process.env.MODE != "capacitor";

const enableHeaderReveal = ref(false);
setTimeout(() => {
  enableHeaderReveal.value = true;
}, 500);

function captureHeaderReveal(reveal: boolean) {
  if (drawerBehavior.value == "mobile") {
    revealHeader.value = reveal;
  }
}
</script>

<style scoped lang="scss">
.header {
  grid-area: header;
}
.footer {
  grid-area: footer;
}
.sideBar {
  grid-area: sideBar;
  border-right-style: solid;
  border-right-width: 3px;
  border-right-color: #e2e1e7;
}
.mainBody {
  grid-area: mainBody;
}

.outerPadding {
  padding: 0.5rem;
}

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

.headerStyle {
  background-color: $app-background-color;
}
</style>

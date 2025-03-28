<template>
  <div>
    <q-layout :key="drawerBehavior" :view="'lHh LpR lFf'">
      <q-header reveal :model-value="props.generalProps.enableHeader">
        <slot name="header"></slot>
      </q-header>

      <q-footer
        v-if="drawerBehavior == 'mobile' && props.generalProps.enableFooter"
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
        show-if-above
        :behavior="drawerBehavior"
        :width="300"
        :breakpoint="800"
        :overlay="drawerBehavior == 'mobile'"
        :no-swipe-open="noSwipeOpen"
        bordered
      >
        <q-scroll-area class="fit">
          <SideDrawer />
        </q-scroll-area>
      </q-drawer>

      <PostLoginIntentionDialog />
    </q-layout>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import PostLoginIntentionDialog from "src/components/authentication/intention/PostLoginIntentionDialog.vue";
import FooterBar from "src/components/navigation/footer/FooterBar.vue";
import SideDrawer from "src/components/navigation/SideDrawer.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import { useNavigationStore } from "src/stores/navigation";
import { useNotificationRefresher } from "src/utils/component/notification/menuRefresher";
import { type MainLayoutProps } from "src/utils/model/props";

const props = defineProps<MainLayoutProps>();

const { showMobileDrawer, drawerBehavior } = storeToRefs(useNavigationStore());
useNotificationRefresher();

const noSwipeOpen = process.env.MODE != "capacitor";
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
}

.generalPagePadding {
  padding: 1rem;
}
</style>

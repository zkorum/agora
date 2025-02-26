<template>
  <div>
    <q-layout view="lHh lpR lFf">
      <q-header height-hint="98">
        <slot name="header"></slot>
      </q-header>

      <q-footer class="bg-white">
        <FooterBar />
      </q-footer>

      <q-page-container>
        <q-page>
          <div
            :class="{
              bottomPagePadding: props.generalProps.addBottomPadding,
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
        :breakpoint="700"
        :overlay="drawerBehavior == 'mobile'"
        :no-swipe-open="noSwipeOpen"
      >
        <q-scroll-area class="fit">
          <SideDrawer />
        </q-scroll-area>
      </q-drawer>
    </q-layout>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import FooterBar from "src/components/footer/FooterBar.vue";
import SideDrawer from "src/components/navigation/SideDrawer.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import { useNavigationStore } from "src/stores/navigation";
import { type MainLayoutProps } from "src/utils/model/props";

const props = defineProps<MainLayoutProps>();

const { showMobileDrawer, drawerBehavior } = storeToRefs(useNavigationStore());

const noSwipeOpen = process.env.MODE != "capacitor";
</script>

<style scoped lang="scss">
.container {
  display: grid;
  grid-template-columns: min-content 1fr;
  grid-template-rows: min-content 1fr min-content;
  gap: 0px 0px;
  grid-template-areas:
    "sideBar header"
    "sideBar mainBody"
    "sideBar footer";
  height: 100dvh;
  width: 100dvw;
}

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
</style>

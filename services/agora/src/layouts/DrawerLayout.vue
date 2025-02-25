<template>
  <div>
    <q-layout
      view="lHh lpR lFf"
      :class="{ bottomPagePadding: props.generalProps.addBottomPadding }"
    >
      <q-drawer
        v-model="showDrawer"
        show-if-above
        behavior="mobile"
        :width="300"
        :breakpoint="700"
        elevated
        overlay
        :no-swipe-open="noSwipeOpen"
      >
        <q-scroll-area class="fit">
          <SideDrawer />
        </q-scroll-area>
      </q-drawer>

      <q-page-container>
        <q-page>
          <WidthWrapper :enable="props.generalProps.reducedWidth">
            <slot name="header"></slot>
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
import { storeToRefs } from "pinia";
import FooterBar from "src/components/footer/FooterBar.vue";
import SideDrawer from "src/components/navigation/SideDrawer.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import { useNavigationStore } from "src/stores/navigation";
import { type MainLayoutProps } from "src/utils/model/props";

const props = defineProps<MainLayoutProps>();

const { showDrawer } = storeToRefs(useNavigationStore());

const noSwipeOpen = process.env.MODE != "capacitor";
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

import { defineStore } from "pinia";
import { ref } from "vue";

export interface PageLayoutConfig {
  addGeneralPadding: boolean;
  addBottomPadding: boolean;
  enableHeader: boolean;
  enableFooter: boolean;
  reducedWidth: boolean;
}

const defaultConfig: PageLayoutConfig = {
  addGeneralPadding: false,
  addBottomPadding: false,
  enableHeader: true,
  enableFooter: true,
  reducedWidth: false,
};

export const usePageLayoutStore = defineStore("pageLayout", () => {
  const config = ref<PageLayoutConfig>({ ...defaultConfig });

  function setPageLayout(partial: Partial<PageLayoutConfig>) {
    config.value = { ...defaultConfig, ...partial };
  }

  return {
    config,
    setPageLayout,
  };
});

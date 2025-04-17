import { defineStore } from "pinia";
import { ref } from "vue";

export const useLayoutHeaderStore = defineStore("layoutHeader", () => {
  const reveal = ref(true);

  return { reveal };
});

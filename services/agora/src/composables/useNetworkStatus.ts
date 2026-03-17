import { readonly, ref } from "vue";

const _isOffline = ref(false);

export const isNetworkOffline = readonly(_isOffline);

export function setNetworkOffline(offline: boolean) {
  console.log("[Network] setNetworkOffline:", offline);
  _isOffline.value = offline;
}

import { useQuery } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { Dto } from "src/shared/types/dto";
import { useAuthenticationStore } from "src/stores/authentication";
import { useViewerQueryScope } from "src/utils/query/viewerScope";
import { computed, onActivated, onDeactivated, ref } from "vue";

import { api } from "./client";
import { useCommonApi } from "./common";

export function useManagementAccess() {
  const { isLoggedIn } = storeToRefs(useAuthenticationStore());
  const scope = useViewerQueryScope();
  const isActive = ref(true);
  onActivated(() => {
    isActive.value = true;
  });
  onDeactivated(() => {
    isActive.value = false;
  });
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();
  return useQuery({
    queryKey: computed(() => ["managementAccess", scope.value]),
    enabled: computed(() => isLoggedIn.value && isActive.value),
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const url = "/api/v1/management/access";
      const encodedUcan = await buildEncodedUcan(url, { method: "POST" });
      const response = await api.post<unknown>(
        url,
        {},
        createRawAxiosRequestConfig({ encodedUcan, signal })
      );
      return Dto.getManagementAccessResponse.parse(response.data);
    },
  });
}

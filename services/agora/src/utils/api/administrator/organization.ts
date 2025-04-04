import { api } from "boot/axios";
import {
  ApiV1AdministratorOrganizationSetPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { useNotify } from "src/utils/ui/notify";
import { useCommonApi } from "../common";

export function useBackendAdministratorOrganizationApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  async function setUserOrganization(
    username: string,
    description: string,
    imageName: string,
    organizationName: string,
    websiteUrl: string
  ) {
    try {
      const params: ApiV1AdministratorOrganizationSetPostRequest = {
        username: username,
        description: description,
        imageName: imageName,
        organizationName: organizationName,
        websiteUrl: websiteUrl,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AdministratorOrganizationSetPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AdministratorOrganizationSetPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      if (response.status == 200) {
        return true;
      } else {
        showNotifyMessage("Failed to set user organization");
        return false;
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to set user organization");
      return false;
    }
  }

  return {
    setUserOrganization,
  };
}

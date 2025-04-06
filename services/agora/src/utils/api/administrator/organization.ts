import { api } from "boot/axios";
import {
  ApiV1AdministratorOrganizationCreateMetadataPostRequest,
  ApiV1AdministratorOrganizationDeldeteMetadataPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { useNotify } from "src/utils/ui/notify";
import { useCommonApi } from "../common";

export function useBackendAdministratorOrganizationApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  async function deleteOrganizationMetadata(organizationName: string) {
    try {
      const params: ApiV1AdministratorOrganizationDeldeteMetadataPostRequest = {
        organizationName: organizationName,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AdministratorOrganizationDeldeteMetadataPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AdministratorOrganizationDeldeteMetadataPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      if (response.status == 200) {
        showNotifyMessage("Deleted organization");
        return true;
      } else {
        showNotifyMessage("Failed to delete organization");
        return false;
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to delete organization");
      return false;
    }
  }

  async function createOrganizationMetadata(
    description: string,
    imagePath: string,
    isFullImagePath: boolean,
    organizationName: string,
    websiteUrl: string
  ) {
    try {
      const params: ApiV1AdministratorOrganizationCreateMetadataPostRequest = {
        description: description,
        imagePath: imagePath,
        isFullImagePath: isFullImagePath,
        organizationName: organizationName,
        websiteUrl: websiteUrl,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AdministratorOrganizationCreateMetadataPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AdministratorOrganizationCreateMetadataPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      if (response.status == 200) {
        showNotifyMessage("Updated user organization");
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
    deleteOrganizationMetadata,
    createOrganizationMetadata,
  };
}

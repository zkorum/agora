import { api } from "boot/axios";
import type {
  ApiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest,
  ApiV1AdministratorOrganizationCreateOrganizationPostRequest,
  ApiV1AdministratorOrganizationDeleteOrganizationPostRequest,
  ApiV1UserUsernameUpdatePostRequest,
} from "src/api";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { useNotify } from "src/utils/ui/notify";
import { useCommonApi } from "../common";
import type { OrganizationProperties } from "src/shared/types/zod";

export function useBackendAdministratorOrganizationApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  async function getAllOrganizations(): Promise<OrganizationProperties[]> {
    try {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AdministratorOrganizationGetAllOrganizationsPost();
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AdministratorOrganizationGetAllOrganizationsPost({
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      if (response.status == 200) {
        return response.data.organizationList;
      } else {
        showNotifyMessage("Failed to fetch organizations");
        return [];
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch organizations");
      return [];
    }
  }

  async function addUserOrganizationMapping(
    username: string,
    organizationName: string
  ) {
    try {
      const params: ApiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest =
        {
          username: username,
          organizationName: organizationName,
        };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AdministratorOrganizationAddUserOrganizationMappingPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AdministratorOrganizationAddUserOrganizationMappingPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      if (response.status == 200) {
        showNotifyMessage("Added user organization mapping");
        return true;
      } else {
        showNotifyMessage("Failed to add user organization mapping");
        return false;
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to add user organization mapping");
      return false;
    }
  }

  async function removeUserOrganizationMapping(
    username: string,
    organizationName: string
  ) {
    try {
      const params: ApiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest =
        {
          username: username,
          organizationName: organizationName,
        };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AdministratorOrganizationRemoveUserOrganizationMappingPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AdministratorOrganizationRemoveUserOrganizationMappingPost(
        params,
        {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        }
      );

      if (response.status == 200) {
        showNotifyMessage("Removed user organization mapping");
        return true;
      } else {
        showNotifyMessage("Failed to remove user organization mapping");
        return false;
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to remove user organization mapping");
      return false;
    }
  }

  async function deleteOrganization(organizationName: string) {
    try {
      const params: ApiV1AdministratorOrganizationDeleteOrganizationPostRequest =
        {
          organizationName: organizationName,
        };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AdministratorOrganizationDeleteOrganizationPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AdministratorOrganizationDeleteOrganizationPost(params, {
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

  async function createOrganization(
    description: string,
    imagePath: string,
    isFullImagePath: boolean,
    organizationName: string,
    websiteUrl: string
  ) {
    try {
      const params: ApiV1AdministratorOrganizationCreateOrganizationPostRequest =
        {
          description: description,
          imagePath: imagePath,
          isFullImagePath: isFullImagePath,
          organizationName: organizationName,
          websiteUrl: websiteUrl,
        };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AdministratorOrganizationCreateOrganizationPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AdministratorOrganizationCreateOrganizationPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      if (response.status == 200) {
        showNotifyMessage("Created user organization");
        return true;
      } else {
        showNotifyMessage("Failed to create user organization");
        return false;
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to create user organization");
      return false;
    }
  }

  async function getOrganizationsByUsername(
    username: string
  ): Promise<OrganizationProperties[]> {
    try {
      const params: ApiV1UserUsernameUpdatePostRequest = {
        username: username,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1AdministratorOrganizationGetOrganizationNamesByUsernamePost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1AdministratorOrganizationGetOrganizationNamesByUsernamePost(
        params,
        {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        }
      );

      if (response.status == 200) {
        return response.data.organizationList;
      } else {
        showNotifyMessage("Failed to get user's organizations");
        return [];
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to get user's organizations");
      return [];
    }
  }

  return {
    deleteOrganization,
    createOrganization,
    addUserOrganizationMapping,
    removeUserOrganizationMapping,
    getAllOrganizations,
    getOrganizationsByUsername,
  };
}

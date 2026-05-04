import type {
  ApiV1AdministratorOrganizationAddUserOrganizationMappingPostRequest,
  ApiV1AdministratorOrganizationCreateOrganizationPostRequest,
  ApiV1AdministratorOrganizationDeleteOrganizationPostRequest,
  ApiV1UserUsernameUpdatePostRequest,
} from "src/api";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { OrganizationProperties } from "src/shared/types/zod";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { useNotify } from "src/utils/ui/notify";

import { api } from "../client";
import { useCommonApi } from "../common";
import {
  type AdministratorOrganizationApiTranslations,
  administratorOrganizationApiTranslations,
} from "./organization.i18n";

export function useBackendAdministratorOrganizationApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<AdministratorOrganizationApiTranslations>(
    administratorOrganizationApiTranslations
  );

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
        showNotifyMessage(t("failedToFetchOrganizations"));
        return [];
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToFetchOrganizations"));
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
        showNotifyMessage(t("addedUserOrganizationMapping"));
        return true;
      } else {
        showNotifyMessage(t("failedToAddUserOrganizationMapping"));
        return false;
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToAddUserOrganizationMapping"));
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
        showNotifyMessage(t("removedUserOrganizationMapping"));
        return true;
      } else {
        showNotifyMessage(t("failedToRemoveUserOrganizationMapping"));
        return false;
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToRemoveUserOrganizationMapping"));
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
        showNotifyMessage(t("deletedOrganization"));
        return true;
      } else {
        showNotifyMessage(t("failedToDeleteOrganization"));
        return false;
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToDeleteOrganization"));
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
        showNotifyMessage(t("createdUserOrganization"));
        return true;
      } else {
        showNotifyMessage(t("failedToCreateUserOrganization"));
        return false;
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToCreateUserOrganization"));
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
        showNotifyMessage(t("failedToGetUserOrganizations"));
        return [];
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToGetUserOrganizations"));
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

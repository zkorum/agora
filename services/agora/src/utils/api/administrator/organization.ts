import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type AdminOrganizationOption,
  type AdminOrganizationProperties,
  type CreateOrganizationRequest,
  Dto,
  type GetOrganizationDetailsRequest,
  type OrganizationMember,
  type UpdateOrganizationLocalizationRequest,
  type UpdateOrganizationSlugRequest,
} from "src/shared/types/dto";
import type { OrganizationProperties } from "src/shared/types/zod";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { useNotify } from "src/utils/ui/notify";

import { api } from "../client";
import { useCommonApi } from "../common";
import {
  type AdministratorOrganizationApiTranslations,
  administratorOrganizationApiTranslations,
} from "./organization.i18n";

type UpdateOrganizationSlugFailureReason = Exclude<
  Awaited<ReturnType<typeof Dto.updateOrganizationSlugResponse.parse>>,
  { success: true }
>["reason"];

const updateSlugFailureTranslationKeys: Record<
  UpdateOrganizationSlugFailureReason,
  keyof AdministratorOrganizationApiTranslations
> = {
  organization_not_found: "organizationNotFound",
  organization_slug_already_exists: "organizationSlugAlreadyExists",
};

export function useBackendAdministratorOrganizationApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<AdministratorOrganizationApiTranslations>(
    administratorOrganizationApiTranslations
  );

  async function postWithUcan<TResponse>({
    url,
    data,
    responseSchema,
  }: {
    url: string;
    data?: unknown;
    responseSchema?: { parse: (data: unknown) => TResponse };
  }): Promise<TResponse | undefined> {
    const encodedUcan = await buildEncodedUcan(url, { method: "POST" });
    const response = await api.post(url, data, {
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });

    if (responseSchema === undefined) {
      return undefined;
    }

    return responseSchema.parse(response.data);
  }

  async function getOrganizationOptions(): Promise<AdminOrganizationOption[]> {
    try {
      const response = await postWithUcan({
        url: "/api/v1/administrator/organization/get-organization-options",
        responseSchema: Dto.getOrganizationOptionsResponse,
      });
      return response?.organizationList ?? [];
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToFetchOrganizations"));
      return [];
    }
  }

  async function getOrganizationDetails(
    data: GetOrganizationDetailsRequest
  ): Promise<AdminOrganizationProperties | undefined> {
    try {
      const params = Dto.getOrganizationDetailsRequest.parse(data);
      const response = await postWithUcan({
        url: "/api/v1/administrator/organization/get-organization-details",
        data: params,
        responseSchema: Dto.getOrganizationDetailsResponse,
      });
      return response?.organization;
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToFetchOrganizations"));
      return undefined;
    }
  }

  async function getOrganizationMembers({
    organizationName,
  }: {
    organizationName: string;
  }): Promise<OrganizationMember[]> {
    try {
      const params = Dto.getOrganizationMembersRequest.parse({
        organizationName,
      });
      const response = await postWithUcan({
        url: "/api/v1/administrator/organization/get-members",
        data: params,
        responseSchema: Dto.getOrganizationMembersResponse,
      });
      return response?.memberList ?? [];
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToFetchOrganizationMembers"));
      return [];
    }
  }

  async function addUserOrganizationMapping({
    username,
    organizationName,
  }: {
    username: string;
    organizationName: string;
  }): Promise<boolean> {
    try {
      const params = Dto.addUserOrganizationMappingRequest.parse({
        username,
        organizationName,
      });
      await postWithUcan({
        url: "/api/v1/administrator/organization/add-user-organization-mapping",
        data: params,
      });
      showNotifyMessage(t("addedUserOrganizationMapping"));
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToAddUserOrganizationMapping"));
      return false;
    }
  }

  async function removeUserOrganizationMapping({
    username,
    organizationName,
  }: {
    username: string;
    organizationName: string;
  }): Promise<boolean> {
    try {
      const params = Dto.removeUserOrganizationMappingRequest.parse({
        username,
        organizationName,
      });
      await postWithUcan({
        url: "/api/v1/administrator/organization/remove-user-organization-mapping",
        data: params,
      });
      showNotifyMessage(t("removedUserOrganizationMapping"));
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToRemoveUserOrganizationMapping"));
      return false;
    }
  }

  async function deleteOrganization({
    organizationName,
  }: {
    organizationName: string;
  }): Promise<boolean> {
    try {
      const params = Dto.deleteOrganizationRequest.parse({
        organizationName,
      });
      await postWithUcan({
        url: "/api/v1/administrator/organization/delete-organization",
        data: params,
      });
      showNotifyMessage(t("deletedOrganization"));
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToDeleteOrganization"));
      return false;
    }
  }

  async function createOrganization(
    data: CreateOrganizationRequest
  ): Promise<boolean> {
    try {
      const params = Dto.createOrganizationRequest.parse(data);

      await postWithUcan({
        url: "/api/v1/administrator/organization/create-organization",
        data: params,
      });
      showNotifyMessage(t("createdUserOrganization"));
      return true;
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
      const params = Dto.getOrganizationsByUsernameRequest.parse({ username });
      const response = await postWithUcan({
        url: "/api/v1/administrator/organization/get-organization-names-by-username",
        data: params,
        responseSchema: Dto.getOrganizationsByUsernameResponse,
      });
      return response?.organizationList ?? [];
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToGetUserOrganizations"));
      return [];
    }
  }

  async function updateOrganizationLocalization(
    data: UpdateOrganizationLocalizationRequest
  ): Promise<boolean> {
    try {
      const params = Dto.updateOrganizationLocalizationRequest.parse(data);
      await postWithUcan({
        url: "/api/v1/administrator/organization/localization/update",
        data: params,
        responseSchema: Dto.updateOrganizationLocalizationResponse,
      });
      showNotifyMessage(t("updatedOrganization"));
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToUpdateOrganization"));
      return false;
    }
  }

  async function updateOrganizationSlug(
    data: UpdateOrganizationSlugRequest
  ): Promise<boolean> {
    try {
      const params = Dto.updateOrganizationSlugRequest.parse(data);
      const response = await postWithUcan({
        url: "/api/v1/administrator/organization/slug/update",
        data: params,
        responseSchema: Dto.updateOrganizationSlugResponse,
      });
      if (response?.success) {
        showNotifyMessage(t("updatedOrganizationSlug"));
        return true;
      }

      if (response !== undefined) {
        showNotifyMessage(t(updateSlugFailureTranslationKeys[response.reason]));
        return false;
      }

      showNotifyMessage(t("failedToUpdateOrganizationSlug"));
      return false;
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToUpdateOrganizationSlug"));
      return false;
    }
  }

  return {
    deleteOrganization,
    createOrganization,
    updateOrganizationLocalization,
    updateOrganizationSlug,
    addUserOrganizationMapping,
    removeUserOrganizationMapping,
    getOrganizationDetails,
    getOrganizationOptions,
    getOrganizationMembers,
    getOrganizationsByUsername,
  };
}

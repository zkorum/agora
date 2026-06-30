import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  AdminProject,
  AdminProjectOption,
  CreateProjectFailureReason,
  CreateProjectRequest,
  DeleteProjectRequest,
  GetProjectDetailsRequest,
  UpdateProjectLanguageSettingsFailureReason,
  UpdateProjectLanguageSettingsRequest,
  UpdateProjectRequest,
  UpdateProjectSlugRequest,
} from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { useNotify } from "src/utils/ui/notify";

import { api } from "../client";
import { useCommonApi } from "../common";
import {
  type AdministratorProjectApiTranslations,
  administratorProjectApiTranslations,
} from "./project.i18n";

const failureTranslationKeys: Record<
  CreateProjectFailureReason,
  keyof AdministratorProjectApiTranslations
> = {
  unknown_organization_slug: "unknownOrganizationSlug",
  organization_not_listed: "organizationNotListed",
  project_slug_already_exists: "projectSlugAlreadyExists",
  project_conflict: "projectConflict",
  dynamic_translation_entitlement_required:
    "dynamicTranslationEntitlementRequired",
};

const updateProjectLanguageSettingsFailureTranslationKeys: Record<
  UpdateProjectLanguageSettingsFailureReason,
  keyof AdministratorProjectApiTranslations
> = {
  project_not_found: "projectNotFound",
  dynamic_translation_entitlement_required:
    "dynamicTranslationEntitlementRequired",
  missing_manual_project_content_localization:
    "missingManualProjectContentLocalization",
};

export function useBackendAdministratorProjectApi() {
  const { buildEncodedUcan } = useCommonApi();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<AdministratorProjectApiTranslations>(
    administratorProjectApiTranslations
  );

  async function createProject(
    request: CreateProjectRequest
  ): Promise<boolean> {
    try {
      const params = Dto.createProjectRequest.parse(request);
      const url = "/api/v1/administrator/project/create";
      const options = { method: "POST" };
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await api.post(url, params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      if (response.status === 200) {
        const data = Dto.createProjectResponse.parse(response.data);
        if (data.success) {
          showNotifyMessage(t("createdProject"));
          return true;
        }

        showNotifyMessage(
          t(failureTranslationKeys[data.reason], {
            organizationSlugs: data.organizationSlugs?.join(", ") ?? "-",
          })
        );
        return false;
      }

      showNotifyMessage(t("failedToCreateProject"));
      return false;
    } catch (error) {
      console.error(error);
      showNotifyMessage(t("failedToCreateProject"));
      return false;
    }
  }

  async function getProjectOptions(): Promise<AdminProjectOption[]> {
    try {
      const url = "/api/v1/administrator/project/get-project-options";
      const options = { method: "POST" };
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await api.post(
        url,
        {},
        {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        }
      );

      const data = Dto.getProjectOptionsResponse.parse(response.data);
      return data.projectList;
    } catch (error) {
      console.error(error);
      showNotifyMessage(t("failedToFetchProjects"));
      return [];
    }
  }

  async function getProjectDetails(
    request: GetProjectDetailsRequest
  ): Promise<AdminProject | undefined> {
    try {
      const params = Dto.getProjectDetailsRequest.parse(request);
      const url = "/api/v1/administrator/project/get-project-details";
      const options = { method: "POST" };
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await api.post(url, params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const data = Dto.getProjectDetailsResponse.parse(response.data);
      return data.project;
    } catch (error) {
      console.error(error);
      showNotifyMessage(t("failedToFetchProjects"));
      return undefined;
    }
  }

  async function updateProjectLanguageSettings(
    request: UpdateProjectLanguageSettingsRequest
  ): Promise<boolean> {
    try {
      const params = Dto.updateProjectLanguageSettingsRequest.parse(request);
      const url = "/api/v1/administrator/project/language-settings/update";
      const options = { method: "POST" };
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await api.post(url, params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const data = Dto.updateProjectLanguageSettingsResponse.parse(
        response.data
      );
      if (data.success) {
        showNotifyMessage(t("updatedProjectLanguageSettings"));
        return true;
      }

      showNotifyMessage(
        t(updateProjectLanguageSettingsFailureTranslationKeys[data.reason])
      );
      return false;
    } catch (error) {
      console.error(error);
      showNotifyMessage(t("failedToUpdateProjectLanguageSettings"));
      return false;
    }
  }

  async function updateProjectSlug(
    request: UpdateProjectSlugRequest
  ): Promise<boolean> {
    try {
      const params = Dto.updateProjectSlugRequest.parse(request);
      const url = "/api/v1/administrator/project/slug/update";
      const options = { method: "POST" };
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await api.post(url, params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const data = Dto.updateProjectSlugResponse.parse(response.data);
      if (data.success) {
        showNotifyMessage(t("updatedProjectSlug"));
        return true;
      }

      showNotifyMessage(
        t(
          data.reason === "project_not_found"
            ? "projectNotFound"
            : "projectSlugAlreadyExists"
        )
      );
      return false;
    } catch (error) {
      console.error(error);
      showNotifyMessage(t("failedToUpdateProjectSlug"));
      return false;
    }
  }

  async function deleteProject(
    request: DeleteProjectRequest
  ): Promise<boolean> {
    try {
      const params = Dto.deleteProjectRequest.parse(request);
      const url = "/api/v1/administrator/project/delete-project";
      const options = { method: "POST" };
      const encodedUcan = await buildEncodedUcan(url, options);
      await api.post(url, params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      showNotifyMessage(t("deletedProject"));
      return true;
    } catch (error) {
      console.error(error);
      showNotifyMessage(t("failedToDeleteProject"));
      return false;
    }
  }

  async function updateProject(
    request: UpdateProjectRequest
  ): Promise<string | undefined> {
    try {
      const params = Dto.updateProjectRequest.parse(request);
      const url = "/api/v1/administrator/project/update";
      const options = { method: "POST" };
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await api.post(url, params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const data = Dto.updateProjectResponse.parse(response.data);
      if (data.success) {
        showNotifyMessage(t("updatedProject"));
        return data.projectSlug;
      }

      showNotifyMessage(
        t(
          data.reason === "project_not_found"
            ? "projectNotFound"
            : failureTranslationKeys[data.reason],
          { organizationSlugs: data.organizationSlugs?.join(", ") ?? "-" }
        )
      );
      return undefined;
    } catch (error) {
      console.error(error);
      showNotifyMessage(t("failedToUpdateProject"));
      return undefined;
    }
  }

  return {
    deleteProject,
    createProject,
    getProjectDetails,
    getProjectOptions,
    updateProject,
    updateProjectLanguageSettings,
    updateProjectSlug,
  };
}

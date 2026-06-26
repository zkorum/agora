import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  CreateProjectFailureReason,
  CreateProjectRequest,
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
};

export function useBackendAdministratorProjectApi() {
  const { buildEncodedUcan } = useCommonApi();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<AdministratorProjectApiTranslations>(
    administratorProjectApiTranslations
  );

  async function createProject(request: CreateProjectRequest): Promise<boolean> {
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

  return {
    createProject,
  };
}

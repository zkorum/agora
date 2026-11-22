import type { ProjectConversationType } from "#lib/api/agora/projects.js";
import gatheringIcon from "#lib/assets/agora/project-detail/gathering.svg";
import polisIcon from "#lib/assets/agora/project-detail/polis.svg";
import prioritizationIcon from "#lib/assets/agora/project-detail/prioritization.svg";
import * as m from "#lib/paraglide/messages.js";

export const projectConversationOptions = {
  gathering: {
    icon: gatheringIcon,
    label: m.project_detail_gathering,
    shortDescription: m.project_detail_gathering_description,
    description: m.project_workspace_activity_gathering_long,
  },
  polis: {
    icon: polisIcon,
    label: m.project_detail_polis,
    shortDescription: m.project_detail_polis_description,
    description: m.project_workspace_activity_mapping_long,
  },
  prioritizing: {
    icon: prioritizationIcon,
    label: m.project_detail_prioritization,
    shortDescription: m.project_detail_prioritization_description,
    description: m.project_workspace_activity_prioritizing_long,
  },
} satisfies Record<
  ProjectConversationType,
  {
    icon: string;
    label: () => string;
    shortDescription: () => string;
    description: () => string;
  }
>;

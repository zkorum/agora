<template>
  <ListSection v-if="items.length > 0" :settings-item-list="items" />
</template>

<script setup lang="ts">
import ListSection from "src/components/ui-library/ListSection.vue";
import type { Dto } from "src/shared/types/dto";
import type { SettingsInterface } from "src/utils/component/settings/settings";
import { computed } from "vue";
import type { z } from "zod";

const props = defineProps<{
  permissions:
    | z.infer<typeof Dto.getManagementAccessResponse>["permissions"]
    | undefined;
  organizationLabel: string;
  projectLabel: string;
  teamEntitlementsLabel: string;
}>();

const items = computed<SettingsInterface[]>(() => [
  ...(props.permissions?.canManageOrganizations === true ||
  props.permissions?.canCreateOrganizations === true
    ? [
        {
          type: "navigation",
          label: props.organizationLabel,
          to: "/settings/account/administrator/organization/",
          style: "none",
        } satisfies SettingsInterface,
      ]
    : []),
  ...(props.permissions?.canManageProjects === true ||
  props.permissions?.canCreateProjects === true
    ? [
        {
          type: "navigation",
          label: props.projectLabel,
          to: "/settings/account/administrator/project/",
          style: "none",
        } satisfies SettingsInterface,
      ]
    : []),
  ...(props.permissions?.canManagePremiumEntitlements === true
    ? [
        {
          type: "navigation",
          label: props.teamEntitlementsLabel,
          to: "/settings/account/administrator/premium-entitlements/",
          style: "none",
        } satisfies SettingsInterface,
      ]
    : []),
]);
</script>

<template>
  <div class="example-fields">
    <q-select
      v-model="fixture"
      label="Example branding"
      :options="fixtures"
      emit-value
      map-options
      outlined
      :disable="disabled"
    />
    <template v-if="example.fixture === 'project'">
      <q-toggle
        v-model="example.backgroundPicture"
        label="Project background picture"
        :disable="disabled"
      />
      <q-select
        v-model="example.attributions"
        label="Project credits"
        :options="roles"
        multiple
        emit-value
        map-options
        use-chips
        outlined
        :disable="disabled"
      />
      <q-toggle
        v-model="example.attributionLogos"
        label="Logos for project owner, sponsors and partners"
        :disable="disabled || !example.attributions?.length"
      />
    </template>
    <q-toggle
      v-else-if="example.fixture === 'organization'"
      v-model="example.organizationLogo"
      label="Organization logo"
      :disable="disabled"
    />
  </div>
</template>

<script setup lang="ts">
import type { ConversationEmailExample } from "src/shared/branding/emailExamples";
import { computed } from "vue";

defineProps<{ disabled: boolean }>();
const example = defineModel<ConversationEmailExample>({ required: true });
const fixtures = [
  { label: "Project", value: "project" },
  { label: "Organization · no project", value: "organization" },
  { label: "Personal · no project or organization", value: "personal" },
];
const roles = [
  { label: "Project owner", value: "project_owner" },
  { label: "Sponsor", value: "sponsor" },
  { label: "Partner", value: "partner" },
];
const fixture = computed({
  get: () => example.value.fixture,
  set: (value: ConversationEmailExample["fixture"]) => {
    switch (value) {
      case "project":
        example.value = {
          fixture: value,
          backgroundPicture: false,
          attributions: [],
          attributionLogos: false,
        };
        break;
      case "organization":
        example.value = { fixture: value, organizationLogo: false };
        break;
      case "personal":
        example.value = { fixture: value };
        break;
    }
  },
});
</script>

<style scoped lang="scss">
.example-fields {
  display: grid;
  gap: 1rem;
  min-width: 0;
}
</style>

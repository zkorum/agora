<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";

  import ImagePickerFixture from "./image-picker-fixture.svelte";

  const { Story } = defineMeta({
    title: "Shared/Image picker",
    component: ImagePickerFixture,
  });
</script>

<Story name="Default" />
<Story name="Disabled" args={{ disabled: true }} />

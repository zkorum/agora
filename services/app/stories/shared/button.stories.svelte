<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";

  import Button from "$ui/shared/button.svelte";
  import type { ButtonProps } from "$ui/shared/view-types.js";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type WithoutChildren<T> = T extends unknown ? Omit<T, "children"> : never;
  type Args = WithoutChildren<ButtonProps> & {
    label: string;
  };

  const { Story } = defineMeta({
    title: "Shared/Button",
    component: Button,
    render: template,
    args: { label: "Continue", variant: "solid", size: "control" },
    argTypes: {
      variant: {
        control: "select",
        options: [
          "primary",
          "secondary",
          "soft",
          "outline",
          "ghost",
          "solid",
          "neutral",
          "quiet",
          "danger",
          "unstyled",
        ],
      },
      size: {
        control: "select",
        options: ["sm", "md", "lg", "block", "control", "icon"],
      },
    },
  });
</script>

{#snippet template({ label, ...args }: Args)}
  <Button {...args}>{label}</Button>
{/snippet}

{#snippet disabledLink({ label, ...args }: Args)}
  <FixtureState initial={() => 0}>
    {#snippet children({ value: activations, set }: FixtureStateView<number>)}
      <Button
        {...args}
        onclick={() => {
          set(activations + 1);
        }}>{label}</Button
      >
      <output aria-label="Link activations">{activations}</output>
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Solid" />
<Story name="Neutral" args={{ variant: "neutral" }} />
<Story name="Quiet" args={{ variant: "quiet" }} />
<Story name="Danger" args={{ variant: "danger", label: "Remove" }} />
<Story name="Disabled" args={{ disabled: true }} />
<Story name="Landing gradient" args={{ variant: "primary", size: "lg" }} />
<Story
  name="Link"
  args={{ href: "https://agoracitizen.network", label: "Visit Agora" }}
/>
<Story
  name="Disabled link"
  template={disabledLink}
  args={{
    href: "https://agoracitizen.network",
    label: "Visit Agora",
    disabled: true,
  }}
/>

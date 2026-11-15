<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";

  import { author, opinionTexts } from "#lib/mock-data.js";
  import NotificationItem from "$ui/agora/notification-item.svelte";
  import type { NotificationItemProps } from "$ui/agora/view-types.js";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type Args = Omit<NotificationItemProps, "onopen"> & {
    dir?: "ltr" | "rtl";
  };

  const { Story } = defineMeta<
    Snippet<[Args, unknown]>,
    typeof NotificationItem
  >({
    title: "Agora/Notification item",
    component: NotificationItem,
    args: {
      author,
      title: "A new statement is awaiting review",
      conversationTitle: "Where do we agree on better journeys?",
      excerpt: opinionTexts[0],
      time: "2 minutes ago",
      unread: true,
    },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <FixtureState initial={() => args.unread}>
    {#snippet children({ value: unread, set }: FixtureStateView<boolean>)}
      <div {dir} style="max-width: 1000px">
        <NotificationItem
          {...args}
          {unread}
          onopen={() => {
            set(false);
          }}
        />
      </div>
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Unread" {template} />
<Story name="Read" args={{ unread: false }} {template} />
<Story
  name="Long excerpt"
  args={{
    excerpt: Array.from(
      { length: 8 },
      () =>
        "We should make everyday journeys safer and more accessible. The proposed changes include crossings near schools, shade along walking routes and more space for people to meet.",
    ).join("\n\n"),
  }}
  {template}
/>
<Story name="RTL" args={{ dir: "rtl" }} {template} />

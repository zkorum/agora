<script module lang="ts">
  import accountChevron from "#lib/assets/agora/navigation/account-chevron.svg";
  import chevron from "#lib/assets/agora/navigation/chevron.svg";
  import collapse from "#lib/assets/agora/navigation/collapse.svg";
  import expand from "#lib/assets/agora/navigation/expand.svg";
  import explore from "#lib/assets/agora/navigation/explore.svg";
  import folder from "#lib/assets/agora/navigation/folder.svg";
  import history from "#lib/assets/agora/navigation/history.svg";
  import logout from "#lib/assets/agora/navigation/logout.svg";
  import newProject from "#lib/assets/agora/navigation/new-project.svg";
  import notifications from "#lib/assets/agora/navigation/notifications.svg";
  import organizations from "#lib/assets/agora/navigation/organizations.svg";
  import settings from "#lib/assets/agora/navigation/settings.svg";

  const assets = {
    folder: { src: folder, size: 16 },
    history: { src: history, size: 16 },
    explore: { src: explore, size: 16 },
    bell: { src: notifications, size: 16 },
    collapse: { src: collapse, size: 20 },
    expand: { src: expand, size: 20 },
    chevron: { src: chevron, size: 16 },
    account: { src: accountChevron, size: 14 },
    settings: { src: settings, size: 20 },
    organizations: { src: organizations, size: 20 },
    logout: { src: logout, size: 20 },
    plus: { src: newProject, size: 16 },
  } as const;
</script>

<script lang="ts">
  let {
    name,
    dir,
    open = false,
  }: {
    name: keyof typeof assets;
    dir: "ltr" | "rtl";
    open?: boolean;
  } = $props();
  const asset = $derived(assets[name]);
</script>

<img
  data-navigation-icon
  {dir}
  src={asset.src}
  width={asset.size}
  height={asset.size}
  alt=""
  aria-hidden="true"
  class={[
    "block max-w-none shrink-0",
    name === "chevron" && open
      ? "rotate-90"
      : dir === "rtl" &&
        (name === "collapse" || name === "expand" || name === "chevron") &&
        "-scale-x-100",
  ]}
/>

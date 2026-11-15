import type { StorybookConfig } from "@storybook/svelte-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.svelte"],
  addons: [
    "@storybook/addon-svelte-csf",
    {
      name: "@storybook/addon-mcp",
      // Svelte has no component manifest yet; component-test tooling is out of scope.
      options: { toolsets: { dev: true, docs: false, test: false } },
    },
  ],
  framework: {
    name: "@storybook/svelte-vite",
    options: {
      builder: { viteConfigPath: ".storybook/vite.config.ts" },
    },
  },
  core: { disableTelemetry: true },
};

export default config;

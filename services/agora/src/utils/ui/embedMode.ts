import { useRoute } from "vue-router";

export const useEmbedMode = () => {
  const route = useRoute();

  function isEmbeddedMode(): boolean {
    return route.name === "/conversation/[postSlugId].embed";
  }

  return {
    isEmbeddedMode,
  };
};

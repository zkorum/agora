import { useRoute } from "vue-router";

export const useEmbedMode = () => {
  const route = useRoute();

  function isEmbeddedMode(): boolean {
    const name = route.name;
    return (
      typeof name === "string" &&
      name.startsWith("/conversation/[postSlugId].embed")
    );
  }

  return {
    isEmbeddedMode,
  };
};

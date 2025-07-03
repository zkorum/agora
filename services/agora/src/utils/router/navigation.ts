import { useRouter } from "vue-router";

export function useRouterNavigation() {
  const router = useRouter();

  async function openComment(postSlugId: string, commentSlugId: string) {
    await router.push({
      name: "/conversation/[postSlugId]",
      params: { postSlugId: postSlugId },
      query: {
        opinion: commentSlugId,
      },
    });
  }
  // TODO: refactor that, better manage the queryParam
  async function forceOpenComment(postSlugId: string, commentSlugId: string) {
    await router.replace({
      name: "/conversation/[postSlugId]",
      params: { postSlugId: postSlugId },
      query: {
        opinion: commentSlugId,
      },
    });
    window.location.reload();
  }
  // this is to work-around the current way the query param is used...
  return { openComment, forceOpenComment };
}

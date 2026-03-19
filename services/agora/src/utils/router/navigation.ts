import { useRouter } from "vue-router";

export function useRouterNavigation() {
  const router = useRouter();

  async function openComment(postSlugId: string, commentSlugId: string) {
    await router.push({
      name: "/conversation/[postSlugId]/",
      params: { postSlugId: postSlugId },
      query: {
        opinion: commentSlugId,
      },
    });
  }
  return { openComment };
}

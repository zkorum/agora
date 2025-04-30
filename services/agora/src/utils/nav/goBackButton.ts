import { useRouter } from "vue-router";

export function useGoBackButtonHandler() {
  const router = useRouter();

  async function goBack() {
    router.go(-1);
  }

  return { goBack };
}

import { useRouter } from "vue-router";

export function useGoBackButtonHandler() {
  const router = useRouter();

  async function safeNavigateBack() {
    const currentIndex = window.history.length - 1;

    if (currentIndex > 1) {
      router.go(-1);
    } else {
      await router.replace({ name: "/" });
    }
  }

  return {
    safeNavigateBack,
  };
}

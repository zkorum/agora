import { ref, nextTick, onMounted, onUnmounted } from "vue";

export function useElementOverflow() {
  const elementRefs = ref<Record<string, Element>>({});
  const elementsWithOverflow = ref<Record<string, boolean>>({});

  const handleResize = () => void checkAllElementsForOverflow();

  onMounted(() => {
    void checkAllElementsForOverflow();

    window.addEventListener("resize", handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
  });

  function saveElementRef(id: string, el: unknown): void {
    if (el instanceof Element) {
      elementRefs.value[id] = el;
      void checkElementOverflow(id);
    }
  }

  async function checkElementOverflow(id: string) {
    await nextTick(() => {
      const el = elementRefs.value[id];
      if (el) {
        elementsWithOverflow.value[id] = el.scrollHeight > el.clientHeight;
      }
    });
  }

  async function checkAllElementsForOverflow() {
    await nextTick(() => {
      Object.keys(elementRefs.value).forEach((id) => {
        const el = elementRefs.value[id];
        if (el) {
          elementsWithOverflow.value[id] = el.scrollHeight > el.clientHeight;
        }
      });
    });
  }

  function hasOverflow(id: string): boolean {
    return elementsWithOverflow.value[id] || false;
  }

  return {
    saveElementRef,
    hasOverflow,
    checkAllElementsForOverflow,
  };
}

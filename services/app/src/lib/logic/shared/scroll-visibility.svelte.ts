interface CreateScrollVisibilityParams {
  threshold?: number;
}

export function createScrollVisibility({
  threshold = 50,
}: CreateScrollVisibilityParams = {}) {
  let hidden = $state(false);
  let lastScrollY = 0;

  function update(currentScrollY: number) {
    if (currentScrollY < threshold) {
      hidden = false;
    } else {
      hidden = currentScrollY > lastScrollY;
    }
    lastScrollY = currentScrollY;
  }

  return {
    get hidden() {
      return hidden;
    },
    update,
  };
}

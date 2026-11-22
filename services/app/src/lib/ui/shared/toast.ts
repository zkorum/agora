import { toast } from "svelte-sonner";

/** Brief feedback for an outcome that is not already visible in the UI. */
export function showSuccessToast({
  id,
  message,
}: {
  id: string;
  message: string;
}): void {
  toast.success(message, { id });
}

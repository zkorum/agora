import { z } from "zod";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      appearance: "interaction-only";
      size: "flexible";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

const turnstileApiSchema = z.object({
  render: z.function({
    input: z.tuple([z.unknown(), z.unknown()]),
    output: z.unknown(),
  }),
  reset: z.function({ input: z.tuple([z.string()]), output: z.unknown() }),
  remove: z.function({ input: z.tuple([z.string()]), output: z.unknown() }),
});

let loading: Promise<TurnstileApi> | undefined;

function getTurnstile(): TurnstileApi | undefined {
  const result = turnstileApiSchema.safeParse(
    "turnstile" in window ? window.turnstile : undefined
  );
  if (!result.success) return undefined;
  const api = result.data;
  return {
    render: (container, options) =>
      z.string().parse(api.render(container, options)),
    reset: (widgetId) => {
      api.reset(widgetId);
    },
    remove: (widgetId) => {
      api.remove(widgetId);
    },
  };
}

export async function loadTurnstile(): Promise<TurnstileApi> {
  const available = getTurnstile();
  if (available !== undefined) return available;
  if (loading === undefined) {
    loading = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement("script");
      const timeout = setTimeout(() => {
        script.remove();
        reject(new Error("Turnstile timed out while loading"));
      }, 10000);
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => {
        clearTimeout(timeout);
        const api = getTurnstile();
        if (api === undefined) {
          script.remove();
          reject(new Error("Turnstile did not initialize"));
          return;
        }
        resolve(api);
      };
      script.onerror = () => {
        clearTimeout(timeout);
        script.remove();
        reject(new Error("Turnstile could not be loaded"));
      };
      document.head.append(script);
    });
  }
  try {
    return await loading;
  } catch (error) {
    loading = undefined;
    throw error;
  }
}

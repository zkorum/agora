import { isAxiosError } from "axios";
import { z, ZodError } from "zod";

const errorBase = z.object({
  status: z.literal("error"),
  message: z.string(),
  name: z.string(),
});

const apiErrorSchema = z.discriminatedUnion("kind", [
  errorBase.extend({
    kind: z.literal("transport"),
    code: z.string().optional(),
  }),
  errorBase.extend({ kind: z.literal("contract"), code: z.undefined() }),
  errorBase.extend({ kind: z.literal("unexpected"), code: z.undefined() }),
]);

export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;

export function classifyApiError(error: unknown): ApiErrorResponse {
  if (isAxiosError<unknown>(error)) {
    return {
      status: "error",
      kind: "transport",
      message: error.message,
      name: error.name,
      code: error.code,
    };
  }

  // Query functions can throw the normalized error returned by an API wrapper.
  const normalized = apiErrorSchema.safeParse(error);
  if (normalized.success) return normalized.data;

  return {
    status: "error",
    kind: error instanceof ZodError ? "contract" : "unexpected",
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : "UnknownError",
    code: undefined,
  };
}

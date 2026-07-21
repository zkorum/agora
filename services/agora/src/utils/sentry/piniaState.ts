import { z } from "zod";

const pageLayoutSchema = z.object({
  config: z.object({
    addGeneralPadding: z.boolean(),
    addBottomPadding: z.boolean(),
    enableHeader: z.boolean(),
    enableDrawer: z.boolean(),
    enableFooter: z.boolean(),
    reducedWidth: z.boolean(),
  }),
});

const layoutHeaderSchema = z.object({ reveal: z.boolean() });

interface RedactedPiniaState {
  pageLayout?: z.output<typeof pageLayoutSchema>;
  layoutHeader?: z.output<typeof layoutHeaderSchema>;
}

interface PiniaStateAttachment {
  filename: string;
  data: string;
  contentType: "application/json";
}

function parseStore<T>({
  state,
  storeId,
  schema,
}: {
  state: Record<string, unknown>;
  storeId: string;
  schema: z.ZodType<T>;
}): T | undefined {
  try {
    const result = schema.safeParse(state[storeId]);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

export function redactPiniaState(
  state: Record<string, unknown>
): RedactedPiniaState {
  const output: RedactedPiniaState = {};

  const pageLayout = parseStore({
    state,
    storeId: "pageLayout",
    schema: pageLayoutSchema,
  });
  if (pageLayout !== undefined) {
    output.pageLayout = pageLayout;
  }

  const layoutHeader = parseStore({
    state,
    storeId: "layoutHeader",
    schema: layoutHeaderSchema,
  });
  if (layoutHeader !== undefined) {
    output.layoutHeader = layoutHeader;
  }

  return output;
}

export function createPiniaStateAttachment(
  state: Record<string, unknown>
): PiniaStateAttachment {
  return {
    filename: "pinia_state.json",
    data: JSON.stringify(redactPiniaState(state)),
    contentType: "application/json",
  };
}

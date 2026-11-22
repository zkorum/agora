import { z } from "zod";

// Keep encoded images small enough for the tab-local workspace store.
export const projectHeaderBackgroundMaxBytes = 1024 * 1024;

const imageMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
];

export const projectHeaderBackgroundChangeSchema = z.discriminatedUnion(
  "kind",
  [
    z.strictObject({
      kind: z.literal("upload"),
      file: z
        .file()
        .min(1)
        .max(projectHeaderBackgroundMaxBytes)
        .mime(imageMimeTypes),
    }),
    z.strictObject({ kind: z.literal("reset") }),
  ],
);

const imageDataUrl = new RegExp(
  `^data:(?:${imageMimeTypes.join("|")});base64,[A-Za-z0-9+/]+={0,2}$`,
  "u",
);

export const projectHeaderBackgroundImageSrcSchema = z
  .string()
  .max(32 + 4 * Math.ceil(projectHeaderBackgroundMaxBytes / 3))
  .regex(imageDataUrl);

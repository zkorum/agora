import { z } from "zod";

export const zodSlugId = z.string().max(10);

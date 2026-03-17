import { z } from "zod";

export const zodEmail = z.email().max(254);

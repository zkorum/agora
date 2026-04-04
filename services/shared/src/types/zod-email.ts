import { z } from "zod";

export const zodEmail = z.email().max(254);

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

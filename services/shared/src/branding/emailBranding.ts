import { z } from "zod";
import { projectOrganizationAttributionRoleValues } from "../types/project.js";

export const zodEmailAttribution = z
    .object({
        role: z.enum(projectOrganizationAttributionRoleValues),
        displayName: z.string().trim().min(1).max(500),
        imageUrl: z.url().optional(),
        websiteUrl: z.url().optional(),
    })
    .strict();

export const zodEmailBranding = z
    .object({
        name: z.string().trim().min(1).max(500),
        // Older stored snapshots lack this field; render them with a title-only header.
        scopeKind: z.enum(["project", "no-project"]).optional(),
        projectUrl: z.url().optional(),
        imageUrl: z.url().optional(),
        bannerImageUrl: z.url().optional(),
        palette: z.enum(["blue", "purple", "green"]),
        attributions: z
            .array(zodEmailAttribution.readonly())
            .readonly()
            .optional(),
    })
    .strict();

export type EmailBranding = z.infer<typeof zodEmailBranding>;

export const projectBrandPalettes = {
    blue: { start: "#1d4f9f", end: "#6b4eff" },
    purple: { start: "#5538ee", end: "#d8639a" },
    green: { start: "#177a41", end: "#4f92f6" },
} satisfies Record<EmailBranding["palette"], { start: string; end: string }>;

export function getBrandInitials(name: string): string {
    return name
        .trim()
        .split(/\s+/u)
        .slice(0, 3)
        .map((part) => part.at(0) ?? "")
        .join("")
        .toUpperCase();
}

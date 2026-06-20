/** **** WARNING: GENERATED FROM SHARED-APP-API DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
const ORGANIZATION_SLUG_MAX_LENGTH = 65;
const ORGANIZATION_SLUG_FALLBACK_PREFIX = "organization";

export function slugifyOrganizationDisplayName(name: string): string | undefined {
    const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, ORGANIZATION_SLUG_MAX_LENGTH)
        .replace(/-+$/g, "");

    return slug === "" ? undefined : slug;
}

export function createRandomOrganizationSlugFallback(): string {
    const randomPart = Math.random().toString(36).slice(2, 10);
    return `${ORGANIZATION_SLUG_FALLBACK_PREFIX}-${randomPart}`;
}

export function suggestOrganizationSlug(name: string): string {
    return (
        slugifyOrganizationDisplayName(name) ?? createRandomOrganizationSlugFallback()
    );
}

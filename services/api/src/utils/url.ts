import { zodHttpsUrl } from "@/shared/types/zod.js";

export function optionalHttpsUrl(value: string | null): string | undefined {
    if (value === null) {
        return undefined;
    }

    const result = zodHttpsUrl.safeParse(value);
    return result.success ? result.data : undefined;
}

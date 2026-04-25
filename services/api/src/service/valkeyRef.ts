import type { Valkey } from "@/shared-backend/valkey.js";

export interface ValkeyRef {
    current: Valkey | undefined;
}

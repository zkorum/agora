/**
 * Zupass event configuration
 * Now uses shared configuration from services/shared/src/zupass/eventConfig.ts
 * This ensures consistency between frontend proof generation and backend verification
 */

// Re-export from shared configuration
export {
    ZUPASS_EVENT_CONFIG,
    getZupassEventId,
    getZupassEventConfig,
    getZupassSignerPublicKey,
    getZupassCollectionName,
    type ZupassEventConfig
} from "@/shared/zupass/eventConfig.js";

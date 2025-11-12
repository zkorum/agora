import type { EventSlug } from "../types/zod.js";

/**
 * Configuration for Zupass event ticket verification
 * This configuration is shared between frontend (proof generation) and backend (proof verification)
 */
export interface ZupassEventConfig {
    /**
     * User-facing display name for the event
     * @example "Devconnect 2025"
     */
    displayName: string;

    /**
     * Zupass event ID (UUID)
     * This is the eventId field in the ticket POD
     * MUST match the eventId in the proof's membership list tuples
     */
    zupassEventId: string;

    /**
     * Parcnet collection name where tickets are stored in Zupass
     * Used for POD queries and proof generation permissions
     * @example "Devconnect ARG"
     */
    collectionName: string;

    /**
     * EdDSA public key of the ticket issuer (Zupass)
     * Used to verify ticket signatures
     * MUST match the signerPublicKey in the proof's membership list tuples
     */
    signerPublicKey: string;

    /**
     * Optional list of product IDs (ticket types)
     * Currently not used in proof generation (we accept ANY ticket for the event)
     * Kept for potential future use if we want to restrict by ticket type
     */
    productIds?: string[];
}

/**
 * Centralized Zupass event configuration
 * Maps EventSlug to all Zupass-specific values needed for ticket verification
 */
export const ZUPASS_EVENT_CONFIG: Record<EventSlug, ZupassEventConfig> = {
    "devconnect-2025": {
        displayName: "Devconnect 2025",
        // Event ID from Devconnect ARG tickets
        // Verify this matches your actual ticket by checking the eventId field
        zupassEventId: "1f36ddce-e538-4c7a-9f31-6a4b2221ecac",
        // Parcnet collection name
        collectionName: "Devconnect ARG",
        // Zupass signer public key (EdDSA)
        signerPublicKey: "YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs",
        // Product IDs for all Devconnect 2025 ticket types
        // Currently not used in proof generation (we accept any ticket for the event)
        productIds: [
            "13d06437-ff44-46c3-a76d-e7f9a4e00707",
            "29b4eb63-38c1-4264-93ec-c26bf8837f2c",
            "830544f0-57d7-458c-97ac-76931f7fb3b1",
            "9d3e330a-0bfc-46fc-af68-341509186463",
            "12070ec3-0468-48ff-b378-4eac11722ec3",
            "618845a3-57f0-4646-b3a9-39e647b31f62",
            "67123d7a-3063-460d-941e-27b51381083b",
            "49fbd767-78b0-4fee-9712-84575d50f4b2",
            "e09e5009-b42a-4f77-8674-f1f9a5b13d5d",
            "4cf5f1d5-cc26-4bb4-9123-2ce6a504c5e8",
            "bce2e86a-36a3-49d7-929b-b6e659773117",
            "3656f143-c01e-4a99-8f75-bf640ef62ea3",
            "061e6205-101b-4392-bd39-32bd6400e7db",
            "cb3b24d2-b069-441a-ac2f-6a58ab72c788",
            "a9f1f59d-b874-418a-9fc9-ed5608481dab",
            "536a1db6-19d5-4f2d-871e-6a25a4ff9986",
            "79010a91-6505-4086-ba06-378409b90687",
            "8c7b6d43-0f5b-4150-9ded-0d1a5f25d369",
        ],
    },
};

/**
 * Get Zupass event configuration for a given event slug
 * @throws Error if event slug is not configured
 */
export function getZupassEventConfig(eventSlug: EventSlug): ZupassEventConfig {
    return ZUPASS_EVENT_CONFIG[eventSlug];
}

/**
 * Get Zupass event ID for a given event slug
 * @throws Error if event slug is not configured
 */
export function getZupassEventId(eventSlug: EventSlug): string {
    return getZupassEventConfig(eventSlug).zupassEventId;
}

/**
 * Get Zupass signer public key for a given event slug
 * @throws Error if event slug is not configured
 */
export function getZupassSignerPublicKey(eventSlug: EventSlug): string {
    return getZupassEventConfig(eventSlug).signerPublicKey;
}

/**
 * Get Parcnet collection name for a given event slug
 * @throws Error if event slug is not configured
 */
export function getZupassCollectionName(eventSlug: EventSlug): string {
    return getZupassEventConfig(eventSlug).collectionName;
}

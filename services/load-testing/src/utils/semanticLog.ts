export type LoadTestEventOutcome =
    | "start"
    | "success"
    | "failure"
    | "skip"
    | "info"
    | "complete";

export interface LoadTestEvent {
    phase: string;
    action: string;
    outcome: LoadTestEventOutcome;
    userId?: string | undefined;
    iterationIndex?: number | undefined;
    conversationSlugId?: string | undefined;
    opinionSlugId?: string | undefined;
    responseTimeMs?: number | undefined;
    count?: number | undefined;
    error?: string | undefined;
    metadata?: Record<string, string | number | boolean | null>;
}

export function logLoadEvent(event: LoadTestEvent): void {
    console.log(
        `AGORA_LOAD_EVENT ${JSON.stringify({
            schemaVersion: 1,
            timestamp: new Date().toISOString(),
            scenario: "conversation-voting",
            ...event,
        })}`,
    );
}

import { finalizeEvent, verifyEvent } from "nostr-tools/pure";
import type { Relay } from "nostr-tools/relay";
import { log } from "@/app.js";

interface BroadcastProofProps {
    proof: string;
    secretKey: Uint8Array;
    publicKey: string;
    proofChannel40EventId: string;
    relay: Relay;
    defaultRelayUrl: string;
}

export async function broadcastProof({
    proof,
    secretKey,
    publicKey,
    proofChannel40EventId,
    relay,
    defaultRelayUrl,
}: BroadcastProofProps) {
    if (!relay.connected) {
        await relay.connect();
    }
    if (!relay.connected) {
        throw new Error(`Cannot connect to Nostr relay ${relay.url}`);
    }
    const event = finalizeEvent(
        {
            kind: 42,
            created_at: Math.floor(Date.now() / 1000),
            tags: [["e", proofChannel40EventId, defaultRelayUrl, "root"]],
            content: proof,
        },
        secretKey,
    );

    const isGood = verifyEvent(event);
    if (isGood) {
        // let's publish a new event while simultaneously monitoring the relay for it
        relay.subscribe(
            [
                {
                    kinds: [42],
                    authors: [publicKey],
                },
            ],
            {
                onevent(event) {
                    log.info(
                        `Proof successfully sent to ${
                            relay.url
                        }: ${JSON.stringify(event)}`,
                    );
                },
            },
        );
        // this assigns the pubkey, calculates the event id and signs the event in a single step
        const signedEvent = finalizeEvent(event, secretKey);
        await relay.publish(signedEvent);
    } else {
        throw new Error("Error while trying to verify the event");
    }
}

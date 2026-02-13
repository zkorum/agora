# Decentralized Deliberation Standard (DDS)

| Metadata    | Value                                                                                                                                                                                                           |
| :---------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**   | DDS: Verifiable Deliberation on AT Protocol                                                                                                                                                                     |
| **Status**  | Draft                                                                                                                                                                                                           |
| **Created** | 2026-01-13                                                                                                                                                                                                      |
| **Related** | [Privacy Addendum](./0013-privacy-addendum.md), [Implementation Addendum](./0013-implementation-addendum.md), [Background: From ZK-first to AT Protocol](https://whtwnd.com/agoracitizen.network/3meq2b36rw42s) |

## 1. Design Philosophy

The **Decentralized Deliberation Standard (DDS)** is a vendor-neutral protocol for secure, censorship-resistant public deliberation. The protocol leverages **AT Protocol** for transport, **Arweave/Filecoin/Logos Storage** for archival, and **Ethereum** for verification.

DDS is organized around **four design tensions**:

| Tension                                | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ownership vs Convenience**           | Sovereignty requires users to control their cryptographic keys — but requiring hardware wallets or self-hosted infrastructure creates friction that prevents adoption. We need real ownership with a familiar login experience.                                                                                                                                                                                                                                                                                                                                |
| **Discoverability vs Durability**      | Pure P2P protocols (Logos Messaging (formerly Waku), Nostr) provide censorship-resistant storage and messaging, but struggle at scale with: real-time performance, message ordering and conflict resolution, complex queries and search, moderation, and mobile/resource-constrained devices. Federated protocols solve these but introduce provider dependency. We need the UX of federation with the durability guarantees of P2P.                                                                                                                           |
| **Provable vs Economical Computation** | Running clustering analysis (PCA, Reddwarf) requires significant data access, compute, and infrastructure. Asking every user to replicate this pipeline is impractical — but trusting a single provider's results without verification undermines the system.                                                                                                                                                                                                                                                                                                  |
| **Autonomy vs Interoperability**       | Self-hosted systems give full autonomy but are siloed — you can define any data model, but you can't leverage other teams' distributed components. Standardized schemas over a shared transport enable separation of concerns: distinct building blocks (Plan, Collect, Analyze) built by different teams that compose permissionlessly. This solves hard problems of data communication at scale that pure self-hosted models cannot. Data privacy (secret content) is niche for a public deliberation standard; participant anonymity is a separate concern. |

When in doubt, we optimize for **usability without sacrificing walkaway capability** — the guarantee that if all providers vanish, users retain sovereign control of their cryptographic identity and can recover their data from decentralized archives.

## 2. Architecture Overview

```mermaid
flowchart TB
    subgraph User["User Layer"]
        Discover[Discover via AppView]
        Participate[Participate via PDS]
        Verify[Verify on-chain]
    end

    subgraph Transport["Transport Layer (hot path) — AT Protocol"]
        PDS["PDS<br/>did:plc • Encrypted Vault • OAuth"]
        Firehose["Firehose<br/>Permissionless indexing"]
        AppView["AppViews<br/>SQL search • SSE notifications"]
        PDS --> Firehose --> AppView
    end

    subgraph Archive["Archive Layer (cold path) — Arweave/Filecoin/Logos Storage"]
        ArchiveAgents["Archive Agents<br/>Pin org.dds.* records"]
    end

    subgraph Verification["Verification Layer — Ethereum"]
        Truth["Verification<br/>On-chain proofs • Dispute resolution"]
    end

    subgraph Analyzer["Analyzer Agents"]
        Compute["Read Firehose → Run clustering → Publish results"]
    end

    User --> Transport
    Firehose -->|archival| Archive
    Firehose -->|analysis| Analyzer
    Analyzer -->|commit hash| Verification
    Archive -->|recovery| PDS
```

## 3. Ownership vs Convenience

> **The Walkaway Test**: If all providers vanish, users retain sovereign control of their cryptographic identity and can recover their data from decentralized archives. DDS is designed to pass this test — users control their `did:plc` Rotation Keys (not just Signing Keys), data is archived to censorship-resistant storage, and recovery is possible from any device with the right credentials.
>
> **Why AT Protocol here**: `did:plc` provides portable identity with separate Signing Keys (convenience — PDS manages posting) and Rotation Keys (ownership — user controls migration). Nostr ties identity to a single keypair with no recovery or migration. Logos Messaging has no identity layer. This separation lets us build the Encrypted Key Vault: sovereignty without requiring users to manage keys directly.

### 3.1 Flexible Authentication

DDS defines a shared authentication interface, not a fixed set of identity methods. Any app can accept any credential type — the protocol standardizes how credentials are represented and shared across tools, not which credentials are valid.

The spectrum ranges from simple auth to cryptographic proofs:

- **Simple authentication** — Email, phone, social login. A way to connect to the PDS. No cryptographic binding to a real-world attribute.
- **Cryptographic proofs** — ZK passport, ZKPass, Zupass event tickets, W3C Verifiable Credentials, eIDAS eWallets, wallet signatures. Two-way binding with verifiable properties (e.g., "is a citizen," "holds an event ticket," "is over 18").

Apps choose which credential types to accept for each deliberation. Users range from self-hosted (own PDS) to lightweight guests (ephemeral `did:key`). What matters is that every participant has a DID and can attach credentials from any accepted method.

> **On guest identity**: The spectrum from self-hosted PDS to lightweight guest raises an open design question. Provisioning a full `did:plc` (with PLC directory registration, PDS account, and repository) is appropriate for committed users but heavyweight for ephemeral participants — a conference attendee who votes once via a Zupass ticket, or with no verification at all, or data imported from an external tool. Whether guests should use managed `did:plc` (full AT Protocol compatibility, simpler moderation, but infrastructure overhead) or `did:key` "soft accounts" within the data (lightweight, supports per-conversation anonymity, but second-class in the ecosystem) is an active design question. Both approaches require a merge/upgrade mechanism when a guest becomes a permanent user. This is a problem worth solving at the AT Protocol level — not just for DDS. See [Implementation Addendum §5](./0013-implementation-addendum.md#5-guest-identity-and-account-upgrade).

### 3.2 Shared Organizations

Organizations — teams, DAOs, communities, coalitions — are defined at the protocol level via base lexicons (`org.dds.org.*`). Membership, roles, and permissions are readable by any tool on the Firehose. An org created in one app is visible to every other app — no bilateral integration needed.

This enables cross-tool workflows: a community platform manages membership, a deliberation tool checks eligibility, a voting app enforces access rights — all reading the same org records.

### 3.3 The Encrypted Key Vault

While the PDS manages _posting_ (Signing Keys), the user must retain control over _identity_ (Rotation Keys). If the PDS disappears or turns malicious, the user could be locked out without their Recovery Key.

The **Encrypted Key Vault** solves this: the user's Rotation Key is encrypted and stored in their Repository. Since Repositories are archived to decentralized storage (Section 4.2), the vault is recoverable even if the PDS vanishes. Two vault designs are proposed — one wallet-derived, one device-based — detailed in the [Implementation Addendum](./0013-implementation-addendum.md).

## 4. Discoverability vs Durability

### 4.1 The Hybrid Architecture

We considered three protocol families for the transport layer:

- **AT Protocol** (Bluesky): Federated, server-based. PDSes host data, Firehose enables permissionless indexing, Lexicons provide semantic schemas.
- **Logos Messaging** (Status, formerly Waku): P2P gossip messaging. Censorship-resistant relay network, strong privacy properties via P2P gossip, ephemeral by design, no guaranteed ordering.
- **Nostr**: Relay-based pubsub. Simple keypair identity, privacy-friendly via Tor-compatible relay architecture, informal event-kind taxonomy, no formal schema system, no identity migration.

We respect Logos Messaging and Nostr — their work on censorship-resistant infrastructure is foundational. However, for **public deliberation at scale**, pure P2P and relay-based protocols face fundamental challenges:

| Challenge                   | Nostr / Logos Messaging                                                                                                                             | AT Protocol                                                                                                                                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data availability**       | Nostr: relay-dependent, no completeness guarantee. Logos: messages expire, limited retention                                                        | Always-on PDS servers, persistent repositories                                                                                                                                                                                                             |
| **Performance**             | Nostr: fast for simple relay queries. Logos: P2P overhead, impractical on mobile                                                                    | Standard HTTPS, millisecond response                                                                                                                                                                                                                       |
| **Message ordering**        | Nostr: last-write-wins with known race conditions. Logos: no guaranteed ordering                                                                    | Server-side total ordering within each repository                                                                                                                                                                                                          |
| **Conflict resolution**     | Nostr: replaceable events but no merge semantics — concurrent edits silently overwrite. Logos: none                                                 | Server-authoritative within each PDS                                                                                                                                                                                                                       |
| **Search & discovery**      | Nostr: search exists via specialized relays, but fragmented — no complete index. Logos: no discovery                                                | Firehose enables permissionless indexing, SQL-backed AppViews                                                                                                                                                                                              |
| **Complex queries**         | Nostr: third-party compute services exist but no standardized query API. Logos: basic message filtering only                                        | AppViews provide precomputed query results with standardized APIs                                                                                                                                                                                          |
| **Schema**                  | Nostr: event kinds are functional but convention-based — no machine-readable validation. Logos: application-defined content types, no shared schema | Lexicons provide formal, machine-enforceable, versionable schemas                                                                                                                                                                                          |
| **Moderation**              | Nostr: labeling and reporting exist but are advisory-only — no enforcement infrastructure. Logos: rate-limiting for spam, no content moderation     | Labelers with standardized APIs, stackable moderation, speech/reach separation                                                                                                                                                                             |
| **Mobile**                  | Nostr: lightweight clients possible. Logos: too resource-heavy                                                                                      | Standard web clients, thin mobile apps                                                                                                                                                                                                                     |
| **Composable architecture** | Nostr: third-party services exist but each sees a partial network view. Logos: limited ecosystem                                                    | Pluggable and composable: base components (AppViews, Labelers, Feed Generators) connect to a complete Firehose, and new components can be built on top of them (e.g., an Analyzer built on the Feed Generator pattern) — any team builds, any user chooses |

These protocols solve real problems — Nostr's ecosystem of relays and third-party services is a genuine innovation, and Logos Messaging's cryptographic spam protection is technically impressive. But for deliberation at scale, the pattern is consistent: AT Protocol provides each capability as protocol-level infrastructure with standardized APIs and a complete data stream, while alternatives solve them through emergent, application-level mechanisms where each service sees a partial view and each client integrates differently. Building a multi-app deliberation ecosystem on these patterns would require reinventing much of what AT Protocol already provides.

Where Nostr and Logos Messaging genuinely excel is **anonymity-first applications**. Nostr's client-relay architecture enables routing through Tor and mixnets. Logos Messaging's P2P gossip means no server ever knows a user's identity. For applications requiring deep anonymity — ZK-anonymous voting, whistleblower platforms, censorship-resistant communication under authoritarian regimes — these protocols are the right foundation. Privacy _can_ be implemented on AT Protocol, but the PDS pattern is an anti-pattern for strong ZK-anonymity: the server inherently knows the user's identity, so anonymity requires workarounds rather than flowing naturally from the architecture. On Nostr and Logos Messaging, anonymity feels native. DDS does not optimize for this. Our earlier work on [Racine](https://github.com/zkorum/racine) (a ZK-first meta-protocol compatible with Logos Messaging (then called Waku), Nostr, and AT Protocol) taught us that while ZK anonymous identity is technically superior for privacy, it doesn't match how users actually adopt products — they want familiar identifiers (email, phone, social login), not cryptographic key management. DDS is designed for **public** deliberation, where transparency and verifiability are the point. Participant anonymity where needed is handled at the identity layer (ZK proofs for eligibility without revealing identity), not at the transport layer.

A related trade-off is **ephemeral identity**. On Nostr, a guest generates a keypair and participates — no server infrastructure required. On Logos Messaging, messages are P2P with no identity overhead. On AT Protocol, even a managed guest account involves PLC directory registration and PDS provisioning. For ticket-gated deliberations where participants need per-conversation unlinkability (ZK nullifiers ensure one-person-one-vote per context), a persistent `did:plc` is fundamentally the wrong identifier — it's linkable across conversations by design. This is the most significant practical trade-off of building on AT Protocol: the same PDS infrastructure that provides moderation, schema enforcement, and a complete Firehose also makes throwaway identities more expensive. DDS needs a "Guest Mode" that works within AT Protocol's architecture while supporting both persistent pseudonymous accounts and per-conversation ephemeral identities. See [Implementation Addendum §5](./0013-implementation-addendum.md#5-guest-identity-and-account-upgrade) for the design exploration.

**Our Hybrid**: AT Protocol for the hot path (discovery, search, real-time interaction), Arweave/Filecoin/Logos Storage for the cold path (archival, walkaway recovery), Ethereum for the commitment layer (result hashes for tamper-evidence, and future verification proofs for computation correctness). Each layer uses the protocol best suited to its role — no single system needs to do everything.

### 4.2 Network Archival

- **Role**: Archive Agents listen to the Firehose for `org.dds.*` commits.
- **Action**: Pin Repository updates to Arweave/Filecoin/Logos Storage.
- **Keys in Repo**: Since `org.dds.key.wrapped` is in the Repository, it's automatically archived.
- **Result**: Even if Agora vanishes, User's Identity (PLC Directory) and Vault (decentralized storage) are recoverable.

### 4.3 Local Resilience

- **Cache**: Client mirrors the Encrypted Vault Blob to `IndexedDB`.
- **Export**: Users can perform "On-Demand Export" (decrypt in memory) to download CAR file + unlocked keys.

## 5. Provable vs Economical Computation

> **Draft**: The Analyzer Protocol and trust levels below are conceptual. The on-chain verification layer requires significant research into feasibility, gas costs, and proof system selection. This tension is protocol-agnostic — verifiable computation works regardless of the underlying transport layer.

### 5.1 The Cost Problem

Running clustering analysis (PCA, Reddwarf) requires:

- **Data access**: Reading all votes/opinions from the Firehose for a given conversation
- **Compute**: Running matrix decomposition and clustering algorithms
- **Infrastructure**: Maintaining servers to process conversations continuously

For a single user to verify results independently, they'd need to replicate this entire pipeline. This is impractical at scale — most users lack both the infrastructure and the expertise.

### 5.2 The Analyzer Protocol

DDS solves this by separating **computation** from **verification**:

**Agent Protocol**:

1. **Input**: Agent defines a "Scope" (Conversation ID + Time Window).
2. **Process**: Agent reads all Repositories from the Firehose matching the Scope.
3. **Compute**: Runs PCA/Clustering (e.g., Reddwarf).
4. **Output**: Publishes `org.dds.result.pca`.

Because inputs (votes on the Firehose) and algorithm (open-source) are public, **anyone can re-run the computation to verify an Analyzer's results**. This makes the system auditable without requiring every user to run their own analyzer.

### 5.3 Trust Levels

| Level          | Mechanism                                                                           | Cost                     | Guarantee                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Reputation** | Analyzer publishes results to Firehose                                               | Free for users           | Trust the Analyzer's reputation                                                                                                            |
| **Spot check** | Any party re-runs computation independently                                         | Moderate (compute costs) | Deterministic verification                                                                                                                 |
| **Trustless**  | Analyzer submits proof on-chain; clients verify cheaply (e.g., ZK proof verification) | Gas fees               | Cryptographic proof — no trust required (see [Implementation Addendum §4.1](./0013-implementation-addendum.md#41-fraud-proving-mechanism)) |

### 5.4 Result Commitment

> **Draft**: The result commitment protocol below is a first proposal. Smart contract design, chain selection (L1 vs L2), and gas optimization need further specification.

The trust levels above address **computation correctness** — is the Analyzer's output honest? A separate concern is **result permanence** — can an Analyzer silently modify or retract published results after the fact?

DDS addresses this with **on-chain result commitment**: when a consultation finishes, a cryptographic hash of the result is committed to Ethereum (or an L2). This makes results tamper-evident and permanently anchored, independent of any single operator. The commitment can be made by the Analyzer that computed the result, the Organizer that created the consultation, or any other party — the protocol defines the commitment format, not who commits.

**What gets committed:**

| Field            | Content                                                |
| ---------------- | ------------------------------------------------------ |
| Conversation URI | AT Protocol reference to the deliberation process      |
| Scope            | Time window of the analysis                            |
| Input hash       | Merkle root of all votes/opinions included             |
| Algorithm        | Identifier + version (e.g., `reddwarf@2.1.0`)         |
| Output hash      | Hash of the published `org.dds.result.pca` record      |
| Analyzer DID     | Identity of the computing agent                        |

**Verification**: Anyone downloads the inputs from the Firehose (public), re-runs the algorithm (open-source), and compares the result hash against the on-chain commitment. No ZK proofs required — just deterministic re-execution.

**Relationship to trust levels:**
- Result commitment **enhances Spot Check**: the on-chain hash makes tampering detectable without requiring re-computation upfront — you only re-run if the hash doesn't match.
- The **Trustless** level (ZK proof of computation correctness without re-execution) remains future work.

**Analogy**: This mirrors [Vocdoni](https://vocdoni.io/)'s architecture, where raw votes live on the Vochain (their custom L2) and final results are notarized on Ethereum. In DDS, AT Protocol is the data layer (analogous to Vochain) and Ethereum is the commitment layer. The key difference: DDS doesn't need a custom blockchain — AT Protocol's Firehose already provides a complete, ordered data stream.

See [Implementation Addendum §6](./0013-implementation-addendum.md#6-result-commitment-protocol) for protocol details.

## 6. Autonomy vs Interoperability

> **Why AT Protocol here**: Nostr's event kinds and Logos Messaging's content types enable interoperability, but through convention rather than enforceable schemas. AT Protocol's Lexicons are machine-readable and PDS-enforced — data that doesn't match the schema is rejected, not silently malformed. Combined with the Firehose, this means any team can read any other team's records with confidence in data shape, enabling true separation of concerns across the Plan → Collect → Analyze → Execute lifecycle.
>
> **Public by default**: DDS is designed for **public** deliberation. All `org.dds.*` records are published to the Firehose in plaintext. This is by design — transparency, verifiability, and interoperability require open data. The goal is not just interoperability between Polis-like tools, but across **all** governance and collective intelligence solutions — voting apps, DAO governance, participatory budgeting, and tools that don't exist yet. Open data on a shared transport enables an ecosystem that siloed, self-hosted systems cannot. Moreover, AT Protocol's existing social graph — with public figures maintaining official Bluesky accounts — means that their public posts can be imported as deliberation inputs. "How do public personalities think about X?" becomes a query over AT Protocol data, giving deliberation platforms access to a live stream of attributed public discourse.
>
> **On self-hosting**: DDS preserves walkaway capability — any user _can_ self-host their PDS. But self-hosting is not on the roadmap as a deployment priority. The protocol's value comes from interoperability across a shared network. Ironically, self-hosting also hurts privacy (see [Privacy Addendum §5](./0013-privacy-addendum.md#5-self-hosted-pds-sovereignty--privacy)).
>
> **On private conversations**: AT Protocol is actively working on private data support via end-to-end encryption (Signal model). When available, DDS could support private or restricted deliberations — but this is a long-term goal, not the initial focus. Most deliberation is public and benefits from transparency. Participant anonymity (hiding _who_ said what) is a separate concern not tied to data encryption. See [Privacy Addendum](./0013-privacy-addendum.md) for deeper analysis.

### 6.1 The Deliberation Lifecycle

DDS organizes deliberation into four phases, each potentially handled by different applications:

This lifecycle is intentionally general. It serves formal governance (a city running participatory budgeting, a DAO voting on treasury allocation), community self-organization (an open-source project shaping its roadmap, a co-op making collective decisions), and bottom-up movements that channel protest energy into concrete proposals—going from "revolution" to "constitution." The process can be a single open discussion or a multi-step pipeline with eligibility rules, multiple rounds, and binding votes.

| Phase       | Purpose                                                                                                                    | Example Apps                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Plan**    | Design the deliberation process: define steps (e.g., open discussion, consultation, vote), set eligibility, import context | Community platforms, grassroots organizers, governance tools |
| **Collect** | Gather participant input: opinions, votes, comments                                                                        | Deliberation platforms, voting apps                          |
| **Analyze** | Process data and derive insights: clustering, summaries, consensus                                                         | Analyzer Agents, analysis dashboards                         |
| **Execute** | Act on analysis: run binding votes, implement decisions                                                                    | Voting apps, governance tools, DAOs                          |

Applications specialize in one or more phases, but **interoperate via shared lexicons**. Any organizing app—a community platform, a DAO, a grassroots coalition—can orchestrate a full cycle: plan with its own UI, collect via a deliberation platform, analyze via an Analyzer, then act on results.

```mermaid
sequenceDiagram
    participant Org as Organizer
    participant Delib as Deliberation Platform
    participant Analyzer as Analyzer Agent
    participant Vote as Voting App

    Note over Org: PLAN PHASE
    Org->>Delib: Create deliberation process<br/>(org.dds.process)

    Note over Delib: COLLECT PHASE
    Delib->>Delib: Gather opinions<br/>(org.dds.module.polis.opinion)
    Delib->>Delib: Record reactions<br/>(org.dds.module.polis.vote)

    Note over Analyzer: ANALYZE PHASE
    Analyzer->>Delib: Read via Firehose
    Analyzer->>Analyzer: Run clustering
    Analyzer->>Analyzer: Publish result<br/>(org.dds.result.pca)

    Note over Vote: EXECUTE PHASE
    Vote->>Analyzer: Reference analysis<br/>(org.dds.ref.analysis)
    Vote->>Vote: Configure options from<br/>cluster consensus
    Vote->>Vote: Run token vote<br/>(org.dds.module.vote)

    Note over Org: DECISION
    Org->>Vote: Read vote result
    Org->>Org: Act on results
```

### 6.2 Layered Lexicons

DDS uses a layered lexicon design enabling permissionless interoperability:

```
┌────────────────────────────────────────────────────────┐
│                   PRODUCT LEXICONS                      │
│  (Domain-specific, owned by each app)                  │
│                                                        │
│  org.dds.module.polis  - Deliberation (opinions, votes)│
│  org.dds.module.vote   - Voting (token, quadratic)     │
│  org.dds.result.pca    - Clustering analysis           │
│  org.dds.result.*      - Other analysis outputs        │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│                    BASE LEXICONS                        │
│  (Shared primitives, used by all apps)                 │
│                                                        │
│  org.dds.identity.*   - DID profiles, verification     │
│  org.dds.auth.*       - Permissions, capabilities      │
│  org.dds.org.*        - Organizations, DAOs, groups    │
│  org.dds.ref.*        - Cross-app references           │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│                  AT PROTOCOL BASE                       │
│  com.atproto.*, app.bsky.*                             │
└────────────────────────────────────────────────────────┘
```

**Base Lexicons** (shared by all apps):

- `org.dds.identity.*` — DID profiles, verification status
- `org.dds.auth.*` — Capabilities, permissions, delegation
- `org.dds.org.*` — Organizations, DAOs, membership
- `org.dds.ref.*` — Cross-app references (point to records in other namespaces)

**Product Lexicons** (owned by each app):

- `org.dds.module.polis` — Deliberation format (opinions, votes)
- `org.dds.module.vote` — Generic voting (token-weighted, quadratic, etc.)
- `org.dds.result.pca` — Clustering analysis outputs

### 6.3 Modular Inputs

DDS supports any deliberation type via pluggable modules.

**`org.dds.module.polis` (Agora)**:

- **Opinion**: `{ text: string }`
- **Vote**: `{ targetCid: string, value: -1|0|1 }`

Other product lexicons follow the same pattern, each defining their own record types.

### 6.4 Cross-App Interoperability

Any app can **read** another app's product lexicons via the Firehose. The `org.dds.ref.*` lexicon enables explicit references:

```typescript
// A voting app references a deliberation platform's analysis
{
  "$type": "org.dds.module.vote.proposal",
  "title": "Fund Proposal Alpha",
  "context": {
    "$type": "org.dds.ref.analysis",
    "uri": "at://did:plc:abc.../org.dds.result.pca/xyz",
    "cid": "bafyrei..."
  },
  "options": [
    { "label": "Approve", "derivedFrom": "cluster-1-consensus" },
    { "label": "Reject", "derivedFrom": "cluster-2-consensus" }
  ]
}
```

**Common Patterns:**

| Pattern                 | Description                                         |
| ----------------------- | --------------------------------------------------- |
| **Sequential Handoff**  | Deliberation → Analysis → Voting → Execution        |
| **Parallel Collection** | Multiple collection apps feed the same analysis     |
| **Context Import**      | New process imports conclusions from a previous one |

## 7. Implementation Details

The cryptographic mechanisms (Encrypted Key Vault, Sign-to-Derive, Device Graph), Ethereum verification layer, and security considerations are detailed in a separate [implementation addendum](./0013-implementation-addendum.md). These are preliminary designs requiring further investigation — they represent directional intent, not finalized specifications.

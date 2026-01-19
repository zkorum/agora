# RFC 0013: Decentralized Deliberation Standard (DDS)

| Metadata       | Value                                       |
| :------------- | :------------------------------------------ |
| **RFC ID**     | 0013                                        |
| **Title**      | DDS: Verifiable Deliberation on AT Protocol |
| **Status**     | Draft                                       |
| **Created**    | 2026-01-13                                  |
| **Supersedes** | RFC-0012, RFC-0005                          |

## Abstract

This RFC defines the **Decentralized Deliberation Standard (DDS)**, a vendor-neutral protocol for secure, censorship-resistant and highly interoperable public consultation.

DDS leverages the **AT Protocol** for transport, standardizing on the **Personal Data Server (PDS)** as the fundamental unit of participation. It unifies all users (Guest, Email, Wallet, ZKPass) under a standard PDS model using OAuth for authentication and PDS-managed signing for interaction.

To ensure sovereignty for users on managed infrastructure, DDS introduces the **Encrypted Key Vault**: a cryptographic pattern that guarantees users can retrieve their `did:plc` Rotation Keys and "walk away" to a self-hosted provider at any time, effectively passing the "Walkaway Test" without burdening the user with client-side signing complexity (wallet management) or self-hosting the PDS.

## 1. Core Philosophy

1. **Identity is Sovereign**: Every user has a portable `did:plc`. The cryptographic root of control (Rotation Key) belongs to the user, not the provider.
2. **Infrastructure is Commoditized**: The PDS is a utility. If a provider acts maliciously, the user can rotate their DID to a new provider without losing their social graph or history.
3. **Math is Verifiable**: We do not trust the server that provide the algorithmic analysis. We trust the **Prover**. Analysis Agents publish results with cryptographic proofs that can eventually be challenged on-chain.
4. **Censorship-resistance**: Users can retrieve their identity and data even if infrastructure disappears. DDS passes Vitalik Buterin's "Walkaway Test": if all providers vanish, users retain sovereign control of their cryptographic identity and can recover their data from decentralized archives.
5. **Interoperability is Standard**: Semantic schemas (Lexicons) enable ecosystem-wide integration without gatekeepers. Multiple analysis tools, moderation systems, and client applications can work with the same data using vendor-neutral formats.
6. **Simplicity**: Reusing existing battle-proven infrastructure and protocols as much as possible.
7. **Familiar UX**: Highly-available, high-performance application, with support for in-app notifications, fast search, web2-friendly login etc.
8. **Web3-native**: Web3 native users can cryptographically bind their Wallet to their PDS to interact directly the protocol .

## 2. Architecture: The Unified PDS Model

DDS standardizes on the **Personal Data Server (PDS)** for all participants.

### 2.1 The Hosting Tiers

To balance **Ease of Access** with **Sovereignty**, we support a spectrum of account types. Note that a single Managed PDS instance is designed to be multi-tenant, capable of hosting thousands of Guest accounts efficiently (similar to standard Bluesky PDS architecture).

1. **Self-Hosted (Tier 2)**: The user brings their own PDS (e.g., standard Bluesky account or self-hosted one). They authenticate directly.
2. **Managed (Tier 1)**: The user authenticates via a Web2/Web3 method (Email, Phone, Wallet, ZKPass), and the application **auto-provisions** a PDS account for them.
3. **Anonymous (Tier 0)**: A "Guest" user who has not yet verified an identifier. They are provisioned a lightweight PDS account authenticated by a local `did:key` (acting as a session token).

### 2.2 Standard Authentication

All tiers use standard **AT Protocol OAuth**.

- **Signing:** The PDS manages the **Signing Key** (`app.bsky.actor.defs`) and signs posts/votes on behalf of the user.
- **Benefit:** This simplifies the client architecture (no local signing state for posts) and ensures compatibility with standard AT Proto clients.
- **Trade-off:** While full OAuth may be considered "bloated" for ephemeral Guest users (where simple key-based proving might suffice), we retain it to ensure a **unified authentication path** for all user tiers, simplifying the overall codebase.

## 3. The Sovereign Vault (Identity Ownership)

While the PDS manages _Posting_ (Signing Keys), the User must retain control over _Identity_ (Rotation Keys). We achieve this via the **Encrypted Key Vault**.

### 3.1 The Risk

In a Managed model, if the PDS disappears or turns malicious, the user could be locked out. They need the **Recovery Key** (Rotation Key) to move their DID.

### 3.2 Type A: The Deterministic Vault (Wallet Login)

For users logging in with an Ethereum Wallet, we implement the **"Sign-to-Derive"** pattern (pioneered by Fileverse.io):

1. **Generation**: The client generates a random **Recovery Key** (`did:plc` rotation key).
2. **Derivation**: The user signs a deterministic, domain-bound message.
   - **Algorithm**: The signature is used as the entropy seed for **HKDF-SHA256** to derive a symmetric **AES-GCM Key**.
   - **Reference**: This mirrors the architecture of `@fileverse/crypto` (specifically [`src/ecies/core.ts`](https://github.com/fileverse/fileverse-cryptography/blob/main/src/ecies/core.ts)), utilizing standard libraries (`@noble/ciphers`, `@noble/hashes`) for client-side ECIES encryption rather than wallet-specific `eth_decrypt` (which has poor mobile support).
3. **Storage**: The Recovery Key is encrypted with this AES Key. The ciphertext is stored in the Repository (`org.dds.key.wrapped`).
4. **Recovery**: User can recover their identity from _any_ device by connecting their wallet and re-signing the challenge.

### 3.3 Type B: The Device Vault (Email/Phone/Guest)

For users without a global key (Wallet):

1. **Mechanism**: We use a **Device Graph**. Each device has a local `did:key` (Exchange Key used for encryption)
2. **The Master Secret**: A random Symmetric Key ($K_{account}$) that will encrypt the user's PDS's Recovery Key.
3. **The Lockbox**: $K_{account}$ is encrypted for each device's Exchange Key and stored in the Repository.
4. **Device Sync (Detailed)**:
   - **Device B (New)**: Generates a local `did:key` and displays its Public Key via QR Code.
   - **Device A (Existing)**: Scans the QR Code, validates the fingerprint (MITM protection), and encrypts the Master Secret ($K_{account}$) specifically for Device B's Public Key.
   - **Transport**: Device A uploads this **"Lockbox"** to the PDS. Device B downloads it, decrypts $K_{account}$, and can now access the global **Encrypted Vault Blob**.
5. **Security**: **QR Code Verification** is MANDATORY for device linking to prevent Server MITM attacks.
   - _Note_: If a PDS is known to be malicious, the user should not attempt to sync new devices. Instead, the existing device should decrypt the `Recovery Key` and execute a **Migration (Walkaway)** to a new provider immediately.

### 3.4 Core Concepts & Definitions

| Feature       | **Lockbox (Device Sync)**                                                                   | **Migration (Walkaway)**                                                                                              |
| :------------ | :------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------- |
| **Purpose**   | To **add a new device** to your existing account.                                           | To **escape a malicious/failed PDS** and move your identity elsewhere.                                                |
| **Mechanism** | Device A encrypts the account secret ($K_{account}$) for Device B and stores it on the PDS. | You take your **Rotation Key** (decrypted from the vault) and update your `did:plc` document to point to a _new_ PDS. |
| **Trust**     | **Requires PDS cooperation.** The PDS must accept and serve the "Lockbox" file.             | **Sovereign.** Does _not_ require PDS cooperation.                                                                    |

- **Encrypted Vault Blob** (`org.dds.key.wrapped`): The user's Identity Root (Rotation Key), encrypted at rest by the Master Secret ($K_{account}$). It is the "Sovereign Backup" and is **identical** across all devices.
- **Lockbox**: A temporary delivery container. It contains the Master Secret ($K_{account}$) encrypted specifically for a _target device's_ public key.

## 4. Modular Inputs (Lexicons)

DDS supports any deliberation type via pluggable modules.

### 4.1 `org.dds.module.polis` (Agora)

- **Opinion**: `{ text: string }`
- **Vote**: `{ targetCid: string, value: -1|0|1 }`

### 4.2 other lexicons specific to different product features related to the deliberation process

TODO

## 5. Verifiable Analysis (The Prover)

### 5.1 The Agent Protocol

1. **Input**: Agent defines a "Scope" (Conversation ID + Time Window).
2. **Process**: Agent reads all Repositories from the Firehose matching the Scope.
3. **Compute**: Runs PCA/Clustering (e.g., Reddwarf).
4. **Output**: Publishes `org.dds.result.pca`.

### 5.2 The "Hard Trust" Upgrade

The Agent acts as an Oracle, submitting `Hash(Result)` to a Smart Contract for fraud proving.

> **OPEN ISSUE**: "Fraud Proving" in the traditional sense (on-chain re-execution) is likely infeasible for heavy clustering algorithms (PCA) on standard EVM chains. This mechanism requires further definition, such as using **Zero-Knowledge Machine Learning (ZK-ML)** proofs or an **Optimistic Dispute Game** where a committee of human arbiters can run the code off-chain to resolve disputes.

## 6. Decentralized Availability Strategy

To pass the "Walkaway Test" when the PDS is down:

### 6.1 Network Level: Targeted Archival

- **Role**: Archive Agents listen to the Firehose for `org.dds.*` commits.
- **Action**: Pin the Repository updates to IPFS/Arweave.
- **Keys in Repo**: Since the `org.dds.key.wrapped` (Vault) is stored in the Repository, it is automatically archived.
- **Result**: Even if Agora vanishes, the User's Identity (PLC Directory) and Vault (IPFS) are recoverable.

> **RISK (Data Availability)**: A malicious PDS could accept the User's "Vault" commit and report success, but **refuse to publish it to the Firehose**. In this scenario, the Archive Agents would never see the data. If the PDS subsequently deletes the account, the user is lost.
> _Mitigation Discussion_: Clients may need to poll independent Archive Agents to confirm their Vault has been indexed before considering the setup "Safe."

### 6.2 Local Resilience

- **Cache**: The Client mirrors the **Encrypted Vault Blob** to `IndexedDB`.
- **Export**: Users can perform an "On-Demand Export" (decrypting in memory) to download a CAR file + Unlocked Keys.

### 6.3 The 72h Safety Net

We rely on the **did:plc 72-hour Grace Period**. If a malicious PDS or compromised device attempts to rotate the keys, the user has 72 hours to "Undo" the rotation using their Wallet or Backup Code.

## Appendix A: Security Risk Assessment

### A.1 MITM on Device Sync

- **Risk**: During "Type B" sync, a malicious PDS could present its own key instead of the new device's key.
- **Mitigation**: The User MUST verify a **QR Code** (visual channel) containing the new device's DID fingerprint. This bypasses the server trust.

### A.2 Public Exposure of Keys

- **Risk**: Encrypted keys are public on the Firehose.
- **Mitigation**: We mandate high-entropy keys. Weak passwords are forbidden. Wallet signatures provide mathematical entropy.

### A.3 Lost Devices

- **Risk**: Type B users lose all devices.
- **Mitigation**: Users MUST save a "Recovery Code" (the raw $K_{account}$) upon signup. Without this or a device, the account is mathematically lost.

## Appendix B: Architectural Rationale

### B.1 The Design Goals: What DDS Must Achieve

DDS is designed to satisfy seven core requirements:

1. **Pass the Walkaway Test**: Users own their identity and data. The ecosystem can take over the network and data even if the founding team disappears or goes rogue.
2. **Usability**: Fast, reliable UX (OAuth flows, standard patterns)
3. **Performance**: Instant search/indexing, real-time notifications, web2-level responsiveness
4. **Discoverability**: Users can find conversations, no central gatekeeper required
5. **Interoperability**: Multiple apps/analyzers work with same data
6. **Separation of Concerns**: Storage ≠ Computation ≠ Moderation
7. **Verifiable Truth**: Math, not server trust, determines consensus
8. **Web3-native auth support is first-class**: Bring your own auth, and bind it two-ways with your PDS did:plc.

### B.2 The Pure P2P Alternative: Why We Needed More Than Waku/IPFS

We deeply respect the Waku and IPFS communities - their work on censorship-resistant infrastructure is foundational to web3. Pure P2P protocols excel at messaging and file storage.

**For public deliberation at scale, we encountered specific challenges:**

- **Discovery**: IPFS requires knowing CID beforehand; browsing "all conversations about climate" needs indexing infrastructure
- **Search Performance**: Users expect instant results (web2 UX); DHT lookups add noticeable latency
- **Semantic Interop**: No standard schema system; would need to build Lexicon-equivalent
- **Moderation**: No Labeler ecosystem equivalent
- **Analysis**: No infrastructure component fits

**Our Hybrid Approach:**

- **AT Protocol**: Hot path (discovery, instant search, semantic interop, real-time notifications)
- **IPFS/Filecoin/Arweave**: Cold path (archival, censorship resistance)
- **Ethereum**: Truth layer (verification, sovereignty)

We're using each technology for its strengths. Public deliberation needs both walkaway guarantees (IPFS) and discoverability with web2 performance (AT Protocol).

### B.3 The Foundation: Why AT Protocol Solves the Hard Problems

AT Protocol provides the foundation for DDS's usability and interoperability requirements:

**Portable Identity**: `did:plc` with 72-hour grace period enables provider switching without losing social graph.

**Permissionless Discovery**: The Firehose enables anyone to build search/indexing without permission. AppViews provide SQL-backed search with millisecond response times.

**Semantic Interoperability**: Lexicons provide human-readable schemas (`org.dds.module.polis`, `org.dds.result.pca`) that any tool can parse. No custom format reverse-engineering required.

**Separation of Concerns**: Architecture separates PDS (storage), AppView (presentation), Labeler (moderation, analysis), and Firehose (distribution) - enabling competition and choice at each layer.

**Performance**: Real-time notifications via Server-Sent Events, instant search via indexed queries, OAuth for standard authentication flows.

**Mature Infrastructure**: Battle-tested by Bluesky (millions of users), multiple PDS hosting providers, comprehensive documentation.

**Trade-off**: Initially, more complex than pure P2P, but proven at scale for social applications. Solves lots of problems that we'd need to solve by hand with pure P2P approaches. Users _can_ self-host their PDS for maximum sovereignty, but we provide sensible managed defaults with client-side recovery keys, for those who prioritize usability.

### B.4 The Adaptations: How DDS Adds Walkaway to AT Protocol

Standard AT Protocol prioritizes usability but doesn't guarantee walkaway. DDS adds four key mechanisms:

#### B.4.1 Multi-Identifier PDS Access

**Standard AT Protocol**: Email-only signup → `did:plc` provisioned by PDS host.

**DDS Enhancement**: Support any identifier via three tiers (§2.1):

- **Tier 2 (Self-Hosted)**: User brings own PDS (standard Bluesky account or self-hosted) - maximum sovereignty
- **Tier 1 (Managed)**: Auto-provision PDS for **Wallet**, **ENS**, **ZKPass**, Email, Phone users, and more - sensible default for usability
- **Tier 0 (Guest)**: Lightweight PDS authenticated by local `did:key` for Guests - lowest friction entry

**Result**: Crypto-native and non-crypto users get equal `did:plc` treatment. No second-class citizens. Self-hosting available, but not required.

#### B.4.2 Encrypted Key Vault (Identity Sovereignty)

**Problem**: On managed PDS, the host holds signing keys. If it dies, you're locked out.

**Solution**: Store encrypted `did:plc` Rotation Keys in your repository (§3). This enables walkaway even for users on managed infrastructure.

- **Type A (Wallet)**: Deterministic signature-derived decryption (Fileverse pattern)

  - Sign challenge → derive AES key → decrypt Rotation Keys
  - Recoverable from any device with wallet

- **Type B (Email/Phone/Guest)**: Device-synced lockboxes
  - Master secret encrypted per-device
  - QR code verification prevents MITM attacks

**Result**: Walk away with your identity, rotate to new PDS provider - without needing to self-host from day one.

**Privacy Note**: Managed PDS hosts can technically access user data (signing keys, posts). Users who require full privacy should self-host their PDS. DDS provides the _capability_ to walkaway and self-host, making it a credible choice for privacy-conscious users when needed.

#### B.4.3 IPFS/Arweave Archival Layer

**Problem**: PDS can disappear, taking your data.

**Solution**: Archive Agents listen to Firehose, pin `org.dds.*` records to IPFS/Arweave (§6.1).

**Integration**: Encrypted Vault automatically archived alongside data.

**Recovery Flow**:

1. Retrieve CAR file from IPFS (via CID from `did:plc` document)
2. Decrypt Vault → get Rotation Keys
3. Rotate DID to new PDS
4. Re-publish archived data to new PDS

**Risk Acknowledged**: Malicious PDS can refuse to emit to Firehose (see §6 RISK note). Mitigation: clients poll independent Archive Agents to confirm data was indexed.

#### B.4.4 Verifiable Computation (Math Over Trust)

**Problem**: AT Protocol has no built-in analysis verification. Users trust centralized algorithms (like Twitter's Community Notes).

**DDS Solution**: Prover Agent protocol (§5):

1. Define scope (conversation ID + time window)
2. Consume Firehose (public access)
3. Run clustering (PCA, embeddings)
4. Publish `org.dds.result.pca` with `Hash(Result)`

**Ethereum Integration**:

- Provers submit hash on-chain for fraud proving
- Stake tokens (slashed if caught lying)
- Disputes resolved via ZK-ML proofs or optimistic arbitration (§5.2)

**Result**: Users verify analysis is mathematically correct, not server opinion.

### B.5 The Tri-Layer Architecture (How It All Fits Together)

```
┌────────────────────────────────────────────────┐
│ USER LAYER                                      │
│ - Discover: Browse AppView (Firehose-powered)  │
│ - Participate: Wallet/Email/Phone → PDS        │
│              (self-hosted OR managed)          │
│ - Verify: Check Prover results on-chain        │
└────────────────────────────────────────────────┘
         ↓ (normal operation)
┌────────────────────────────────────────────────┐
│ L1: AT PROTOCOL (Hot Path - Usability)         │
│ ┌──────────────┐  ┌──────────────┐            │
│ │ PDS (Storage)│→ │Firehose (Pub)│            │
│ │ - did:plc    │  │ - Permissionless          │
│ │ - Encrypted  │  │   indexing                │
│ │   Vault      │  │ - Real-time               │
│ │ - OAuth      │  │   distribution            │
│ └──────────────┘  └──────────────┘            │
│          ↓                ↓                    │
│    ┌──────────────────────────┐               │
│    │ AppViews (Discovery)     │               │
│    │ - Instant search (SQL)   │               │
│    │ - Real-time notifications│               │
│    │ - Filter/sort            │               │
│    └──────────────────────────┘               │
│ ➜ Provides: Performance, Discovery, Interop   │
└────────────────────────────────────────────────┘
         ↓ (archival)           ↓ (analysis)
┌─────────────────┐    ┌──────────────────────┐
│ L2: IPFS/Arweave│    │ Prover Agents        │
│ (Cold - Walkaway)│    │ (Computation)        │
│ - Archive Agents│    │ - Read Firehose      │
│   pin org.dds.* │    │ - Run clustering     │
│ - Vault included│    │ - Publish results    │
│ - Conversation  │    │ ➜ Algorithm freedom  │
│   manifests     │    │   Separation of      │
│   (discovery    │    │   concerns           │
│   fallback)     │    │                      │
│ ➜ Censorship    │    │                      │
│   resistance    │    │                      │
└─────────────────┘    └──────────────────────┘
         ↓ (recovery)           ↓ (verification)
┌────────────────────────────────────────────────┐
│ L3: ETHEREUM (Truth - Verification)            │
│ - Wallet Master Key (see hierarchies below)    │
│ - Hash(Result) commitments (fraud proving)     │
│ - Token-gating (permission control)            │
│ - Prover staking/slashing (economic security)  │
│ ➜ Provides: Verifiability, Sovereignty        │
└────────────────────────────────────────────────┘

ETHEREUM WALLET MASTER KEY HIERARCHY (Type A Users)
═══════════════════════════════════════════════════

              Ethereum Wallet Signature
                        │
                        ├─────────────────────┐
                        ↓                     ↓
            HKDF-SHA256 derivation    Sign OAuth challenge
                        ↓                     ↓
                  AES-GCM Key          PDS Login (OAuth)
                        ↓                     ↓
         Decrypt org.dds.key.wrapped    Access to L1 PDS ──┐
                        ↓                                   │
              did:plc Rotation Key                          │
                        ↓                                   │
    ┌───────────────────┴────────────────┐                 │
    ↓                                    ↓                 │
Control DID document              Walkaway scenario:       │
(rotate to new PDS)               Recover from any device  │
                                  with just wallet         │
                                                            │
Result: Ethereum wallet = Master key for BOTH ─────────────┘
        - Identity sovereignty (did:plc)
        - Infrastructure access (PDS OAuth)


WEB2/NON-WALLET AUTH WALKAWAY & SELF-HOSTED PATH
═════════════════════════════════════════════════

┌─────────────────────────────────┬──────────────────────────────────┐
│ WEB2 AUTH (Email/Phone/Guest)   │ SELF-HOSTED PDS (Tier 2)         │
│ Managed PDS (Tier 1/0)          │                                  │
├─────────────────────────────────┼──────────────────────────────────┤
│ Setup Phase:                    │ No setup needed:                 │
│  Master Secret (K_account)      │  User runs own PDS               │
│        ↓                        │        ↓                         │
│  Encrypts did:plc Rotation Key  │  Direct access to Rotation Keys  │
│        ↓                        │        ↓                         │
│  Vault: org.dds.key.wrapped     │  Stored in own infrastructure    │
│        ↓                        │                                  │
│  K_account encrypted per-device │                                  │
│  → Lockbox files in PDS         │                                  │
│                                 │                                  │
│ Walkaway Options:               │ Walkaway Scenario:               │
│                                 │                                  │
│  Option 1: Existing Device      │  No walkaway needed -            │
│   Has K_account locally         │  already sovereign!              │
│         ↓                       │                                  │
│   Decrypt Vault → Rotation Key  │  User controls:                  │
│         ↓                       │  ✓ PDS infrastructure            │
│   Rotate did:plc to new PDS     │  ✓ Signing keys                  │
│                                 │  ✓ Rotation keys                 │
│  Option 2: Recovery Code        │  ✓ All data                      │
│   User saved K_account at signup│                                  │
│         ↓                       │  Participates in DDS with        │
│   Retrieve Vault from IPFS      │  full sovereignty from day one   │
│         ↓                       │                                  │
│   Decrypt → Rotation Key        │                                  │
│         ↓                       │                                  │
│   Rotate did:plc to new PDS     │                                  │
│                                 │                                  │
│ CRITICAL:                       │ TRADE-OFF:                       │
│ ⚠ Recovery Code MUST be saved   │ ⚠ Requires technical expertise   │
│ ⚠ Without device or code,       │ ✓ Maximum privacy & control      │
│   account is lost               │ ✓ No encrypted vault complexity  │
└─────────────────────────────────┴──────────────────────────────────┘
```

**Mapping DDS Features to Layers:**

| Design Goal                | Implementation                                                   |
| -------------------------- | ---------------------------------------------------------------- |
| **Walkaway**               | L1 (Encrypted Vault) + L2 (IPFS archival) + L3 (wallet recovery) |
| **Usability**              | L1 (PDS infrastructure, OAuth, standard patterns)                |
| **Performance**            | L1 (SQL search, real-time SSE notifications)                     |
| **Discoverability**        | L1 (Firehose → AppViews) + L2 (IPFS fallback indexers)           |
| **Interoperability**       | L1 (Lexicons, `org.dds.*` namespace)                             |
| **Separation of Concerns** | L1 (PDS ≠ AppView ≠ Prover) + L3 (verification layer)            |
| **Verifiable Truth**       | L1 (public Firehose data) + L3 (fraud proving)                   |

**The Synthesis:**

- **AT Protocol alone**: Great usability/interop, no walkaway guarantee
- **Pure IPFS/Waku**: Easy walkaway, challenging discovery/performance/interop
- **DDS Hybrid**: AT Protocol for UX + IPFS for archival + Ethereum for verification = **Walkaway Test passed while maintaining mainstream adoption potential**

**Ethereum's Parsimonious Role**: Used only where cryptographic guarantees matter (verification, sovereignty, permissions), not for high-throughput social data. This follows Vitalik's "protocol simplicity" principle - use blockchain for truth, use standards for infrastructure.

**The Self-Hosting Trade-off**: Users _can_ self-host their PDS for maximum privacy and control, but DDS provides sensible managed defaults for mainstream adoption. The Encrypted Key Vault ensures that even managed users retain the _ability_ to walkaway - sovereignty without the burden of day-one self-hosting.

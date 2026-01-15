# RFC 0013: Decentralized Deliberation Standard (DDS)

| Metadata | Value |
| :--- | :--- |
| **RFC ID** | 0013 |
| **Title** | DDS: Verifiable Deliberation on AT Protocol |
| **Status** | Draft |
| **Created** | 2026-01-13 |
| **Supersedes** | RFC-0012, RFC-0005 |

## Abstract

This RFC defines the **Decentralized Deliberation Standard (DDS)**, a vendor-neutral protocol for secure, censorship-resistant public consultation.

DDS leverages the **AT Protocol** for transport, standardizing on the **Personal Data Server (PDS)** as the fundamental unit of participation. It unifies all users (Guest, Email, Wallet, ZKPass) under a standard PDS model using OAuth for authentication and PDS-managed signing for interaction.

To ensure sovereignty for users on managed infrastructure, DDS introduces the **Encrypted Key Vault**: a cryptographic pattern that guarantees users can retrieve their `did:plc` Rotation Keys and "walk away" to a self-hosted provider at any time, effectively passing the "Walkaway Test" without burdening the user with client-side signing complexity.

## 1. Core Philosophy

1.  **Identity is Sovereign**: Every user has a portable `did:plc`. The cryptographic root of control (Rotation Key) belongs to the user, not the provider.
2.  **Infrastructure is Commoditized**: The PDS is a utility. If a provider acts maliciously, the user can rotate their DID to a new provider without losing their social graph or history.
3.  **Math is Verifiable**: We do not trust the server to count votes. We trust the **Prover**. Analysis Agents publish results with cryptographic proofs that can be challenged on-chain.
4.  **Privacy is Client-Side**: Private conversations are encrypted on the client. The network sees only opaque blobs.

## 2. Architecture: The Unified PDS Model

DDS standardizes on the **Personal Data Server (PDS)** for all participants. There are no "Second Class" guests.

### 2.1 The Hosting Tiers
To balance **Ease of Access** with **Sovereignty**, we support a spectrum of account types. Note that a single Managed PDS instance is designed to be multi-tenant, capable of hosting thousands of Guest accounts efficiently (similar to standard Bluesky PDS architecture).

1.  **Self-Hosted (Tier 2)**: The user brings their own PDS (e.g., standard Bluesky account). They authenticate directly.
2.  **Managed (Tier 1)**: The user authenticates via a Web2/Web3 method (Email, Phone, Wallet, ZKPass), and the application **auto-provisions** a PDS account for them.
3.  **Anonymous (Tier 0)**: A "Guest" user who has not yet verified an identifier. They are provisioned a lightweight PDS account authenticated by a local `did:key` (acting as a session token).

### 2.2 Standard Authentication
All tiers use standard **AT Protocol OAuth**.
*   **Signing:** The PDS manages the **Signing Key** (`app.bsky.actor.defs`) and signs posts/votes on behalf of the user.
*   **Benefit:** This simplifies the client architecture (no local signing state for posts) and ensures compatibility with standard AT Proto clients.
*   **Trade-off:** While full OAuth may be considered "bloated" for ephemeral Guest users (where simple key-based proving might suffice), we retain it to ensure a **unified authentication path** for all user tiers, simplifying the overall codebase.

## 3. The Sovereign Vault (Identity Ownership)

While the PDS manages *Posting* (Signing Keys), the User must retain control over *Identity* (Rotation Keys). We achieve this via the **Encrypted Key Vault**.

### 3.1 The Risk
In a Managed model, if the PDS disappears or turns malicious, the user could be locked out. They need the **Recovery Key** (Rotation Key) to move their DID.

### 3.2 Type A: The Deterministic Vault (Wallet Login)
For users logging in with an Ethereum Wallet, we implement the **"Sign-to-Derive"** pattern (pioneered by Fileverse.io):

1.  **Generation**: The client generates a random **Recovery Key** (`did:plc` rotation key).
2.  **Derivation**: The user signs a deterministic, domain-bound message.
    *   **Algorithm**: The signature is used as the entropy seed for **HKDF-SHA256** to derive a symmetric **AES-GCM Key**.
    *   **Reference**: This mirrors the architecture of `@fileverse/crypto` (specifically [`src/ecies/core.ts`](https://github.com/fileverse/fileverse-cryptography/blob/main/src/ecies/core.ts)), utilizing standard libraries (`@noble/ciphers`, `@noble/hashes`) for client-side ECIES encryption rather than wallet-specific `eth_decrypt` (which has poor mobile support).
3.  **Storage**: The Recovery Key is encrypted with this AES Key. The ciphertext is stored in the Repository (`org.dds.key.wrapped`).
4.  **Recovery**: User can recover their identity from *any* device by connecting their wallet and re-signing the challenge.

### 3.3 Type B: The Device Vault (Email/Phone/Guest)
For users without a global key (Wallet):
1.  **Mechanism**: We use a **Device Graph**. Each device has a local `did:key` (Exchange Key).
2.  **The Master Secret**: A random Symmetric Key ($K_{account}$) encrypts the Recovery Key.
3.  **The Lockbox**: $K_{account}$ is encrypted for each device's Exchange Key and stored in the Repository.
4.  **Device Sync (Detailed)**:
    *   **Device B (New)**: Generates a local `did:key` and displays its Public Key via QR Code.
    *   **Device A (Existing)**: Scans the QR Code, validates the fingerprint (MITM protection), and encrypts the Master Secret ($K_{account}$) specifically for Device B's Public Key.
    *   **Transport**: Device A uploads this **"Lockbox"** to the PDS. Device B downloads it, decrypts $K_{account}$, and can now access the global **Encrypted Vault Blob**.
5.  **Security**: **QR Code Verification** is MANDATORY for device linking to prevent Server MITM attacks.
    *   *Note*: If a PDS is known to be malicious, the user should not attempt to sync new devices. Instead, the existing device should decrypt the `Recovery Key` and execute a **Migration (Walkaway)** to a new provider immediately.

### 3.4 Core Concepts & Definitions

| Feature | **Lockbox (Device Sync)** | **Migration (Walkaway)** |
| :--- | :--- | :--- |
| **Purpose** | To **add a new device** to your existing account. | To **escape a malicious/failed PDS** and move your identity elsewhere. |
| **Mechanism** | Device A encrypts the account secret ($K_{account}$) for Device B and stores it on the PDS. | You take your **Rotation Key** (decrypted from the vault) and update your `did:plc` document to point to a *new* PDS. |
| **Trust** | **Requires PDS cooperation.** The PDS must accept and serve the "Lockbox" file. | **Sovereign.** Does *not* require PDS cooperation. |

*   **Encrypted Vault Blob** (`org.dds.key.wrapped`): The user's Identity Root (Rotation Key), encrypted at rest by the Master Secret ($K_{account}$). It is the "Sovereign Backup" and is **identical** across all devices.
*   **Lockbox**: A temporary delivery container. It contains the Master Secret ($K_{account}$) encrypted specifically for a *target device's* public key.

## 4. Modular Inputs (Lexicons)

DDS supports any deliberation type via pluggable modules.

### 4.1 `org.dds.module.polis` (Agora)
*   **Opinion**: `{ text: string }`
*   **Vote**: `{ targetCid: string, value: -1|0|1 }`

## 5. Verifiable Analysis (The Prover)

### 5.1 The Agent Protocol
1.  **Input**: Agent defines a "Scope" (Conversation ID + Time Window).
2.  **Process**: Agent reads all Repositories from the Firehose matching the Scope.
3.  **Compute**: Runs PCA/Clustering (e.g., Reddwarf).
4.  **Output**: Publishes `org.dds.result.pca`.

### 5.2 The "Hard Trust" Upgrade
The Agent acts as an Oracle, submitting `Hash(Result)` to a Smart Contract for fraud proving.

> **OPEN ISSUE**: "Fraud Proving" in the traditional sense (on-chain re-execution) is likely infeasible for heavy clustering algorithms (PCA) on standard EVM chains. This mechanism requires further definition, such as using **Zero-Knowledge Machine Learning (ZK-ML)** proofs or an **Optimistic Dispute Game** where a committee of human arbiters can run the code off-chain to resolve disputes.

## 6. Decentralized Availability Strategy

To pass the "Walkaway Test" when the PDS is down:

### 6.1 Network Level: Targeted Archival
*   **Role**: Archive Agents listen to the Firehose for `org.dds.*` commits.
*   **Action**: Pin the Repository updates to IPFS/Arweave.
*   **Keys in Repo**: Since the `org.dds.key.wrapped` (Vault) is stored in the Repository, it is automatically archived.
*   **Result**: Even if Agora vanishes, the User's Identity (PLC Directory) and Vault (IPFS) are recoverable.

> **RISK (Data Availability)**: A malicious PDS could accept the User's "Vault" commit and report success, but **refuse to publish it to the Firehose**. In this scenario, the Archive Agents would never see the data. If the PDS subsequently deletes the account, the user is lost.
> *Mitigation Discussion*: Clients may need to poll independent Archive Agents to confirm their Vault has been indexed before considering the setup "Safe."

### 6.2 Local Resilience
*   **Cache**: The Client mirrors the **Encrypted Vault Blob** to `IndexedDB`.
*   **Export**: Users can perform an "On-Demand Export" (decrypting in memory) to download a CAR file + Unlocked Keys.

### 6.3 The 72h Safety Net
We rely on the **did:plc 72-hour Grace Period**. If a malicious PDS or compromised device attempts to rotate the keys, the user has 72 hours to "Undo" the rotation using their Wallet or Backup Code.

## Appendix A: Security Risk Assessment

### A.1 MITM on Device Sync
*   **Risk**: During "Type B" sync, a malicious PDS could present its own key instead of the new device's key.
*   **Mitigation**: The User MUST verify a **QR Code** (visual channel) containing the new device's DID fingerprint. This bypasses the server trust.

### A.2 Public Exposure of Keys
*   **Risk**: Encrypted keys are public on the Firehose.
*   **Mitigation**: We mandate high-entropy keys. Weak passwords are forbidden. Wallet signatures provide mathematical entropy.

### A.3 Lost Devices
*   **Risk**: Type B users lose all devices.
*   **Mitigation**: Users MUST save a "Recovery Code" (the raw $K_{account}$) upon signup. Without this or a device, the account is mathematically lost.

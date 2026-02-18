# Addendum: Anonymity Considerations for Decentralized Deliberation

**Related:** [DDS: Verifiable Deliberation on AT Protocol](./0013-agora-atproto-walkaway.md)
**Date:** 2026-02-05
**Status:** Discussion notes

---

## Executive Summary

This addendum explores the anonymity challenges inherent in any decentralized deliberation system. The key finding is that **achieving strong cross-conversation unlinkability is fundamentally difficult**, regardless of which underlying protocol (AT Protocol, custom federation, pure P2P) is chosen.

> **Scope**: This addendum covers **participant anonymity** — pseudonymity, cross-conversation unlinkability, correlation resistance, and metadata leakage. Conversation privacy (restricting who can participate) is a separate concern addressed in the [main spec §6](./0013-agora-atproto-walkaway.md) and [Implementation Addendum §7](./0013-implementation-addendum.md#7-conversation-privacy).

This is not a limitation of AT Protocol specifically — it's a property of any system that:

1. Allows users to participate across multiple conversations
2. Uses **public or semi-public** infrastructure for data distribution
3. Adopts a **trust-minimized mindset** — doesn't want to trust third-party server operators

The tension is between **sovereignty** (not trusting operators) and **privacy** (hiding activity from observers). Achieving both simultaneously is the hard problem.

---

## 1. The Core Tension

Deliberation platforms face a fundamental tension:

```
USABILITY                              PRIVACY
─────────                              ───────
• See my voting history                • Votes unlinkable across conversations
• Sync across devices                  • No correlation of my activity
• One login for everything             • Different identity per context
• Fast, responsive UX                  • No metadata leakage

TRUST-MINIMIZATION                     PRIVACY (from operators)
──────────────────                     ───────────────────────
• Don't trust PDS operator             • Operator can't see my activity
• Don't trust relay operators          • Operators can't correlate my DIDs
• Verifiable, not trustworthy          • No single point of surveillance

These goals conflict. Any design must choose trade-offs.
```

---

## 2. The Trust-Minimization Problem

DDS aims to minimize trust in operators (walkaway capability). But this creates a privacy paradox:

```
CENTRALIZED (trust operator):
  • Operator sees everything
  • But: Only ONE entity to trust
  • Privacy = trusting that one entity

DECENTRALIZED (trust-minimized):
  • Multiple operators (PDS, Relay, AppView)
  • Data flows through public infrastructure
  • MORE entities see your activity
  • Privacy = hiding from ALL of them (harder)
```

**Key insight:** Decentralization increases sovereignty but can reduce privacy, because data must flow through observable public channels.

---

## 3. Correlation Vectors (Protocol-Agnostic)

Regardless of the underlying protocol, these correlation vectors exist:

### 3.1 Identity Linkage

| Vector | Attack | Mitigation | Cost |
|--------|--------|------------|------|
| **Same identifier** | Email/phone used across conversations | Per-conversation pseudonyms | UX complexity |
| **Same DID** | DID used across conversations | Per-conversation DIDs | Architecture complexity |
| **Same PDS origin** | All DIDs from same server visible on Firehose | Large multi-tenant PDS (crowd) | Must trust PDS crowd |

### 3.2 Network Linkage

| Vector | Attack | Mitigation | Cost |
|--------|--------|------------|------|
| **IP address** | Same IP makes requests for multiple DIDs | Tor/VPN/Mixnet | Latency, complexity |
| **Timing** | Requests for multiple DIDs at similar times | Randomized delays | Latency |
| **Session** | Same auth session queries multiple DIDs | Separate sessions | UX friction |

### 3.3 Behavioral Linkage

| Vector | Attack | Mitigation | Cost |
|--------|--------|------------|------|
| **Activity patterns** | User active at same times across conversations | Activity noise | Unnatural UX |
| **Writing style** | Stylometry on opinions | Style obfuscation | Unnatural writing |
| **Voting patterns** | Statistical correlation of voting behavior | None practical | Fundamental limit |

### 3.4 Infrastructure Linkage (Trust-Minimization Specific)

| Vector | Attack | Mitigation | Cost |
|--------|--------|------------|------|
| **Firehose/Relay** | Public observer sees all commits from same PDS | Hide in crowd OR encrypt | Trust crowd OR complex crypto |
| **AppView queries** | History view reveals DID linkage | No cross-conversation history | Terrible UX |
| **Self-hosted PDS** | Trivially links all your DIDs (you're the only user) | Don't self-host for privacy | Ironic: self-host = less privacy |

---

## 4. The History View Problem

The most fundamental challenge: **users want to see their participation history**.

```
USER EXPECTATION:
  "Show me all conversations I've participated in"
  "Show me my votes across all topics"

TECHNICAL REQUIREMENT:
  System must know: {DID_1, DID_2, DID_3} belong to same user

OPTIONS:
  1. Server knows (queries reveal linkage) → Defeats trust-minimization
  2. Client knows (local storage only) → See note on sync below
  3. Encrypted on server → Access patterns still reveal linkage
  4. No history view → Unacceptable UX
```

**Note on cross-device sync:** Privacy-preserving sync IS possible via local-first / device-to-device direct sync (similar to the Type B device sync in DDS RFC). However:
- Must ensure any relay/proxy server doesn't learn the DID linkage
- Non-trivial to implement correctly
- Adds significant complexity to achieve both privacy AND sync

**Conclusion:** Any system that provides cross-conversation history while minimizing trust in operators faces a fundamental challenge. Solutions exist but require careful design.

---

## 5. Self-Hosted PDS: Sovereignty ≠ Privacy

A counterintuitive finding:

```
SELF-HOSTED PDS:
  ✅ Maximum sovereignty (you control everything)
  ✅ Trust-minimized (you are the operator)
  ❌ WORSE for privacy

WHY:
  • Your PDS has only YOUR accounts
  • Firehose sees: "pds.alice.com committed for did:plc:a1, b2, c3"
  • Trivial correlation: All DIDs belong to Alice
  • No crowd to hide in

MANAGED PDS (many users):
  • Your DIDs mixed with thousands of others
  • Firehose sees: "bigpds.example.com committed for 50,000 DIDs"
  • Harder to correlate which are yours
  • BUT: Must trust the managed PDS operator

TRADE-OFF:
  Self-hosted = sovereignty without privacy
  Managed = privacy (crowd) without full sovereignty
```

---

## 6. Privacy Levels (Realistic Assessment)

Given the constraints above, here are the achievable privacy levels:

### Level 0: Identified Participation
```
• Real name or email visible
• Fully linkable
• Appropriate for: Public civic discourse, company town halls
```

### Level 1: Pseudonymous Participation (DDS Default)
```
• DID is pseudonymous (not trivially linked to real name)
• Same DID used across conversations (linkable by DID)
• Trust-minimized: Can walkaway from any operator
• Appropriate for: Most deliberation use cases
• Threat model: Protects against casual deanonymization
• Note: Guest accounts may operate at Level 1 (managed did:plc) or use
  per-conversation did:key for ticket-gated anonymity.
  See Implementation Addendum §5 for design exploration.
```

### Level 2: Crowd Anonymity
```
• Per-conversation DIDs on large multi-tenant PDS
• DIDs hidden among thousands of others
• Correlation requires traffic analysis
• Trade-off: Must trust PDS operator won't correlate
• Appropriate for: Sensitive topics, casual linkage concern
• Threat model: Resists public observation, not operator collusion
```

### Level 3: Strong Anonymity
```
• Per-conversation DIDs
• Tor for all network requests
• Local-first sync only (device-to-device, no server proxy learning)
• No server-side history aggregation
• Fully trust-minimized
• Appropriate for: Whistleblowing, political dissent
• Practical: Challenging UX, but achievable with significant engineering effort
```

**The gap between Level 2 and Level 3 is significant.** Level 2 requires trusting the PDS operator (crowd anonymity). Level 3 is achievable but requires substantial engineering investment in local-first sync, Tor integration, and careful protocol design.

---

## 7. Recommendation for DDS

### 7.1 Default: Level 1 (Pseudonymous, Trust-Minimized)

For the standard DDS implementation:

```
• One DID per user
• Pseudonymous (DID ≠ real name)
• Linkable across conversations (by DID)
• Trust-minimized: Walkaway capability via Encrypted Vault
• Honest about privacy model
```

**Rationale:**
- Achieves the sovereignty goal (walkaway)
- Matches user expectations (one account, full history)
- Simple architecture
- Honest about privacy limitations
- Sufficient for most deliberation use cases

### 7.2 Future: "Hardcore Anonymity" App/Mode

For users who require stronger privacy, a **separate application or mode** could be developed:

```
HARDCORE ANONYMITY APP (Future Work)

Characteristics:
• Separate app (not just a setting)
• Per-conversation DIDs
• Tor integration for all network requests
• Local-first sync (device-to-device, no server learning)
• Careful design to prevent proxy/relay correlation
• Clear warnings about complexity
• Accepts usability trade-offs for privacy

Target users:
• Journalists protecting sources
• Dissidents in authoritarian regimes
• Whistleblowers
• Users with specific, serious threat models

Engineering requirements:
• Local-first sync protocol (non-trivial)
• Tor/mixnet integration
• Careful audit of all network paths
• Significant development investment
```

This would be a distinct product with different architecture, not a configuration toggle.

---

## 8. Protocol Independence

**Key point:** These privacy challenges are not specific to AT Protocol.

| Protocol | Same Challenges? | Notes |
|----------|------------------|-------|
| **AT Protocol** | Yes | Firehose is public, PDS origin visible |
| **ActivityPub** | Yes | Server origin visible, federation leaks metadata |
| **Custom P2P** | Yes | DHT queries reveal interest, timing correlation |
| **Blockchain-based** | Yes (worse) | All data permanently public, immutable |
| **Pure IPFS** | Yes | Request patterns observable, no crowd |
| **Centralized** | Different | Single trust point, but simpler threat model |

The choice of AT Protocol vs. alternatives should be made on **other criteria**:
- Usability and interoperability ✅
- Ecosystem and tooling maturity ✅
- Sovereignty guarantees (walkaway) ✅

**Not** based on privacy, because privacy challenges are inherent to the trust-minimized public infrastructure model, not to any specific protocol.

---

## 9. What DDS Actually Provides

DDS should be clear about what it provides and doesn't provide:

### DDS Guarantees ✅

1. **Sovereignty**: You control your identity (walkaway capability)
2. **Trust-minimization**: Don't need to trust any single operator forever
3. **Pseudonymity**: Your DID is not your real name
4. **Data ownership**: You can export and verify your data
5. **Censorship resistance**: Data survives operator failure/malice

### DDS Limitations ❌

1. **Cross-conversation linkability**: Same DID used everywhere (by design, in default mode)
2. **Public activity**: Votes visible on Firehose (for verifiability)
3. **Operator observation**: Current PDS operator can see your activity
4. **Network correlation**: Determined adversary can correlate via traffic analysis

### Honest User Communication

```
Suggested privacy statement for users:

"Your participation in Agora is pseudonymous. Your username and
activity are visible to other participants, but we don't require
your real name.

Your activity across different conversations is linked to your
account. This is necessary for you to see your own history and
for the system to prevent duplicate voting.

You can leave Agora at any time and take your identity with you
(walkaway capability). Your data is not locked to any single
operator.

For users facing serious threats (journalists, activists in
authoritarian contexts), our standard platform may not provide
sufficient anonymity. A future 'hardcore anonymity' mode may
address these use cases."
```

---

## 10. Future Research Directions

If stronger privacy becomes a priority, these areas could be explored:

### 10.1 Zero-Knowledge Eligibility
```
User proves: "I'm eligible to participate"
Without revealing: Which specific identifier they used
Requires: ZK credential issuance infrastructure
```

### 10.2 Encrypted Vote Aggregation
```
Votes encrypted, only aggregation revealed
Approach: Homomorphic encryption or MPC for analysis
Challenge: PCA/clustering and LLM inference are complex computation
```

### 10.3 Mixnet Integration
```
Requests routed through anonymity network (Tor, Nym)
Challenge: Latency, reliability
Required for: Level 3 anonymity
```

### 10.4 Local-First Sync with Privacy
```
Device-to-device sync without server learning
Approach: End-to-end encrypted sync, careful relay design
Challenge: Non-trivial protocol design, NAT traversal
Required for: Level 3 anonymity with cross-device support
```

### 10.5 Private Information Retrieval
```
Client fetches data without revealing what it's fetching
Challenge: Bandwidth overhead, complexity
Research area: Active in crypto/privacy community
```

---

## 11. Conclusion

Privacy in decentralized, trust-minimized deliberation is a **hard problem with no simple solution**. The fundamental tension is:

```
Trust operators     → Privacy is their promise (fragile)
Don't trust operators → Activity flows through public channels (observable)
```

DDS correctly prioritizes **sovereignty** (walkaway capability) over strong anonymity for v1. The recommendation:

1. **Be honest** about privacy limitations
2. **Default to pseudonymity** (one DID, full history, trust-minimized)
3. **Defer strong anonymity** to future "hardcore mode" as separate app
4. **Acknowledge** that Level 3 privacy IS achievable but requires significant engineering (local-first sync, Tor, careful protocol design)

The choice of protocol (AT Protocol, custom, etc.) should be based on sovereignty, usability, and interoperability — **not privacy**, because privacy challenges are inherent to the trust-minimized public infrastructure model, not to any specific protocol.

---

## Appendix: The Irony of Decentralization and Privacy

```
CENTRALIZED SYSTEM:
  • Trust one operator
  • Operator sees everything
  • Privacy = operator's policy
  • Simple threat model

DECENTRALIZED SYSTEM:
  • Don't trust any single operator
  • Data flows through public channels
  • Many entities can observe
  • Privacy = hiding from everyone (hard)

IRONY:
  Decentralization increases sovereignty
  But can decrease privacy
  Unless you add careful cryptographic/protocol design
  Which requires significant engineering investment

This is why privacy + sovereignty + usability together
is the hard problem in decentralized systems.
```

DDS chooses sovereignty over strong anonymity for the default mode. This is the right choice for mainstream deliberation. Users with high-threat models can be served by a future hardcore anonymity mode with appropriate engineering investment.

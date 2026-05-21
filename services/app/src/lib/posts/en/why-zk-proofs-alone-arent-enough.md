---
title: "Why Zero-Knowledge Proofs Alone Are Not Enough to Protect User Privacy"
description: "Zero-knowledge proofs can protect the credential proof itself, but civic platforms need privacy across identity, metadata, wallets, devices, and open-source infrastructure."
author: "Nicolas Gimenez"
date: "September 2024"
type: "tech"
thumbnail: "https://lh7-us.googleusercontent.com/docs/AHkbwyK44xfmb0zN95CAfiTWJ5ULJ_-8DpfWRTy8r23dsV6kahSE4C4X-cZ8W4Ed-n2MT0jfWuolbqR77m1-rt_yXV4xcoojPDahscs3bQ=w1200-h630-p"
image: "https://lh7-us.googleusercontent.com/docs/AHkbwyK44xfmb0zN95CAfiTWJ5ULJ_-8DpfWRTy8r23dsV6kahSE4C4X-cZ8W4Ed-n2MT0jfWuolbqR77m1-rt_yXV4xcoojPDahscs3bQ=w1200-h630-p"
---

The promise of [Zero-knowledge proofs (ZKP)](https://en.wikipedia.org/wiki/Zero-knowledge_proof) is real: a person can prove that they are eligible to participate, unique, over a certain age, or a resident of a jurisdiction without revealing any personal data (PII).

However, ZKP is also narrower than it often sounds.

A zero-knowledge proof protects a proof. It does not automatically protect the user's IP address, browser fingerprint, phone number, email address, wallet implementation, device, operating system, or the many timestamps and behavioral signals created around the proof. If those surrounding layers are not designed carefully, a verifier can still learn who the user is.

This article adapts a [presentation](https://docs.google.com/presentation/d/e/2PACX-1vRKRJW4-ZUHso3o-KzzwemuezH7ifLENCpvJCr9552PlRHzOtyxetsLM-4ghHDwCA/pub?start=false&loop=false&delayms=3000) given to [NGI TrustChain](https://trustchain.ngi.eu/) in September 2024. The central claim is simple: zero-knowledge proofs are an important building block for private civic participation, but user privacy is a full-stack property.

## Why Identity Enters Civic Platforms

Not every online space needs identity verification. There are legitimate use cases for purely pseudonymous communities, where users participate through persistent handles and reputation rather than formal credentials.

Civic participation platforms face a different problem. If the goal is to gather meaningful public input, resist spam, reduce computational propaganda, or support one-person-one-voice processes, then the system needs some form of sybil resistance. In practice, it may need to know that a participant is a real person, belongs to a relevant community, or satisfies a civic eligibility rule.

There are several ways to approach sybil resistance, but each comes with tradeoffs:

- Biometric systems can provide uniqueness, but they create serious privacy and safety risks.
- Social graph systems can be useful in some contexts, but they remain hard to scale and often lack strong privacy guarantees.
- Hybrid web-of-trust approaches can work for certain communities, but they usually provide weaker uniqueness.
- Government or institutional credentials can provide stronger assurances, but they must not become a surveillance layer.

This is where self-sovereign identity and zero-knowledge proofs become attractive. They suggest a way to verify eligibility without asking users to expose more personal data than necessary.

## What Zero-Knowledge Does Well

In a simplified credential flow, three parties are involved:

- The issuer confirms something about a person and issues a credential.
- The holder stores that credential and decides when to use it.
- The verifier checks a proof derived from the credential.

Zero-knowledge techniques can allow the holder to prove a specific claim without revealing the underlying credential. For example, a user might prove that they are over 18 without revealing their date of birth, or prove that they received a credential from a trusted issuer without revealing the credential's full contents.

Several technical approaches can support this pattern. BBS+ credentials allow selective disclosure and unlinkable proofs. Other approaches use Merkleized credentials and ZK-SNARKs to make linkable credential formats more privacy-preserving. General-purpose zkVMs may eventually make it easier to prove facts about existing security-focused credentials.

These tools are valuable because they can provide proof-level issuer unlinkability. In other words, the issuer should not learn where the credential is being used, and different uses of the same credential should not be trivially linked through the proof itself.

That solves an important problem. It does not solve every privacy problem.

## The Threat Model: The Holder Comes First

For civic participation, the privacy model should start from the holder's perspective. The person using the credential must remain in control of what they reveal and to whom.

This requires a stricter threat model than most social platforms use today:

- The verifier, meaning the platform requesting the proof, should not be blindly trusted. It may try to de-anonymize the user unless the system makes that difficult and auditable.
- The issuer is trusted to identify the holder and issue a valid credential, but it should not be trusted to know where, when, or why that credential is later used.
- The issuer and verifier should not be able to collude to identify users through proof presentations.
- Proprietary client code, wallet code, and verifier frontends should be treated as risk surfaces unless they are open-source, inspectable, and ideally audited.

This is very different from the dominant social media model, where platforms are usually trusted to collect, store, and protect personal data responsibly. The history of online platforms gives users many reasons to be skeptical of that trust.

## The Rest of the Privacy Iceberg

The easiest mistake is to treat the zero-knowledge proof as the entire privacy system. In reality, the proof is only one layer.

### Over-Disclosure

Even when a proof is generated in zero knowledge, the verifier can request attributes that are too precise, too numerous, or too rare. A user might not reveal their full identity document, but a combination of attributes can still identify them.

For example, proving a precise age, city, profession, and membership status may be enough to single out a person in a small community. Privacy-preserving systems should prefer coarse predicates and minimum necessary disclosure.

### Network Metadata

A verifier can attempt to link a proof to the user through IP addresses, browser fingerprints, device metadata, or request timing. If the proof is submitted from the same browser session as an identifying login or email verification, the mathematical privacy of the proof may not matter.

Zero-knowledge does not hide the network layer by default. Transport privacy, proxying, logging policies, and careful session separation all matter.

### Cookies and Data Brokers

Third-party cookies, analytics scripts, ad-tech identifiers, and purchased data can all undermine proof privacy. If a verifier embeds tracking code around the proof flow, it may be able to correlate an anonymous proof with a known web identity.

For a civic platform, the proof flow should avoid third-party trackers entirely. Privacy cannot depend on a cryptographic protocol while the surrounding webpage leaks identity through ordinary web infrastructure.

### Email, Phone Numbers, and Account Recovery

Email addresses and phone numbers are convenient, but they are also powerful identifiers. If the verifier associates them with a zero-knowledge proof, the proof may become part of a broader identity profile.

This does not mean civic platforms can never use email or phone numbers. It means these identifiers should be isolated from proof events whenever possible, used only when necessary, and governed by clear retention policies.

### Permanent Identifiers

A zero-knowledge proof can still be linked if the same permanent identifier appears around it. Wallet addresses, DIDs, credential subject IDs, device identifiers, or stable account IDs can all become correlation handles.

Systems that need pseudonymity should use pairwise or context-specific identifiers instead of universal identifiers. The user should not carry the same trace across unrelated civic spaces by default.

### Timing Correlation

Even if identifiers are hidden, timing can reveal relationships. A verifier might correlate the moment a proof is generated with another request, such as a login event, notification click, or page load.

Designers should treat timestamps as sensitive. Batching, delayed submission, minimized logs, and careful separation between authentication and proof presentation can reduce correlation risk.

### Wallet, Device, and Supply-Chain Risk

The proof may be cryptographically sound, but the wallet or client can still leak sensitive data. A proprietary wallet might send telemetry. A compromised SDK might reveal attributes. A malicious frontend might request more than the user realizes.

Open-source code does not magically remove these risks, but closed-source code makes them harder to inspect. For high-trust civic systems, open-source clients, reproducible builds, independent audits, and minimal telemetry should be treated as core infrastructure.

### Behavioral Inference

Machine learning can infer identity from patterns that look harmless in isolation. Writing style, activity times, device behavior, location patterns, and interaction history can all narrow the anonymity set.

This is another reason privacy cannot be reduced to the proof. Anonymous participation also requires product, moderation, and data-retention choices that avoid building unnecessary behavioral dossiers.

## A Better Architecture For Credibly Anonymous Proofs

A privacy-preserving credential flow should be designed around the assumption that the verifier wants to learn more than it should.

At minimum, a civic platform using zero-knowledge proofs should consider the following principles:

- Ask for the least precise proof that satisfies the civic requirement.
- Avoid combining proof presentation with identifying account flows.
- Do not attach phone numbers, emails, wallet addresses, or permanent DIDs to proof events unless the use case truly requires it.
- Keep third-party cookies, analytics, and trackers out of the proof flow.
- Minimize logs, especially IP addresses, timestamps, and request metadata.
- Use context-specific pseudonyms where persistent participation is needed.
- Make the verifier frontend, proof request logic, wallet integrations, and SDKs open-source and auditable.
- Make proof requests understandable to users, so they can see what is being proven and what is not being revealed.
- Prevent issuer callbacks or other mechanisms that would let issuers learn where credentials are used.

The goal is not only anonymous proofs. The goal is credible anonymity: a system where users, auditors, and civil society can inspect whether the platform's privacy claims match its actual behavior.

## Open Challenges

There is still hard work ahead.

First, the user experience is not good enough. Most people cannot reason about credential schemas, selective disclosure, proof requests, issuer unlinkability, or correlation attacks. A safe product must explain privacy properties without expecting users to become cryptographers.

Second, the credential ecosystem is fragmented. BBS+, SD-JWT, mobile driving licenses, passport chips, Merkleized credentials, and zkVM-based proofs all make different tradeoffs. Civic platforms need interoperability without collapsing into the least private common denominator.

Third, sybil resistance and privacy remain in tension. Stronger uniqueness often requires stronger identity evidence. The challenge is to verify only what is necessary and prevent that verification from becoming a general-purpose identity graph.

Fourth, abuse prevention must not recreate surveillance. Anonymous or pseudonymous spaces still need moderation, rate limits, and accountability mechanisms. Those mechanisms should be designed so they do not quietly re-identify everyone.

Finally, open-source is necessary but not sufficient. Published code helps, but users also need reproducible builds, independent audits, clear governance, and deploy-time assurances that the code they inspect is the code they use.

## Conclusion

Zero-knowledge proofs are powerful. They let people prove facts without revealing the underlying data, and they can prevent issuers from tracking where credentials are used.

But proofs are not the whole privacy system. A verifier can still attack the surrounding layers: attributes, metadata, cookies, email, phone numbers, permanent identifiers, timing, wallets, devices, and behavioral patterns.

For civic technology, this distinction matters. If digital identity becomes part of public participation, it must not become another way to watch citizens. Zero-knowledge proofs can be part of the answer, but only when they sit inside a broader architecture built for data minimization, unlinkability, open-source auditability, and user control.

The practical lesson is clear: use zero-knowledge, but do not stop there.

## Further Reading

- [Original presentation](https://docs.google.com/presentation/d/e/2PACX-1vRKRJW4-ZUHso3o-KzzwemuezH7ifLENCpvJCr9552PlRHzOtyxetsLM-4ghHDwCA/pub?start=false&loop=false&delayms=3000)
- [BBS+ presentation at NIST](https://csrc.nist.gov/csrc/media/presentations/2023/crclub-2023-10-18/images-media/20231018-crypto-club--greg-and-vasilis--slides--BBS.pdf)
- [Iden3 documentation on Merkle trees](https://docs.iden3.io/basics/key-concepts/#why-do-we-use-merkle-trees-at-iden3)

---
title: "What Can Ethereum Do for India? The Exam Leak Challenge"
description: "At Devcon 8 in Mumbai, we facilitated a workshop to help the local community deliberate on one of India's most pressing education challenges: exam paper leaks."
author: "Yuting Jiang"
date: "2026-11-14"
type: "case-study"
thumbnail: "/images/resources/devcon8-banner.webp"
image: "/images/resources/devcon-exam-leak-opinion-map.webp"
---

In May 2026, a paper leak led to the cancellation of NEET, India's national medical entrance exam, affecting roughly 2.2 million (22 lakh) students. The cancellation sparked [student protests across India](https://www.hindustantimes.com/education/competitive-exams/neet-ug-2026-cancelled-amid-paper-leak-row-students-parents-and-educators-react-strongly-101778745473158.html), and exam reform became a rallying point for a [broader youth movement](https://apnews.com/article/59d045fbd485635def01b01f3898307b).

At Devcon 8 in Mumbai, we facilitated a workshop to address this challenge. Rather than debate whether canceling the exam was the right call, we asked how to prevent future paper leaks.

Moving the exam to computers was one proposed response. Would that be enough? Who would still need to be trusted, and who could check their work?

We asked participants to act as a mini citizens' assembly. No prior technical knowledge of blockchain was needed. We designed the workshop so people could discuss what the system should guarantee—for example, that a record couldn't be changed after it was created—without using technical terms like “immutability.” There were no right answers, and deciding that a blockchain wasn't needed was a valid outcome.

## Two starting points: the Vault and the Library

<figure class="resource-comparison" aria-label="Two approaches to exam security">
  <div class="resource-comparison-card">
    <img src="/images/resources/devcon-exam-leak-vault.webp" alt="" width="72" height="72" loading="lazy" decoding="async" />
    <strong>The Vault: protect the secret</strong>
    <span>Fewer people ever see the real questions, and every step is secured.</span>
  </div>
  <div class="resource-comparison-card resource-comparison-card--sky">
    <img src="/images/resources/devcon-exam-leak-library.webp" alt="" width="72" height="72" loading="lazy" decoding="async" />
    <strong>The Library: remove the secret</strong>
    <span>All possible questions are public; the paper is drawn at random on exam day.</span>
  </div>
</figure>

These were starting points, not sides that anyone had to stick to.

My co-facilitators helped the teams develop their proposals. [PreeGee](https://x.com/preegee), a Mumbai-based crypto analyst, worked with Team Vault, and Nicolas Gimenez, Agora's CTO, worked with Team Library.

1. **First vote.** Participants used their phones to vote agree, disagree, or unsure on the seed statements in Agora. The initial map showed two groups that roughly matched the starting approaches: Oversight Advocates leaned toward the Vault, and Technologists leaned toward the Library.

   [![First-vote opinion map. Oversight Advocates (10 participants, 56%) favored pre-prepared exams with transparent staff monitoring. Technologists (7 participants, 39%) favored technical safeguards such as AI-generated questions and blockchain transparency.](/images/resources/devcon-exam-leak-first-vote.png)](/images/resources/devcon-exam-leak-first-vote.png)

   _The two opinion groups after the first vote. Select the map to view it full size._

2. **Group work.** About 60% joined Team Vault and 40% joined Team Library. They had seven minutes to post proposals using the template: “To stop leaks, [who] should [do what], as long as [guardrail].”
3. **Second vote.** Participants voted on the new proposals. The map now showed five opinion groups rather than two.
4. **Stress test.** The room began challenging the most divisive proposal before time ran out. There was no final ranking in the session, and we left the Agora conversation open for another week.

Agora formed the opinion groups from voting patterns, not from the wording of statements or which team people joined. An AI model then named and summarized the groups; it did not determine who belonged to them or what they agreed on.

## What the votes revealed

The Agora report records **18 participants, 330 votes, and 22 statements**. Participants wrote 12 of those statements during the session.

![Agora's opinion map after the workshop, showing five groups: Decentralists, Traditionalists, Transparency Advocates, Skeptics, and Hybrid Technologists.](/images/resources/devcon-exam-leak-opinion-map.webp)

_The five opinion groups in the Agora report. One of the 18 participants was not assigned to a group because they voted on fewer than seven statements._

On the map, “Decentralists” refers to participants who favored letting a panel of experts vote on which questions to use, rather than leaving the choice to a single authority.

### Common ground: a draw anyone can check

> If questions are drawn at random, anyone should be able to check the draw wasn't rigged.

This was the only statement the report flagged as approved across all five groups: **83% agreed and no one disagreed.** It was a conditional safeguard, not a vote in favor of random selection, a public question bank, or Ethereum. A publicly verifiable draw is a requirement that engineers can test against different designs. Ethereum is one possible way to support it; the workshop did not establish that it was necessary or that it would prevent leaks on its own.

### What still divided the room

- **Moving NEET to computers would be enough to stop leaks:** 17% agreed, 39% disagreed, and 39% were unsure.
- **The safest exam makes all potential questions public:** 33% agreed and 39% disagreed.
- **A small chance of seeing a near-identical practice question is acceptable:** 61% agreed overall, but both participants in the Skeptics group voted against accepting that risk.

The 50 minutes flew by. In that time, the map went from two opinion groups to five. Agora grouped people by how they voted, regardless of which team they had joined. Writing proposals surfaced disagreements within each team and unexpected coalitions emerged across team lines.

As PreeGee put it at the end of the workshop:

> When we started, it was naturally a very debate kind of format. It's A versus B. But as you start to really get into it and actually design a solution, you do realize that you might disagree with somebody you initially agreed with, and you might find agreement with people that you didn't imagine that you would.

Instead of asking which side should win, we can listen to what matters to people on all sides and look for solutions they can support together, even when other disagreements remain.

We hope this small workshop inspires citizens, communities, and institutions to [try Agora](/resources/facilitation-guide) and find solutions together on the issues that matter to them.

[Explore the original Agora conversation](https://www.agoracitizen.app/project/devcon8/conversation/Z-n7k2Q) · [View the official Devcon Archive entry](https://archive.devcon.org/devcon8/what-can-ethereum-do-for-india-the-exam-leak-challenge/)

Special thanks to [GCC](https://www.gccofficial.org/) for sponsoring Agora and other public goods.

---
title: "What Can Ethereum Do for India? The Exam Leak Challenge"
description: "At Devcon 8 in Mumbai, we facilitated a workshop to help the local community deliberate on one of India's most pressing education challenges: exam paper leaks."
author: "Yuting Jiang"
date: "2026-11-14"
type: "case-study"
thumbnail: "/images/resources/devcon8-banner.webp"
image: "/images/resources/devcon-exam-leak-opinion-map.webp"
---

In May 2026, a paper leak led to the cancellation of NEET, India’s national medical entrance exam, affecting roughly 2.2 million students. The cancellation sparked student protests across India, and exam reform became a rallying point for a broader youth movement.

At Devcon 8 in Mumbai, we asked workshop participants how future paper leaks could be prevented. India’s government had already proposed moving NEET to a computer-based exam. Would that be enough? Who would still need to be trusted, and who could check their work?

We invited participants to act as a mini citizens’ assembly. They could discuss what an exam system should guarantee, such as whether a record could be changed after it was created, without needing to know how a blockchain works. They were free to decide whether a blockchain would help at all.

We used Agora during two short voting rounds to guide the workshop discussion. Seeing the results in real time helped participants test their assumptions, dig into disagreements, and recognize where they already had common ground.

Agora groups people with similar voting patterns and highlights statements that draw support across groups. [Learn how opinion mapping and consensus work in Agora](https://www.agoracitizen.network/#faq)

We started with two statements that took different approaches to exam security. We called them the Vault and the Library.

## Two starting points for exam security

<figure class="resource-comparison" aria-label="Two approaches to exam security">
  <div class="resource-comparison-card">
    <img src="/images/resources/devcon-exam-leak-vault.webp" alt="" width="72" height="72" loading="lazy" decoding="async" />
    <strong>The Vault — Protect the secret</strong>
    <span>“The safest exam is one where as few people as possible ever see the real questions.”</span>
  </div>
  <div class="resource-comparison-card resource-comparison-card--sky">
    <img src="/images/resources/devcon-exam-leak-library.webp" alt="" width="72" height="72" loading="lazy" decoding="async" />
    <strong>The Library — Remove the secret</strong>
    <span>“The safest exam is one where everyone can see all the possible questions, but nobody knows which ones will be asked.”</span>
  </div>
</figure>

The two statements brought out a tension that can be easy to miss when everyone agrees on the goal. Privacy and transparency pull in opposite directions here. Protecting the questions leads you to ask who should have access and how their work should be checked. Publishing the question bank leads you to ask how the final questions should be chosen and how people could verify that choice.

We used the two statements as starting points. My co-facilitators helped the teams turn them into concrete proposals. PreeGee, a Mumbai-based crypto analyst, worked with Team Vault. Nicolas Gimenez, Agora’s CTO, worked with Team Library.

1. **First vote.** Participants used their phones to vote agree, disagree, or unsure on the seed statements in Agora. The first map showed two opinion groups that roughly matched the starting approaches. Oversight Advocates leaned toward the Vault, while Technologists leaned toward the Library.

   <figure>
     <a href="/images/resources/devcon-exam-leak-first-vote.png"><img src="/images/resources/devcon-exam-leak-first-vote.png" alt="First-vote opinion map. Oversight Advocates (10 participants, 56%) favored pre-prepared exams with transparent staff monitoring. Technologists (7 participants, 39%) favored technical safeguards such as AI-generated questions and blockchain transparency." width="736" height="681" loading="lazy" decoding="async" /></a>
     <figcaption>The two opinion groups after the first vote.</figcaption>
   </figure>

2. **Group work.** About 60% joined Team Vault and 40% joined Team Library. They had seven minutes to post proposals using the template “To stop leaks, [who] should [do what], as long as [guardrail].”

3. **Second vote.** Participants voted on the new proposals. The Agora report showed five opinion groups.

   <figure>
     <img src="/images/resources/devcon-exam-leak-opinion-map.webp" alt="Agora's opinion map after the workshop, showing five groups: Decentralists, Traditionalists, Transparency Advocates, Skeptics, and Hybrid Technologists." width="1191" height="669" loading="lazy" decoding="async" />
     <figcaption>The five opinion groups in the Agora report.</figcaption>
   </figure>

4. **Stress test.** The room began challenging the most divisive proposal before time ran out. The session ended before a final ranking, and we left the Agora conversation open for another week.

## What the votes revealed

The Agora report recorded 18 participants, 330 votes, and 22 statements. Participants wrote 12 of those statements during the session.

The most contentious points were whether moving NEET to computers would stop leaks, whether to publish the full question bank, and how much overlap between practice questions and exam questions would be fair.

- **Moving NEET to computers would be enough to stop leaks.** 17% agreed, 39% disagreed, and 39% were unsure.
- **Publishing all possible questions would make the exam safest.** 33% agreed and 39% disagreed.
- **A small chance of seeing a near-identical practice question is acceptable.** 61% agreed overall, while both participants in the Skeptics group disagreed.

As people worked through concrete proposals, some who had agreed at the start found themselves on opposite sides of a specific safeguard. Others found agreement with people who had started from the other approach. The shift from two opinion groups to five showed how much more nuanced the discussion became once participants had to decide how a solution would actually work.

As PreeGee put it at the end of the workshop:

> When we started, it was naturally a very debate kind of format. It's A versus B. But as you start to really get into it and actually design a solution, you do realize that you might disagree with somebody you initially agreed with, and you might find agreement with people that you didn't imagine that you would.

## Common ground

One safeguard drew support across all five groups:

> If questions are drawn at random, anyone should be able to check the draw wasn’t rigged.

**83% agreed, and no one disagreed.** It was the only statement the Agora report flagged as approved across all five groups.

That gives engineers a concrete requirement they can test against different designs. Ethereum is one possible way to support public verification. Whether to use Ethereum, publish a question bank, or choose questions at random remained open.

Fifty minutes gave us time to surface more nuanced disagreements and begin stress-testing one proposal. With more time, we’d ask participants to work through those disagreements by writing and voting on new statements. What could someone who favors the Vault and someone who favors the Library both support? The publicly verifiable draw showed how agreement on one safeguard can give people a place to start building consensus.

We hope this small workshop inspires citizens, communities, and institutions to try Agora and find solutions together on the issues that matter to them. [Read the Agora facilitation guide](/resources/facilitation-guide)

[Explore the original Agora conversation](https://www.agoracitizen.app/project/devcon8/conversation/Z-n7k2Q) · [View the official Devcon Archive entry](https://archive.devcon.org/devcon8/what-can-ethereum-do-for-india-the-exam-leak-challenge/)

<figure>
  <img src="https://d36w59669phgb2.cloudfront.net/workshop-devcon-india.jpg" alt="Six people pose for a group selfie in front of the Devcon India screen at the workshop." width="1600" height="1201" loading="lazy" decoding="async" />
</figure>

Special thanks to [GCC](https://www.gccofficial.org/) for sponsoring Agora and other public goods.

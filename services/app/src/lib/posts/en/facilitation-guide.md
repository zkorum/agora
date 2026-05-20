---
title: "How to Facilitate Events and Deliberation Projects with Agora"
description: "A practical guide for using Agora in events, conferences, workshops, and longer deliberation projects."
author: "Agora Team"
date: "September 2025"
type: "guide"
thumbnail: "/images/facilitation-guide-thumbnail.jpg"
image: "/images/facilitation-guide-thumbnail.jpg"
---

Agora does not replace face-to-face meetings, assemblies, workshops, or online events. It complements them.

The most important question is not only "Which tool should we use?" but "What kind of participation process are we designing?" Agora can support different moments in that process: listening, mapping disagreement, identifying common ground, crowdsourcing ideas, or prioritizing proposals.

A simple way to start is to ask whether you are using Agora for an event or for a longer deliberation project. Each use case calls for a slightly different setup.

Choose your path:

- [I am planning an event or conference](#events-and-conferences)
- [I am designing a deliberation project](#deliberation-projects)

<a id="events-and-conferences"></a>

## Using Agora for Events and Conferences

For an event, Agora can be used as a real-time opinion mapping layer around a topic. It helps participants see the diversity of perspectives in the room, understand where people agree, and identify points of divergence that deserve further deliberation or debate.

This works especially well for panels, conferences, workshops, livestreams, and hybrid events where many people are listening but only a few can speak.

You can use Agora before, during, or after an event.

For a real event example, see [Mapping Consensus on Blockchain in Conservation](https://www.agoracitizen.network/resources/tech4nature), where Agora was used during Tech4Nature's Blockchain Innovation Challenge Workshop to map participant perspectives in real time, surface areas of consensus, and identify the questions that deserved deeper discussion.

### Before the Event

Prepare a few seed statements around the event topic. These statements should represent different perspectives that participants may hold.

If your event has speakers, you can use some of their arguments as seed statements. This helps connect the audience interaction directly to the substance of the event.

Good seed statements are:

- Easy to agree or disagree with
- Clear and specific
- Focused on one opinion per statement
- Diverse enough to surface different viewpoints
- Written as statements, not questions

For example, instead of asking:

"What do you think about AI in education?"

Use statements such as:

- "Schools should allow students to use AI tools if they clearly explain how they used them."
- "AI tools should be banned from graded writing assignments."
- "Every student should be taught how to evaluate AI-generated information."

Each statement expresses one opinion that participants can respond to.

### During the Event

Invite participants to join the Agora conversation through a link or QR code. As people vote and add their own opinions, Agora begins to map patterns of agreement and disagreement.

Facilitators can use the Analysis tab to show where participants broadly agree, where opinions split into different groups, which statements create the strongest divergence, and which ideas could become the focus of further discussion.

<figure style="margin: 1.5rem auto; max-width: 320px;">
  <img src="/images/resources/facilitation-guide-analysis-groups.jpeg" alt="Agora Analysis tab showing opinion groups and a group summary" style="width: 100%; border-radius: 12px; box-shadow: 0 16px 40px rgba(9, 15, 83, 0.14);">
</figure>

One important facilitation tip: if you are presenting the Analysis tab live, consider pausing the conversation first.

If participants continue voting while you are presenting, the analysis may change in real time. The number of opinion groups, group labels, or percentages may shift while people are looking at the screen, which can be confusing. Pausing the conversation gives everyone a stable snapshot to discuss.

You can always unpause later if you want to collect another round of input.

### After the Event

Agora can also remain open after the event. This gives participants time to reflect, add opinions they did not have time to share, and respond to other perspectives.

Post-event results can help organizers understand what resonated, what divided the audience, and what topics deserve follow-up.

<a id="deliberation-projects"></a>

## Using Agora for Deliberation Projects

For a deliberation project, Agora can support a longer participation process. It can be used in two main ways: Conversation Mode and Prioritization Mode.

For a deliberation project example, see [Transforming Frustration into Collective Power](https://www.agoracitizen.network/resources/bloquonstout), where Lyfe Catalyst used Agora during the #BloquonsTout mobilization in France to turn broad public frustration into a structured consultation, mapping shared priorities and points of disagreement across participants.

### Conversation Mode

Use Conversation Mode when the goal is to gather opinions, map perspectives, and crowdsource ideas.

This is useful when the topic is still open and you want to understand what people think before narrowing down proposals. Participants can respond to seed statements, contribute their own opinions, and see how their views relate to others.

Conversation Mode is especially helpful for public consultations, community engagement, citizen assemblies, stakeholder dialogues, early-stage policy discussions, and identifying disagreement before a meeting.

For example, a consultation project might begin with qualitative interviews conducted by sociologists. The insights from those interviews can then be turned into seed statements for an open Agora conversation. This allows thousands of stakeholders to respond, add nuance, and help scale the listening process.

Agora can also be used before local assemblies. Participants contribute their views in advance, and facilitators use the opinion map to identify the most important points for in-person discussion.

Agora's opinion mapping is based on [Red Dwarf](https://github.com/polis-community/red-dwarf), an open-source machine learning algorithm and a reimplementation of the original Pol.is math. The opinion clustering step is deterministic and auditable: it is based on pure patterns of agreement and disagreement, not language. LLMs are only used in the next step, to summarize the representative opinions of each cluster. For Agora Pro users, we also offer a [Jigsaw Sensemaker](https://jigsaw-code.github.io/sensemaking-tools/) report that maps the topics and subtopics of a conversation.

<figure style="margin: 1.75rem auto; max-width: 760px;">
  <img src="/images/resources/facilitation-guide-conversation-summary.jpg" alt="Agora Conversation Mode report showing opinion groups and cluster summaries" style="width: 100%; border-radius: 12px; box-shadow: 0 16px 40px rgba(9, 15, 83, 0.14);">
</figure>

### Prioritization Mode

Use Prioritization Mode when consensus has more or less emerged, or when you already have a clear set of proposals and need a ranked list of priorities.

In this mode, participants compare proposals and express how much they prefer one option over another. This helps the group move from open discussion to clearer collective priorities.

<figure style="margin: 1.5rem auto; max-width: 640px;">
  <img src="/images/resources/facilitation-guide-prioritization-mode.svg" alt="Agora Prioritization Mode interface for selecting the most and least important statements" style="width: 100%; border-radius: 12px; box-shadow: 0 16px 40px rgba(9, 15, 83, 0.14);">
</figure>

For rank voting, Agora uses [Solidago](https://solidago.tournesol.app/). We also implement [COCM](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4311507) to prevent collusion when prioritization is combined with a demographic survey or the opinion cluster data from an open Conversation Mode process.

Prioritization Mode is especially useful toward the end of a process, when facilitators want to understand which proposals have the strongest support.

For example, after workshops or assemblies have produced a shortlist of proposals, Agora can help the wider community rank them. The result is a clearer picture of what participants want decision-makers to prioritize.

## Combining Agora with Other Tools

Agora does not need to be the only tool in a participation process. It can be combined with interviews, surveys, workshops, local assemblies, polling tools, reporting methods, or other civic technology platforms.

The right process depends on your context: the audience, the decision at stake, the timeline, the level of trust, and the type of outcome you need.

Agora also partners with other solutions, so it can be part of a broader participation and deliberation toolkit.

## Facilitation Checklist

Before launching your Agora conversation, clarify:

- What decision or discussion will this process inform?
- Are you using Agora for an event or a longer deliberation project?
- Should you use Conversation Mode or Prioritization Mode?
- What seed statements will help surface meaningful differences?
- Are the statements easy to agree or disagree with?
- Does each statement contain only one opinion?
- When will you show the Analysis tab?
- Should the conversation be paused while presenting results?
- How will the outputs be used after the event or consultation?
- If you are planning an event, review the [Tech4Nature case study](https://www.agoracitizen.network/resources/tech4nature).
- If you are designing a deliberation or consultation project, review the [#BloquonsTout case study](https://www.agoracitizen.network/resources/bloquonstout).

## Ready to Get Started?

Agora works best when it is embedded in a thoughtful process. The design of the participation journey matters more than the tool itself.

If you want dedicated support choosing the right format, curating seed statements, combining Agora with other tools, or designing a full deliberation process, contact us.

[Contact us](mailto:hello@zkorum.com)

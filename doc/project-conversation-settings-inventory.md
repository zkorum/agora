# Project and activity settings — review list

**Current** = in the app today. **Planned** = separate Wiki-survey work. **Proposed** = project-default/activity-override design for review. An activity is a conversation (Polis/mapping or ranking). **Wiki-survey is a way to present Polis statements, not the existing response-survey questionnaire.**

**Default rule for shared settings:** an activity uses its project's setting unless explicitly overridden. Changing the project default changes the effective value of *inheriting* activities, **never explicit overrides**—the same model as facilitator Email Updates today. For activities without a listed project, define a No Project/platform default. Show the effective value and whether it is inherited or overridden. Polis presentation and analysis settings are **conversation-only** and never inherit project defaults.

## 1. Project settings

1. **Identity and page content** — title, slug, subtitle, rich-text description, banner and localized versions. Participants see the project page and its activities. **Current:** project-owned content; activities have separate titles/bodies. **Keep project-only**, rather than live-inheriting page copy.
2. **Languages and Dynamic Translation** — project target languages (up to three), manual translations of project content and optional machine translation. Participants read localized project content. **Current:** activities can inherit the project's language/translation settings or override them; their own content and statements are translated separately. **Keep the existing inheritance choice.**
3. **Owners and attribution** — owning organizations and displayed attribution roles, including localized external organizations. Participants see who is behind the project. **Current:** project-specific; the organization shown as an activity's author is selected separately. **Keep distinct from activity authorship.**
4. **Contact** — name, role, email and/or website, image and affiliation. Gives participants a project contact; contact email also matters for facilitator Email Updates. **Current:** project-only. **Keep project-only** unless an activity-specific contact use case emerges.
5. **Documents** — localized published documents with a participant version and optionally a separate owner version. Participants access the participant file on the project page. **Current:** project-only. **Keep project-owned**; activities could link to selected documents without inheriting/copying files.
6. **Facilitator Email Updates default** — on/off, subject to entitlement and contact requirements. **Current:** activities can inherit or explicitly turn sending on/off. This controls whether facilitators can send manual updates; participants also need eligible email addresses and their own consent/preferences. The hidden No Project scope has its own configuration. **Keep as the reference default/override pattern.**
7. **Project administration** — slug changes, deletion, owner permissions and underlying listed/hidden project status affect availability and management. **Current UI:** project management is under the site-organization-admin settings menu, not a regular facilitator workspace. The public project page is separate and participant-visible. **Target:** give authorized facilitators a place to see and manage their own projects. Do not confuse project directory status with an activity's Listed/Unlisted setting.

## 2. Activity settings and participant effects

### Access and lifecycle

1. **Visibility (`isIndexed`)** — Listed appears in the Agora feed; Unlisted is link/QR-accessible. On a listed project's activity list, an unlisted activity can still have a non-clickable invitation-only card, without exposing its direct link. “Private” here is **not** named-person access control. **Current:** conversation-only at creation/import/edit; new drafts default to Listed. **Proposed:** project default + activity override.
2. **Who can participate (`participationMode` + optional event ticket)** — Guest, account, verified email, or strong verification (phone/passport) to vote and contribute; an event ticket can additionally be required. Anyone with the link can still read, subject to availability/moderation. **Current:** conversation-only at creation/import/edit; new drafts default to Account required, without a ticket. Ticket use is entitlement-gated (currently `devconnect-2025`); a ticket cannot be *added* after publication, though existing requirements may be changed or removed under edit rules. **Proposed:** project default + activity override for participation requirements, including a ticket if configured; show the effective requirement before participation. Resolve how live changes to an inherited ticket requirement respect the current no-add-after-publication rule.
3. **Open / closed** — closing blocks new votes/contributions but leaves the activity readable; facilitator can reopen it. **Current:** activity lifecycle action. **Keep as an action**, not a live inherited default.
4. **Moderation** — conversation locks and hidden/moved statements affect voting and the visible statement pool. **Current:** moderation actions/status, not facilitator defaults. **Keep separate**; List and Wiki-survey must apply identical eligibility/moderation rules.

### Format and participation flow

5. **Activity type** — Polis/mapping (statements, votes, opinion groups) or ranking/MaxDiff (items and comparisons; currently BWS). **Current:** chosen at creation, not a normal edit-time switch. **Keep conversation-only:** each activity has its own format.
6. **Polis presentation: List / Wiki-survey** — **Planned, not in the app yet; conversation-only.** List remains the default for existing/imported Polis activities. Facilitators can switch after publishing or voting; statements, votes, groups and analysis stay the same.
   - **Participant experience:** List retains statement lists. Wiki-survey shows one eligible unanswered statement at a time on Discover (routing priority) or New (newest-first), with Disagree / Unsure / Agree, a remaining count and an all-caught-up card that reopens for new eligible statements. My votes, Moderated and moderator-only Hidden remain lists; My votes supports changing answers.
   - **Embed:** every Polis embed uses the card regardless of the main-view setting, retaining Analysis and the add-statement composer. Ranking is unaffected.
   - **Scope:** chosen on each Polis conversation; **no project default or inheritance**. Embeds have fixed card behavior. The separate implementation must count beyond the current list cap and avoid repeating answers while votes are buffered.
7. **Title and body** — facilitator's prompt/context, editable with an “edited” indicator. **Current:** activity-specific content. **Keep activity-owned**; a project template for new activities is a different feature.
8. **Initial statements, imports, external source** — manual seed statements (up to 50), Polis URL/CSV imports, or GitHub issue source for ranking items. Participants see the resulting content. **Current:** activity-specific source/data, not settings to inherit.
9. **Response survey / questionnaire** — separate from Wiki-survey. Optional or required for participation; a required questionnaire gates voting/contributing and affects analysis eligibility. Questions have their own required/optional flags and order; choice questions configure options, layout, selection limits and public-aggregate suppression, while free-text questions can constrain rich text or integers. Edits can require participants to update responses. **Current:** activity-specific, entitlement-gated. **Decision:** project *template* for new activities if needed; do not live-inherit questions/answers into ongoing activities.

### Analysis, language and communication

10. **AI opinion-group labels** — LLM-generated group labels/summaries. **Current:** on by default per Polis conversation. **Keep conversation-only.** Changes descriptions, not votes or clustering.
11. **Preferred opinion-group count** — Auto or 2–6 groups in the facilitator-preference analysis view, entitlement-gated. **Current:** per Polis conversation; Auto by default. **Keep conversation-only.** Does not force a vote outcome or change statements.
12. **Activity languages and Dynamic Translation** — conversation-specific language targets (up to two additional in the override input) or inherited project targets, plus translation enablement; authored content's source language is detected. **Current:** inheritance/override already implemented. Participants see available translated content. **Decision:** whether language targets and machine translation need *separate* overrides instead of today's combined setting.
13. **Facilitator Email Updates** — inherit the project/No Project default, explicitly on, or explicitly off. **Current:** implemented for manual creation/edit, subject to eligibility/configuration. Participants receive updates only according to their own consent and preferences. **Keep.**

## 3. Personal workspaces and other scopes

- **Participant workspace:** a list of conversations the person has participated in, distinct from conversations they merely visited or facilitated. Participation may include voting, contributing a statement, ranking or answering a questionnaire; the exact inclusion rule needs a decision. **Target:** give participants a consolidated way back to these activities; the current profile does not provide this as a dedicated list.
- **Facilitator workspace:** a list of conversations the person **created**, distinct from their participant history. Conversations they can manage but did not create can be shown separately. **Current:** the profile's conversation list is based on `conversation_edit` capability for projects, so it may include conversations authored by others in those projects. **Target:** make the created/managed distinction clear and surface the facilitator's projects there too.
- **Participant/account choices** (owned by each person, not overridable by a facilitator):
  - Display language and spoken languages.
  - Email consent and global, project and conversation update preferences.
  - Votes (including Unsure/pass) and response-questionnaire answers.
  - Muted users, username, verification credentials and sessions. Participation requirements can ask for a credential; they cannot set one for the participant.
- **Organization and premium access** (who can facilitate, not activity defaults):
  - Organization identity, profile and membership.
  - Ownership and management permissions.
  - Feature entitlements.
  - **Current UI:** organization and project management appear in site-organization-admin settings, not in a regular facilitator workspace. **Target:** make the organization settings relevant to authorized facilitators visible/manageable from their workspace, with the same authorization rules; leave site-wide administration separate.
- **Participant navigation** (views, not separate project policies):
  - Discover, New, My votes, Moderated and moderator-only Hidden.
  - Analysis; Wiki-survey changes Discover/New presentation only for that Polis conversation's main view, while its embed always uses the card.
- **Results and operations** (separate permissions or lifecycles):
  - Survey results access is permission-driven, not a project-default toggle.
  - Moderation decisions, import progress and deletion.
  - Exports, analysis snapshots, scores, translation jobs and delivery safeguards.

## 4. Decisions still needed

1. **Shared defaults:** add project defaults for visibility and participation requirements (including how an optional event ticket fits); languages and Email Updates already provide working precedents. Polis presentation and analysis settings stay on each conversation.
2. **Existing activities:** preserve their current effective visibility and participation requirements when introducing defaults. Decide which are recorded as explicit overrides before they can start inheriting; existing Polis conversations remain List for the planned mode rollout.
3. **Live changes:** inherited activities follow the project default, explicit overrides do not. Specify participant communication/UX when an inherited access requirement changes mid-activity; a newly required ticket must respect the no-add-after-publication restriction. Existing votes and answers remain intact.
4. **Applicability:** Polis-only settings must not affect ranking or appear among project defaults. The Wiki-survey presentation and response-survey questionnaire remain independent; embeds always use the Polis card and continue to enforce survey/auth/moderation rules.
5. **Personal views and management:** define what counts as “participated,” distinguish created versus merely manageable conversations, and expose authorized project/organization settings in the facilitator workspace instead of only the admin menu.

## Source map

- Project admin and data: `services/agora/src/pages/settings/account/administrator/project/index.vue`; `services/shared-backend/src/schema.ts` (project, documents, contact, conversation and config tables).
- Activity create/edit and participant UI: `services/agora/src/components/newConversation/NewConversationControlBar.vue`; `services/agora/src/pages/conversation/new/create/index.vue`; `services/agora/src/pages/conversation/[conversationSlugId]/edit/index.vue`; `services/agora/src/components/post/`.
- Contracts and participation: `services/shared/src/types/dto.ts`; `services/shared/src/types/zod.ts`; `services/shared/src/types/sse.ts`; `services/api/src/service/participationGate.ts`.
- Inheritance and edge cases: `services/api/src/service/administrator/project.ts` (refreshes inherited languages), `services/api/src/service/postEdit.ts` and `services/api/src/service/premiumEntitlement.ts` (edit and ticket rules), `services/api/src/service/projectPage.ts` (unlisted project cards), `services/api/src/service/conversationAccess.ts` (results access roles).
- Current profile and admin navigation: `services/agora/src/pages/user-profile/conversations/index.vue`, `services/api/src/service/user.ts` (`getUserPosts`), `services/agora/src/pages/settings/index.vue` (site-organization-admin links).

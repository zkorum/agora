# Agora navigation prototype — existing-feature audit

Reviewed against the **current local checkout**, including ongoing working-tree changes, on 20 September 2026. “Exists” below means there is a user-facing implementation in this checkout; it does not certify production deployment or availability to every account. Permissions, entitlements, feature flags and data readiness still apply.

## Important corrections to the first prototype

1. A consultation is a focused destination. Global discovery and facilitation belong behind **Account & more** there, not in a persistent public navbar, bottom tab bar, or promotional sidebar.
2. Participant and facilitator **dashboards** need their own visible menus. Profile, settings and credentials remain shared account functionality, not duplicated identities.
   “My conversations/consultations” refers to authored or managed work and belongs under **Facilitate**. The participant menu uses **Overview**, Recently visited, My contributions and Results. Its overview may show places the person contributed to, without labeling those places as their creations.
3. The builder omitted existing **language, project-selection/inheritance, and email-update controls**.
4. Email updates are not just a subscription checkbox: there are activation defaults, conversation overrides, recipient eligibility, participant preferences, composing, review, test delivery, sending and history.
5. The existing analysis report is generated from analysis, with PDF/image downloads. “No report published yet” incorrectly conflated that with a manually uploaded project document.
6. Existing “Private” conversation copy describes link/QR visibility. The proposed “Unlisted” label must not be mistaken for a new access-control implementation. Project/activity visibility, eligibility and document access are distinct.
7. Automatic group labels, analysis variants and checkpoints exist. The mockups’ proposal intake/refinement, pre-moderation and AI-assisted screening must not be presented as generally implemented simply because they appear in an HTML mockup. **Quadratic and plural voting are explicitly included in the requested prototype**, while their broader UI and credit hybrid are distinguished from the currently active scoring path.

## Feature inventory and proposed home

### Latest builder merge: the user's feedback governs (10)

The builder now uses **Mapping**, **Proposals**, and **Prioritising**, following Puja's user-facing terminology. Internal `conversation` identifiers remain unchanged. Talking/Listening and a separate unstructured-discussion stage are omitted.

| Source / feedback                         | Result in the revised builder                                                                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (10)'s visible deliberation process       | One draggable sequence of descriptive activity cards, rather than separate ordering chips and a second representation of the same sequence                 |
| Simplify without reducing flexibility     | Three steps: Build → Presentation & team → Review & publish; advanced controls are folded into their activity                                              |
| Project should happen behind the scenes   | Choose the first activity, not “conversation versus project.” Adding a second activity automatically groups the process into a shared project              |
| Combining elements is paid                | Two or more activities, including repeated rounds, require Agora Pro before publication; saving a draft does not require plan activation                   |
| Reordering and repeating                  | Real HTML drag-and-drop, accessible earlier/later buttons, removal, repeat-at-the-end, and reset-order without erasing configured activity content         |
| Unusual sequences should remain possible  | Prioritising can be first with an existing shortlist. The builder gives guidance rather than requiring a preceding Mapping/Proposals activity              |
| Per-activity participation and visibility | Both controls are exposed on every card. Optional inherited consultation defaults do not overwrite explicit activity settings                              |
| One survey concept                        | One question schema/editor/renderer serves shared onboarding, per-activity onboarding and proposal collection; no separate proposal-form engine            |
| Restore (4)'s flexibility                 | List / one-statement-at-a-time Mapping; Pairwise and BWS; quadratic + plural combinations; language and email-update settings; working participant preview |
| Mobile editing                            | Edit / Participant preview switch; data remains in the same working draft                                                                                  |
| Connected lifecycle                       | Draft → account save → plan confirmation if needed → dashboard → participant page; edits use a working copy                                                |

Proposal collection is a **prototype product addition using the shared question mechanism**, not a claim that the live API already accepts a third conversation type. Upcoming prioritising activities can be published before their options exist; an open activity still needs a valid shortlist. Reordering is not automatic stage scheduling.

### Commercial offer supplied by the user

**Agora Pro: €600/month, including two team members.** Additional members are **€50/person/month**. Educational institutions and NGOs receive **25% off** in exchange for user feedback and collaboration on a case study or research paper.

Included:

- Combining activities into a shared project.
- Organization logo and branded projects.
- Team members posting as the organization and moderating all its conversations.
- One hour of onboarding and platform training, included **once at project start**.
- A short demographic survey before Mapping or Prioritising, with demographic breakdowns in Analysis.
- Advanced opinion mapping control.
- Email notifications to participants.

**Bespoke is separate:** dynamic translation of contributions; a customized Machine Learning Report inspired by Jigsaw Sensemaker; a dedicated remote facilitator at **€120/hour**. A bespoke request does not activate these services or add an invented price to the monthly Pro fee. The standard generated analysis report is distinct from the bespoke customized ML report.

The quote demonstration applies the 25% discount to the monthly Pro subtotal including additional seats: three members cost €650/month, or €487.50 with that discount. This discount scope is made explicit in the prototype; bespoke quotes are separate. Plan activation and invitations are local simulations, with no payment collection or email delivery.

The inventory below records existing code; its earlier conceptual locations such as “Basics → Project” should now be read through the activity-first flow. Adding to an existing project starts from its dashboard, which supplies that context automatically.

Paths below are relative to `services/agora/src/`.

| Area                          | Existing breadth                                                                                                                       | Proposed home                                                                        | Evidence / qualifications                                                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discovery                     | Home feed: Following/Popular, New, new-content indicators, featured conversation                                                       | Explore → Feed                                                                       | `pages/index.vue`; Following depends on login; featured content is configured                                                                                         |
| Discovery                     | Browse/follow/unfollow topics; topic pages                                                                                             | Explore → Topics                                                                     | `pages/topics/index.vue`, `pages/topic/[topicCode].vue`; following asks for login                                                                                     |
| Notifications                 | Notifications, unread state, badges, links back to target content                                                                      | Both dashboard menus → Notifications                                                 | `pages/notification/index.vue`                                                                                                                                        |
| Participation                 | React to statements, add statements, change votes; new-content refresh                                                                 | Activity → Statements                                                                | `components/post/ConversationCommentTab.vue`, `components/post/comments/CommentSection.vue`                                                                           |
| Statement browsing            | Discover, New, My votes, Moderated, permission-gated Hidden views                                                                      | Activity → Statements → Filters                                                      | `ConversationCommentTab.vue`; hidden statements are not universal participant access                                                                                  |
| Statement actions             | Share, report, mute user, own deletion; privileged moderation/reports                                                                  | Statement overflow                                                                   | `utils/actions/definitions/comments.ts`                                                                                                                               |
| Conversation actions          | Edit, close/reopen, soft-delete, report, mute, moderation history, privileged report review                                            | Activity dashboard / local overflow                                                  | `utils/actions/definitions/posts.ts`; action-specific authorization                                                                                                   |
| Sharing                       | Copy link, QR code, native sharing when available                                                                                      | Consultation overflow / dashboard → Share                                            | `utils/actions/definitions/share-actions.ts`                                                                                                                          |
| Embedding                     | Embedded conversation and analysis routes, embed-link action                                                                           | Share & embed                                                                        | `pages/conversation/[postSlugId].embed*`, `utils/actions/definitions/posts.ts`                                                                                        |
| Participation eligibility     | Guest, account required, email verification, strong verification                                                                       | Builder → Activity → Participation                                                   | `components/newConversation/dialog/LoginRequirementDialog.vue`                                                                                                        |
| Event access                  | Event-ticket requirement and ticket verification                                                                                       | Builder → Activity → Participation → Event access                                    | `EventTicketRequirementDialog.vue`, `components/zupass/`; conditional availability                                                                                    |
| Onboarding                    | Activity-specific survey/verification steps; return to conversation and intended action                                                | Activity participation flow                                                          | `pages/conversation/[postSlugId].onboarding/`, `stores/loginIntention.ts`                                                                                             |
| Survey responses              | Answer summary, edit answers, withdraw response where permitted                                                                        | Activity → My responses                                                              | `pages/conversation/[postSlugId].onboarding/summary.vue`                                                                                                              |
| Opinion analysis              | Summary, Me, Groups, Agreements, Disagreements, Divisive, Survey                                                                       | Activity → Analysis                                                                  | `components/post/analysis/AnalysisPage.vue`; survey only when present                                                                                                 |
| Historical analysis           | Checkpoint timeline, historical frames, live/pause controls                                                                            | Analysis → Timeline                                                                  | `AnalysisPage.vue`, `MaxDiffResultsTab.vue`                                                                                                                           |
| Analysis variants             | Analysis-view selection; preferred group count                                                                                         | Analysis / Builder → Advanced analysis                                               | `AnalysisPage.vue`, `AnalysisPreferenceDialog.vue`; availability checks apply                                                                                         |
| AI descriptions               | Enable/disable opinion-group labeling                                                                                                  | Builder → Advanced analysis                                                          | `NewConversationControlBar.vue`, `AiLabelingOptionsDialog.vue`; not the grouping algorithm itself                                                                     |
| Prioritization                | Best/worst comparisons, personal ranking, community results, survey; lifecycle views for supported linked items                        | Activity → Prioritize / Analysis                                                     | `components/post/maxdiff/MaxDiffResultsTab.vue`; not evidence of general quadratic voting                                                                             |
| Analysis report               | Generated report, group tables/maps, agreement/disagreement/divisive statements, survey display, ordering, PDF and image ZIP downloads | Activity → Report; dashboard → Reports                                               | `components/post/report/page/ConversationReportPage.vue`; narrow-screen handling exists                                                                               |
| Data export                   | Request export, active/cooldown state, history, status/download page                                                                   | Activity → Export                                                                    | `pages/conversation/[conversationSlugId]/export.vue`, `export.[exportId].vue`; flag/auth/readiness checks; ranking export is explicitly unsupported here              |
| Creation                      | Post as personal account/organization, rich title/body, conversation/prioritization, visibility, seed statements/options               | Builder → Basics / Activities                                                        | `pages/conversation/new/create/index.vue`, `new/seed/index.vue`                                                                                                       |
| Creation flow                 | Optional gated survey step after seeds; draft restoration around login                                                                 | Builder → Activity → Survey                                                          | `new/seed/index.vue`, `new/survey/index.vue`; the current `new/review` route redirects to seeds                                                                       |
| Import                        | Polis URL import; Polis CSV upload; active import/status page                                                                          | Facilitate → Import; builder source choice                                           | `PostTypeDialog.vue`, `pages/conversation/import/[importSlugId].vue`; feature access applies                                                                          |
| GitHub source                 | Repository/label configuration, issue preview and sync action                                                                          | Builder → Prioritization → Source                                                    | `MaxDiffSourceDialog.vue`, `new/create/index.vue`, `new/seed/index.vue`, `posts.ts`; allowlisted/gated, not universal                                                 |
| Project assignment            | Choose an available project while creating; no-project choice                                                                          | Builder → Basics → Project                                                           | `CreateConversationProjectLanguageSettings.vue`; edit mode disallows changing project selection in `pages/conversation/[conversationSlugId]/edit/index.vue`           |
| Conversation language         | Automatic/source language, additional languages, dynamic translation                                                                   | Builder → Languages                                                                  | `ConversationLanguageSettingDialog.vue`, `ConversationAdditionalLanguagesDialog.vue`; dynamic translation entitlement checks                                          |
| Project-language inheritance  | Inherit project languages or override for conversation; dynamic translation override                                                   | Builder → Activity → Languages                                                       | `CreateConversationProjectLanguageSettings.vue`                                                                                                                       |
| Participant language          | Project language selection and original/translated content controls                                                                    | Consultation-local controls                                                          | `components/project/ProjectPageView.vue`, `components/translation/`; must not require exiting to the dashboard                                                        |
| Project presentation          | Title, slug, subtitle, rich body, banner, localized content                                                                            | Project dashboard → Settings → Presentation & languages                              | `pages/settings/account/administrator/project/index.vue`; currently administrator UI                                                                                  |
| Project ownership/attribution | Multiple owner organizations; sponsor/partner attributions; organization/external attribution localization                             | Project dashboard → Settings → Organizations & attribution                           | Same project administrator page; do not turn expert affiliation into ownership                                                                                        |
| Participant contact           | Name, role, email/website, image, associated organization                                                                              | Project dashboard → Settings → Participant contact                                   | Same project administrator page                                                                                                                                       |
| Documents                     | Upload/manage documents; participant and owner-only versions; localized names; HTML/PDF previews and downloads/CSV download            | Project dashboard → Documents; participant project → Documents                       | `components/administrator/project/ProjectDocumentManager.vue`, `components/project/ProjectDocuments.vue`; current working-tree functionality, version-specific access |
| Update activation             | Project-level enablement; participant contact email prerequisite; capability/entitlement checks                                        | Project settings → Email updates                                                     | `ProjectConversationUpdatesActivation` usage in project administrator page                                                                                            |
| No-project update defaults    | Organization’s standalone-conversation defaults and contact                                                                            | Organization settings → Email updates                                                | `components/administrator/organization/OrganizationNoProjectEmailUpdates.vue`                                                                                         |
| Creation-time updates         | Inherit scope default / On / Off for conversation; project/no-project scope; contact prerequisite                                      | Builder → Activity → Email updates                                                   | `CreateConversationUpdatesSettings.vue`, `createConversationUpdatesSettingsLogic.ts`                                                                                  |
| Update reach                  | Participation-mode and configuration changes can affect reachable audience                                                             | Builder → Participation / Email updates                                              | `ConversationUpdatesPartialEmailReachDialog.vue`, related reach logic; keep the existing explanation rather than implying everyone gets email                         |
| Compose updates               | Scope and conversation selection, reply-to, audience estimate, subject, rich message                                                   | Facilitate → Email updates; project/activity-scoped entry                            | `pages/email-updates/index.vue`, `ConversationUpdateComposerForm.vue`                                                                                                 |
| Review/send updates           | Review snapshot, test to verified sender, confirmation, send/reconcile states; owner-copy counts                                       | Email updates → Review                                                               | `ConversationUpdatesWorkspace.vue`; actual send gates matter                                                                                                          |
| Sent history                  | History list, previews, pagination, context-specific entry                                                                             | Email updates → History                                                              | `ConversationUpdatesWorkspace.vue`, history components                                                                                                                |
| Participant email preferences | Global pause, project preferences, conversation preferences, search, focused entry                                                     | Shared settings → Email updates; consultation overflow → This consultation’s updates | `ConversationUpdatePreferenceSettings.vue`, `ProjectEmailUpdatesMenu.vue`                                                                                             |
| Recipient links               | Token-based preferences, unsubscribe, report paths                                                                                     | Email footer → recipient action                                                      | `pages/email-updates/preferences/[token].vue`, `unsubscribe/[token].vue`, `report/[token].vue`; not general dashboard navigation                                      |
| Profile                       | Username/avatar identity, created-conversation count, joined date, Conversations/Statements tabs                                       | Both dashboard menus → My profile                                                    | `pages/user-profile.vue`, `pages/user-profile/`                                                                                                                       |
| Edit profile                  | Change username                                                                                                                        | Shared settings → Profile                                                            | `pages/settings/account/profile/index.vue`                                                                                                                            |
| Personal languages            | Display language; additional spoken languages                                                                                          | Shared settings → Languages                                                          | `pages/settings/languages/`; spoken-language controls for known guest/logged-in identities                                                                            |
| Credentials                   | Email, phone availability, passport/ID verification status; add/upgrade flows                                                          | Shared settings → Account & verification                                             | `pages/settings/index.vue`, `stores/authentication.ts`; email is not strong verification                                                                              |
| Sessions                      | Current and other devices, revoke session, logout all/current                                                                          | Shared settings → Sessions                                                           | `pages/settings/account/sessions/index.vue`; logged-in account functionality                                                                                          |
| Content preferences           | Muted users and unmuting                                                                                                               | Shared settings → Content preferences                                                | `pages/settings/account/content-preference/index.vue`                                                                                                                 |
| Account lifecycle             | Logout; delete registered or guest account                                                                                             | Shared settings → Account                                                            | `pages/settings/index.vue`; different visibility for guest and registered identities                                                                                  |
| Organization administration   | Create/manage localized organization, member add/remove, slug/deletion, standalone email defaults                                      | Site administration → Organizations                                                  | `OrganizationManagePanel.vue`, organization admin route; site-admin surface, not automatically every facilitator’s workspace settings                                 |
| Entitlements                  | Premium entitlement administration                                                                                                     | Site administration → Entitlements                                                   | `pages/settings/account/administrator/premium-entitlements/index.vue`; site organization admin only                                                                   |
| Legal/help context            | Privacy, terms, community guidelines; configured roadmap conversation                                                                  | Shared settings / About                                                              | `pages/settings/index.vue`, `pages/legal/`                                                                                                                            |

## Prototype treatment

- Primary participation, creation and management transitions remain interactive.
- Dashboards expose the missing capability families; deeper entries describe the real controls and their current implementation locations rather than silently ending in a toast.
- A **feature map** in the HTML makes the breadth independently inspectable, with source evidence and access qualifications.
- Prototype-only configuration is labeled. It must never claim an email was sent, a live account was changed, a real translation ran, or a real export was produced.
- Mockup-only/proposed features remain separate from this inventory. “Talking” remains omitted.

### Existing participant-page presentation

The project and project-conversation views now adapt the current Vue components' markup, styling and assets into the HTML prototype. They retain the banner, overlapping activity header, activity cards, attribution/contact areas, mobile details sheet, documents and project footer. This is a static adaptation of the existing components, not a mounted Vue application.

Source components under `services/agora/src/components/project/`:

- `ProjectPageView.vue`, `ProjectConversationView.vue`, `ProjectConversationHeaderCard.vue`, `ProjectActivityCard.vue`.
- `ProjectDetailsAside.vue`, `ProjectAttributionSection.vue`, `ProjectContactCard.vue`, `ProjectMobileDetails.vue`.
- `ProjectDocuments.vue`, `ProjectDocumentListItem.vue`, `ProjectPageFooter.vue`.
- `ProjectLanguageSelect.vue`, with the searchable-sheet interaction from `components/ui-library/ZKSearchableBottomSheetSelect.vue` and `ZKBottomDialogContainer.vue`.

The only new account entry on these participant views is a small **Guest / personal-name menu** within the banner. Search for Common Ground stays in the project-owner attribution area; it is never presented as the guest's identity. Wider navigation and authorized management returns are available through the personal menu. Email preferences require the simulated email credential, and sessions require a signed-in identity.

The banner language control opens a searchable bottom sheet, supports keyboard selection, and persists the project language across its pages. Amplify's English, Kyrgyz and Russian selections switch the corresponding banner asset, localized project presentation and supported interface labels while preserving votes. Activity contributions remain illustrative source text; this does not simulate a real translation service.

Builder previews and participant pages call the **same renderers**, with read-only controls and container-based mobile layouts in the preview. Branding colors persist when fields or the selected preview page change. Sharing from an activity targets that activity's URL; project sharing retains the project URL.

Document interactions demonstrate participant-versus-owner access. The HTML viewer uses the existing sandboxed report fixture. PDF and CSV content are generated illustrative samples, not actual project exports. Closing a generated-document viewer releases its temporary object URL.

#### Opening the prototype and local dependencies

Open `doc/agora-connected-journeys.html` in this checkout. Useful hash routes include `#/project/amplify`, `#/project/amplify/conversation/ideas`, `#/new` and `#/facilitate`.

The HTML references these local resources and is **not a self-contained file for redistribution**:

- Banners and attribution images in `services/agora/public/local-project-assets/project-page/`.
- Civic Union logos in `services/agora/src/assets/project-page/`.
- The report fixture at `services/agora/src/components/dev/projectDocuments/fixtures/project-document-report.html`.
- `services/agora/node_modules/jspdf/dist/jspdf.umd.min.js` for PDF sample generation.

#### Verification

Chrome/Playwright checks passed for:

- Participant-page layout measurements against the running `/dev/project-conversation-layout` Vue page: banner height, shell/header/sidebar widths, header overlap/radius, title size and grid gap all differed by less than one pixel at the checked desktop viewport.
- Guest identity and credential-aware menus, activity sharing, language search/keyboard selection/persistence, vote preservation, document access/view/download, viewer URL cleanup, management return and shared preview rendering/colors.
- Native activity drag/drop, keyboard reordering, repeated/removed activities, per-activity policies, shared onboarding and proposal questions, proposal-to-shortlist copying, branding, Pro publication gates and seat/discount calculations.
- Quadratic/linear credit budgets, independent plural options, saved ballots, source validation, pairwise/BWS interactions and alternative result views of the same ballot.
- Responsive flows at 360, 390, 768 and 1440 pixels, with no detected horizontal overflow or prototype runtime errors in the exercised routes.

### Quadratic voting alongside plural voting

The intended relationship is documented in the user's existing explainers:

- `~/Downloads/solidago-quadratic-plural-brief.html`, especially sections 1–3 and the proposed builder.
- `~/Downloads/puja-builder-feedback.html`, section 6, “Extend Prioritization Instead of Replacing It.”

The revised prototype separates three choices:

1. **Participant interaction:** Pairwise, Best / worst, or Allocate credits.
2. **Credit pricing:** Quadratic (`v` support votes cost `v²` credits) or linear (`v` votes cost `v` credits).
3. **Collective aggregation:** Standard or specified plural adjustment. Plural can accompany either comparison interaction or either credit-pricing rule.

For credit ballots, **Quadratic voting** and **Plural voting** are shown alongside one another as independent checkboxes. Both can be enabled. The group selector includes opinion groups, affiliation and region. Opinion-group use asks for a linked source conversation; survey/membership dimensions likewise need corresponding data in the real implementation.

An optional comparison presents **Quadratic tally** alongside **Plural-adjusted quadratic tally**, or the equivalent labels for linear points/comparisons. These are views of the same submissions. Comparison judgments are never silently reinterpreted as a quadratic-credit ballot. Changing credit pricing/budget uses a distinct local ballot key, while changing only plural settings reuses the same input ballot.

The participant credit demo enforces the budget, supports revising allocations, preserves submitted ballots, and displays the user's own allocation separately from community results. The results screens do not fabricate plural scores, rank changes or winners. The demonstrated hybrid is **group-weighted ordinary votes**, not a claim that it equals the paper's non-additive `√F_plural` construction or inherits its theoretical guarantees.

The experimental group-aware voting-rights integration in the Solidago scoring worker has been removed. BWS uses standard `AffineOvertrust` voting rights; the plural options described above are prototype behavior rather than active production plural aggregation or an implemented credit-ballot backend.

**Try it:** top strip → Try a journey → Quadratic + plural · one ballot. In the builder, add **Prioritising** and open **Choose ballot & voting options**.

### Recent visits, including guests

The supplied `agora_participant_discover.html` already contains a return-to-project strip and wording about participation history. That is useful precedent, but is not proof of an implemented general browsing-history feature in the app.

The revised proposal explicitly separates **recent visits** from **contributions**. Merely opening a project or conversation records its most recent page in this browser, even without authentication or a vote. My participation and the landing page can show “Last visited”; the dashboard has a Recently visited screen. There is one latest entry per consultation, capped at 50, including direct unlisted links. Clearing it retains votes, contributions and drafts. This is local-browser state; cross-device synchronization is not assumed.

### Proposed project participation defaults

The builder now demonstrates:

- A project-wide default requirement group.
- Activities that inherit it, including newly added activities.
- An explicit per-activity override that replaces that group.
- ALL selected requirements (AND) or ANY selected requirement (OR).
- Distinct account, verified email, strong verification and event-ticket requirements.
- A visible effective-rule summary in the editor, preview, project activity cards and participant page.

The prototype uses one flat ALL/ANY group. Arbitrary nested expressions and automatic additive inheritance are not claimed. If an activity needs the project requirements plus another condition, its custom ALL group must include both. Replacing defaults is made explicit so a facilitator does not accidentally assume that an override only adds restrictions. A production version needs a validated policy model, consistent backend enforcement and credential-specific eligibility rules; this HTML only simulates successful checks.

## Authentication recommendation grounded in current code

`stores/authentication.ts` already distinguishes unknown visitors, known guests, registered accounts and credentials. `stores/loginIntention.ts` preserves contextual intentions such as voting, new statements, new conversation creation, settings and email updates. Reuse that model; do not introduce a facilitator account type.

The current create page prompts login when advancing its initial submission. Allowing a guest to explore more of a new builder before saving/publishing is a **proposed UX adjustment**, not a statement that the current creation flow already works that way. Guest upgrade must retain identity and contributions; signing into a different existing account needs the existing linking/recovery policy, not an invented silent merge.

Figma’s local desktop MCP was contacted, but both provided nodes were inaccessible. No Figma-frame inspection is claimed.

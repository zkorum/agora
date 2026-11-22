# Agora glossary

Headings give the canonical terms to use when writing code. **Other code names**
records existing synonyms, marking historical names where relevant; **UI**
gives the visible wording used in i18n. A historical name is not necessarily
ambiguous or a candidate for renaming.

Names are scoped by meaning: different labels can name one concept, and the same
UI label can name different concepts. Apply normal casing and pluralization.

## Conversations and contributed content

### conversation

A structured participation exercise.

- Other code names: `activity*`.
- UI: activity (EN); activité (FR).

### polis

A conversation that maps agreement and disagreement through opinion votes and
analysis of voting patterns.

- Other code names: `mapping`.
- UI: Mapping (EN).

### gathering

A conversation collecting free-text responses using a fixed response format.

- UI: Gathering (EN).

### gatheringMode

Whether a Gathering starts a new response collection or an amendment round based
on copied responses from an earlier Gathering. This is separate from whether new
participant responses are allowed.

### gatheringResponseFormat

The ordered, frozen collection of fields used for Gathering responses.

### gatheringField

One text field's identity, label, order and validation rules within a Gathering
response format.

### opinion

A proposition in the Polis flow on which participants agree, disagree or pass.
It is distinct from a prioritization item or a free-text feedback comment.

- Other code names: `comment` (historical).
- UI: statement (EN); proposition (FR).

### prioritizationItem

Content evaluated through comparisons or QV. It remains distinct from a Polis
opinion even when both have the same UI label.

- Other code names: `item` (within prioritization); `rankingItem*`.
- UI: statement (EN); proposition (FR).

### seedOpinion

An organizer-supplied opinion used to seed a Polis conversation, rather than
added through the participant contribution flow. “Seed” describes origin, not
another entity type or necessarily AI-generated content.

- UI: seed statement (EN).

### seedItem

An organizer-supplied prioritization item used as seed content, rather than
added through the participant contribution flow.

- Other code names: shared `seedOpinions` inputs; `qvStatements`.
- UI: seed statement or statement to rank (EN), according to the flow.

### seedGatheringResponse

An organizer-supplied Gathering response, rather than one added through the
participant contribution flow. “Seed” describes origin, not a separate content
type or necessarily AI-generated content.

- UI: seed response (EN).

### seedSuggestion

AI-proposed text that an organizer can add to editable seed content. Acceptance
does not itself publish an opinion/item, and this is not a generic name for
participant content awaiting moderation.

- UI: AI suggestions (EN); suggestion within this AI-authoring context.

## Prioritization, comparison methods and rankings

### prioritization

A participation process for establishing relative priorities among items through
comparisons or QV. Its conversation-family value is `prioritizing`.

- Other code names: `ranking` (historical conversation type).
- UI: Prioritizing (EN).

### comparison

Preference tasks involving sets of options. The family includes BWS and binary
pairwise; its discriminator is `comparisons`.

- Other code names: broad `maxdiff*` feature naming (historical).

### comparisonMethod

The choice of comparison method: BWS or binary pairwise.

- Other code names: `rankingMode`, `RankingMode`.

### comparisonConversationConfig

Settings specific to the comparison branch of prioritization, not QV.

- Other code names: `rankingConversationConfig*`.

### comparisonCandidate

An item presented among the options in a comparison task. `candidateSet` names
the collection of presented candidates, not a separate item entity.

- Other code names: `candidate` within a comparison task.

### bws

Best–worst scaling: selecting the most and least preferred options from a set.
This participant method is distinct from the MaxDiff statistical model.

- Other code names: `maxdiff` (historical feature name); `best-worst`.
- UI: Best–worst scaling (BWS) (EN).

### pairwise

Binary pairwise comparison: selecting the preferred option from two options.
This is not the graded pairwise judgment that also expresses preference strength.

- UI: Pairwise comparison (EN).

### qv

Quadratic voting: expressing numerical support or opposition with quadratic
vote costs.

- Other code names: `creditVoting*` in the current configuration/worker namespace.
- UI: Quadratic voting (EN).

### ranking

An ordering of items by preference or priority, or computing that ordering.
This is not the generic name for the entire prioritization family; existing
`ranking*` names also occur in configuration and item contexts listed above.

### MaxDiff (statistical model)

A maximum-difference statistical choice model for estimating preferences from
best–worst selections, not an umbrella name for all comparison methods.

- Code: accurate mathematical names such as `JointMaxDiffLearning`.

## Participant choices and responses

### gatheringResponse

A stable contributed-response identity within one Gathering conversation,
whether participant-authored or organizer-supplied seed content.

- UI: response (EN).

### gatheringResponseContent

One immutable, complete saved version of a Gathering response.

### gatheringAnswer

The text entered for one Gathering field in a particular response-content version.

### vote (Polis)

One participant's agree, disagree or pass choice on one opinion. This is not a
comparison answer or the numerical votes assigned in a QV allocation.

### pass

A recorded choice on a Polis opinion, distinct from an unanswered opinion or a
cancelled vote.

- Other code names: `unsure`.
- UI: Unsure (EN); Incertain (FR).

### comparisonAnswer

One task's recorded preference, including the presented options and chosen
best/worst options.

- Other code names: `maxdiff_comparison` (historical).

### comparisonResponse

A participant's resumable collection of comparison answers and progress. It is
not necessarily complete and is not contributed content.

- Other code names: `maxdiff_result` (historical).

### qvResponse

A participant's whole accepted set of QV allocations, not unsubmitted local edits.

### ballot (QV)

A participant's QV allocations considered together as one set. A ballot describes
the choices themselves; a QV response is the saved participation record.

### qvAllocation

One item's assignment within a QV ballot, identifying the item and the numerical
votes assigned. It is not the credit cost, the whole ballot or a comparison answer.

### votes (QV)

The signed integer quantity assigned to an item: positive for support, negative
for opposition, and zero for neither. Its magnitude is not a credit cost or a
count of participants.

### credits

The budget units used to pay for QV choices. An item's cost is its votes squared;
the ballot's total cost is the sum of those costs.

### opposition

Negative QV vote quantities expressing opposition to an item, distinct from
categorical disagreement on a Polis opinion.

## Identity and participation

### user

A global application identity. The same user can facilitate, participate, or do
both depending on the context; these product roles are not separate user types.

### conversationParticipant

A participation identity scoped to one conversation, distinct from the global
user identity to which it may be linked.

- UI: participant in the context of a conversation.

### hardAccount

A registered user identity backed by an account credential, currently email,
phone or passport verification. Having a hard account does not by itself mean
being logged in or satisfying strong verification.

- Other code names: registered user; `isRegistered`.

### softAccount

A guest user identity, with or without a soft identifier. It is still a global
user identity, not merely an unknown visitor or a conversation-local participant.

- Other code names: guest; `isGuest`.
- UI: guest (EN).

### softIdentifier

An identifier that can recognize a soft account without making it a hard account.
The retired event-ticket verification was an example, not a current requirement
for guest participation.

### isKnown

Whether the requesting device is recognized and associated with an available
user identity. This does not establish hard-account status, an active login or
verification strength.

### isLoggedIn

Whether the requesting device has an active login to a hard account. A soft
account's ability to participate is not called a logged-in state in this contract.

### verification

Evidence established by checking a particular credential or proof. Verification
kind and strength (strong/weak) are distinct from hard/soft account status and
login status; “verified” alone does not identify which requirement has been met.

### emailVerification

Verification of an email credential. It can establish a hard account but does
not satisfy strong verification.

### strongVerification

The participation requirement satisfied by phone or passport verification.
It does not mean every credential sufficient to establish a hard account, nor
does it imply that email has been verified.

### participationMode

The account or verification requirement for participating in a conversation:
guest participation, an account, email verification or strong verification.
It is separate from discovery and permission to view content.

### participationModeSettingsSource

Whether a conversation inherits the project's current participation mode
(`project_inherited`) or uses its own explicit setting (`conversation_override`).
The effective participation mode is the requirement that applies, not its source.

### facilitator

A user organizing or managing a participation exercise. This product role is not
a separate identity or an organization membership role, and does not by itself
specify permissions.

## Organizations, ownership and attribution

### organization

An organizational identity with its own profile and memberships. For
organization-published content, its profile supplies the public identity;
individual users act on its behalf.

- UI: organization (EN).

### project

A grouping of related conversations administered through owning organizations.
Internal default projects can also back the “No project” publishing option.

- UI: project (EN).

### projectOrganizationOwnership

An administrative ownership relationship between a project and an organization.
Users exercise control through their roles and capabilities in owning
organizations, not merely through public credit or authorship.

This is distinct from an `"owner"`-labelled view-access level, which describes
permission to view restricted information rather than an ownership relationship.

### projectOrganizationAttribution

Public credit for an organization associated with a project, including externally
represented organizations. Attribution does not itself grant application
management permissions.

- UI: Project Owners, Sponsors and Partners (EN). The public `project_owner`
  attribution role is distinct from administrative ownership.

### projectContact

The contact for participant questions about a particular project. An email
address alone can identify the contact; a person's name and organization
affiliation are optional. An affiliation does not imply administrative ownership
or public attribution. Different projects may use different contact addresses
for the same organization. The contact email also receives replies to project
email updates.

- UI: project contact / Contact email (EN).

### author

The identity responsible for contributed content or a recorded action, distinct
from administrative ownership. In existing opinion and vote records, `authorId`
identifies a global user.

### createdByUserId

The global user who performed a creation operation, where explicitly recorded.
This is action provenance, not the public organization identity or proof of
current ownership.

### organizationRole

A user's membership role in a particular organization: admin, manager or
moderator. The same role name does not imply site-wide authority.

### capability

Permission to perform a specific operation in an organization or project scope.
Organization membership roles supply capability bundles; public attribution and
the product label “facilitator” are not permission grants.

### isSiteModerator

Site-wide moderation authority, distinct from the moderator role in one
organization.

### isSiteOrgAdmin

Site-wide organization-administration authority, distinct from being an admin
member of one organization or a site moderator.

## Conversation lifecycle and visibility

### conversationDraft

An unpublished creation draft, distinct from an existing conversation and from
unsaved edits to a participant's response.

### published conversation

A conversation created for access through its participation flow. Publication
does not imply indexing, unrestricted participation or completed analysis.

### isClosed

Whether a conversation has been closed to participation. Closure is distinct
from a moderation lock and does not by itself mean result calculation is complete.

### lock (conversation moderation)

A moderation action that blocks participation, independently of whether the
conversation has been closed.

### directoryVisibility

Whether an organization or project is listed or unlisted in public directory
surfaces. Unlisted is not a universal promise of either link access or private
access across resource types.

- Project UI: Listed in Explore (EN); Publish is the action that lists a project.

### isIndexed

Whether a conversation is eligible for indexed public discovery. Turning it off
does not make the content confidential, change participation requirements, or
determine its project's `directoryVisibility`.

- Project discovery rule: an unlisted project cannot have listed conversations.
  A listed project may contain unlisted conversations.
- Current UI: Link available by invitation (EN, participant project page);
  Public / Private (EN, conversation visibility selector). “Private” here means
  unindexed, not access restricted.

### opinionModeration

An active moderation decision on an opinion: move or hide. Moderating an opinion
is distinct from deleting its content or moving it to another conversation.

### move (opinion moderation)

A moderation action excluding an opinion from new votes and new analysis inputs
while keeping it publicly readable in the same conversation's moderation history.

- UI: Move (EN); Déplacer (FR). The destination list is Moderation History (EN).

### hide (opinion moderation)

A moderation action hiding an opinion from ordinary participants and excluding
it from new votes and new analysis inputs. Site moderators can inspect hidden
opinions; hiding is not deletion.

- UI: Hide (EN); Masquer (FR).

### accountHiddenAt

Account-lifecycle exclusion of contributed content or responses from current
display or inputs. It is separate from a moderation decision or deletion marker.

### deleted

A resource no longer available as an active application record. Logical deletion
does not imply physical erasure of all stored data or numerical snapshots.

- Other code names: resource-specific `deletedAt`, `isDeleted` or retired
  `currentContentId`.

### survey withdrawal

Removal of a survey response from live use, distinct from deleting an account
or erasing retained checkpoint evidence.

- UI: Withdraw response (EN, survey flow).

## Counting and results

### analysisCheckpoint

A named reference in a conversation's analysis history. A historical
checkpoint identifies a fixed result, not the conversation's current result.

### closing checkpoint

The stable `analysisCheckpoint` for a finalized close. It follows that close's
completed Closing result while current and identifies a fixed result after reopening.

- Checkpoint reason: `conversation_closed`.

### analysisInputMode

The input basis for the current result of a finalized close: **Closing inputs**
(`closing`) use inputs retained at that close; **Live inputs** (`live`) use
currently eligible inputs.

- Other code names: `closedAnalysisInputMode` (shared DTO).
- UI: Closing inputs / Live inputs (EN).
- **Requested mode** is the facilitator's choice; **served mode** is the mode
  that produced the result currently shown.

### participantIndex (retained analysis inputs)

A participant's local number within retained analysis inputs. It connects
numerical inputs from the same participant without being their global `userId`
or their `conversationParticipant` identity.

- Other code names: `local_participant_index` (Python worker).

### participantCount

The number of participants represented in the specified statistics or result
scope, not visitors, organization members or every identity ever associated with
the conversation. Live and captured-result counts can differ.

### voteCount

A method-specific display count: recorded opinion choices for Polis or comparison
answers for comparisons. It is not a count of QV vote units or credits.

### totalParticipantCount / totalVoteCount

Broader source counts than the corresponding analysis-eligible counts, where that
method distinguishes them. “Total” does not mean an unfiltered, all-time history
including deleted or detached sources.

### qvCalculation

Computation of QV results from captured eligible saved ballots for a particular
closure. Saving a response is separate from its inclusion in a calculation or
the availability of that calculation's results.

### qvInputSnapshot

The captured items, ballots and calculation rules used for one QV result.
It is numerical evidence for that result, not the current editable response set.

### score (comparisons)

A model-derived preference value for an item, scoped to a participant or a
community result. Its numerical scale is distinct from rank, participant counts
and QV credits.

### displayScore

A comparison score transformed onto a fixed zero-to-one presentation scale.
Formatting it as a percentage does not make it a participant-support percentage.

- Other code names: some API `score` and `snapshotScore` fields carry this
  display-scale value rather than the raw model score.

### rank

An item's position in an ordering, not its score or support percentage.
Equal QV net totals share a rank; deterministic display order does not break a tie.

### supportUnits

The sum of positive QV votes for an item in a result. This is not credits spent
or the number of supporting participants.

### oppositionUnits

The sum of magnitudes of negative QV votes for an item in a result.
It is nonnegative and distinct from Polis disagreement.

### netUnits

QV support units minus opposition units for an item. This signed quantity
determines its QV rank.

### supportingParticipantCount / opposingParticipantCount

The numbers of included participants assigning positive or negative QV votes to
an item, respectively. Each participant contributes one to the applicable count,
regardless of vote magnitude.

## Opinion-group analysis

### opinionGroup

A group of participants with similar voting patterns, not an individual opinion.

- Other code names: `cluster*` in analysis/API vocabulary; “cluster” also remains
  a valid mathematical term when discussing clustering.
- UI: Opinion Group (EN).

### opinionGroupCandidate

A candidate grouping solution for an analysis snapshot, potentially containing
several opinion groups. It is not an individual group or a comparison candidate.

## Languages

### displayLanguage

The preferred language for the application interface, also used when resolving
preferred content presentation. It is not the language in which every contributed
text was written.

- Other code names: `preferredDisplayLanguage` makes the preference explicit.

### renderedDisplayLanguage

The language actually rendering the interface, which may temporarily fall back
without changing the preferred display language.

### spokenLanguages

Languages the user declares they speak, used as a signal of which originals they
can understand. This is not a list of desired translation destinations or a
verified proficiency assessment.

### sourceLanguage

The language of the original content, which may be detected or unknown.
Its identification does not guarantee that the interface or translation system
supports that language.

### sourceLanguageCode

The recognized, normalized language code attributed to original content.
It can be absent even when a detector supplied a raw language value.

### sourceRawLanguageCode

The detector's raw language value, retained separately from its recognized,
normalized code. It is not a user preference or a translation destination.

### targetLanguage

A language selected for content localization or translation. It can match the
source language, requiring no translation; being a configured target does not
guarantee that a translated version exists.

### preferredContentLanguage

The language selected for content lookup from the display preference, configured
content languages and defaults. It neither guarantees translation availability
nor determines whether the original or a translation is ultimately shown.

### localizedContentDisplayMode

Whether a content block shows its original or translated version. This is
separate from language selection; understood source languages and translation
availability influence the initial mode.

### multilingualSetting

A conversation's target-language and dynamic-translation settings. Its own
additional languages are distinct from the effective policy after project
inheritance or automatic target selection.

### languageSettingsSource

Whether a conversation uses its project's language settings or its own override.
This selects translation policy, not the source language of every contribution.

### effectiveTargetLanguageCodes

The deduplicated target set resulting from the applicable default or detected
language and manually added targets. This is distinct from the manually added
list and from translations already available.

## API layers

### API controller

The HTTP boundary for an Agora API operation. It handles the request and
response and delegates application work to an API service.

- Other code names: route handler.

### API service

The application layer that implements an Agora API operation independently of
its HTTP route. It owns the operation's rules and coordinates persistence and
other side effects.

### API DTO

The request or response shape of an API operation, defined around what its
callers send or need to receive. A DTO may combine or omit stored fields and
does not correspond one-to-one with a database row.

# Privacy notice: concise multilingual review draft

**English concision and all 10 translations completed; not published.**
The public text describes completed deletion behavior,
not the status of deletion-service engineering. Existing legal-basis categories,
statutory-rights provisions and publication dates are preserved. Dates must be
confirmed when the approved notice is actually published.

Sources:

- `services/agora/src/pages/legal/privacy/index.i18n.ts`
- `services/agora/src/pages/legal/terms/index.i18n.ts`

## Main meaning

- Only an **accepted** deletion request disables access and starts 15-day recovery.
  A refusal because of organization responsibilities does neither; contact us for
  assistance, without promising unavailable self-service transfers.
- Recovery ends at the stored deadline. Physical cleanup proceeds without undue
  delay afterward, not necessarily at that exact instant. Delay does not extend
  recovery or restart applicable legal deadlines.
- Personal statements are hidden in live views and participation becomes
  ineligible for new live calculations. Retained checkpoints/snapshots may keep
  permitted text and existing translations without public account attribution.
  Explicit content deletion redacts historical text too. Participants can manage
  content before deleting an account, without making applicable erasure requests
  depend on manually deleting every contribution. Open results refresh
  asynchronously. Project-owned seeds/shared resources keep their own lifecycle.
- Numerical inputs underlying saved results are kept indefinitely for detailed
  voting analysis and recalculation, with account links removed at permanent
  cleanup. The user confirmed indefinite retention and requested a short statement
  rather than repeated necessity/retention-limit qualifications. This is not every
  save, an exact closing-time snapshot, a full QV history or guaranteed anonymity.
  Reopening cannot reactivate detached contributions. Ordinary deletion does not
  recalculate saved numbers; separate corrections or re-analysis may change them.
- Existing exports can still contain later-deleted material. Their **download
  availability** expires no later than 30 days after generation; expired objects
  undergo prompt storage cleanup. New exports use current deletion state. The
  recovery-data restriction explicitly concerns new exports, not old files.
- Historical AI descriptions are separate outputs, not automatically rewritten by
  ordinary deletion. They can contain identifying excerpts and remain subject to
  applicable erasure rights, without promising automatic scanning or replacement
  generation. Original-statement redaction is not a guarantee about every derived
  description or independent copy.
- General statutory rights remain. No special post-unlink record-lookup or account
  management workflow is promised. The existing 30-day backup ceiling and scoped
  security/recipient exceptions remain separate from product recovery.

## Concision

Before the Closing/Live disclosures, the English notice was 2,511 rendered words: 44% shorter than the earlier
4,519-word pass and 69% shorter than the original 8,056-word draft. The approved
short indefinite-retention sentence is unchanged. Repeated deletion timelines,
backup/provider exceptions, visibility explanations and security claims were
consolidated. Provider descriptions, the data/purpose/legal-basis table, California
provisions and update/contact sections were shortened throughout—not just the
numerical-retention paragraph. Data categories, legal-basis meanings, recipients,
international transfers, export risks, rights and distinct recovery/export/log/
backup periods remain. No new legal basis or operational guarantee was introduced.
Terms were not substantively rewritten in this whole-policy pass.

## Decision and publication gates

### Closing and Live results: published notice review (2026-11-19)

The [public English notice](https://www.agoracitizen.app/legal/privacy/)
rendered on 2026-11-19 says **last updated 2026/10/14**. It is not the
concise draft in this checkout. The following differences require a decision
before deploying the new behavior:

| Public wording | Behavior to disclose |
| --- | --- |
| §§4.2, 4.3, 6.5 and 6.7 promise the same historical `[deleted]` text for account deletion and explicit statement deletion. | Explicit content deletion redacts historical text. Account deletion excludes personal sources from Live; permitted historical text and existing translations may remain without public attribution. Do not apply a more permissive retention rule to contributions made under the earlier promise without resolving that conflict. |
| §6.7 says closing locks mathematical publication and reopening can include account-unlinked votes. | Participation stays closed. Live can refresh and moderation can produce a new Closing result behind the same link; reopening freezes that link. Detached votes do not re-enter Live or later closes. |
| §6.5 refers generally to withdrawing votes, survey responses or ranking participation. | On supported finalized closes, participants withdraw **all** their votes, comparison answers or QV ballot. That changes Live only. It does not erase the retained numerical evidence, sever historical personalization links, or allow resubmission while closed. |
| §§2 and 4 describe survey responses and numerical retention, but not the retained survey-choice projection used for Closing. | Polis can keep validated choices keyed to checkpoint-local participants for aggregate regrouping. This capture contains no free text and does not publish individual choices. Required-survey withdrawal excludes the participant’s Live votes; optional-survey withdrawal affects survey results only. |

The unpublished multilingual draft distinguishes account deletion from content
erasure. Sections 4.3 and 6.5 now describe closed Live recalculation,
moderation-driven Closing updates, retained survey choices, and whole-contribution
withdrawal without historical erasure. Its indefinite numerical retention differs from the
public notice's necessity-limited language (§4.2). Confirm applicability to
existing data, the lawful basis and the sensitive-data condition before
changing the public text, translations or publication date. No public copy
was changed as part of this review.

This is not legal/compliance sign-off. The existing consent/retention clauses have
not been silently replaced with a new legal basis. The controller/legal reviewer
must confirm the actual basis, applicable sensitive-data condition and necessity
criteria for retaining potentially identifying numerical participation after
consent withdrawal. Code preservation and unlinking do not create that permission.
Infrastructure retention promises also require operational confirmation.

The user approved proceeding with translation of the concise English draft and
explicitly authorized parallel language reviews. Both complete documents have been
reconciled in Spanish, French, Traditional/Simplified Chinese, Japanese, Arabic,
Persian, Hebrew, Kyrgyz and Russian. The approved English content and publication
dates are unchanged. This is translation authorization, not legal or operational
sign-off. Native-speaker/legal review remains advisable before publication; the
automated-translation notices and authoritative-English controls remain in place.

## Verification

2026-11-15: Privacy section 4.2/6.5, the Terms' individual-content clause and
account confirmations were revised in all 11 locales for the historical-only
account/content distinction. This changes the earlier English draft. Prior
verification below is historical evidence, not verification of this revision.
Publication dates/legal-basis categories remain unchanged; semantic/native-speaker,
legal and operational publication reviews are still required.

All 49 focused legal-content tests and scoped ESLint pass, with no whitespace
errors. The tests cover English disclosure/rights safeguards and a word-count
budget, plus every locale's document structure, links, numerical references,
publication dates and substantive English leftovers. Postal addresses are not
required to be translated, and spelled-out quantities may become digits. These
checks and the targeted translation review do not certify semantic equivalence or
legal compliance. A baseline comparison confirms that both English documents
are unchanged and all 10 translations were updated in both files. An earlier full frontend
typecheck was blocked by `participantStatements` work outside these legal files;
it was not rerun for this prose-only pass. No full-project typecheck success is
claimed. No content was published or committed. The privacy page has no matching
Storybook stories, so no rendered-page verification is claimed.

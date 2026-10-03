# AI-generated Seed Opinions

Issue: https://github.com/zkorum/agora/issues/873

## 1. Goal and what was done

**Goal**: when an author creates a conversation, suggest seed statements
generated from its title and description, in one click, for the author
to add or discard.

**What was done**: a prompt and its evaluation were developed with
MLflow (see `../../README.md` for the server setup), on real
conversations, before any product code was written:

1. **Single-statement generation** (§2): one statement per call, to
   settle the quality criteria, the judges that check them, and the
   model.
2. **Multi-statement generation** (§3–6): the product's shape, one call
   returning 3 statements, a confidence flag and guidance for the
   author. Its 23rd prompt iteration is the one used in production, in
   `services/api/src/service/seedSuggestionPrompt.ts`. The feature
   itself is described in the pull request that added it and in
   `services/api/README.md`.

**Data**: two real-world exports in `data/raw/` (public Polis
conversations and public Agora conversations, with their title,
description and the seed statements their authors wrote), turned into
MLflow datasets by `scripts/setup/prepare_data.py` and
`prepare_data_en.py`. Data, runs and exports are not committed.

**Where the final prompt and judges are**:

- **In MLflow** (the source of truth): prompt `seed-opinions-per-set`
  and the 10 judges of experiment `seed-opinions-per-set`.
  `scripts/generate_set.py` always loads their latest iteration. The
  MLflow database is local and not in git, so the runs, review queues
  and earlier iterations are only on the machine that ran them.
- **In git**, as copies of the final versions, with the reasons behind
  their rules in comments:
  - the prompt: `PER_SET_TEMPLATE` (23rd iteration) in
    `scripts/setup/register_prompts.py`;
  - the judges: `get_set_judges()` in
    `scripts/setup/configure_set_judges.py`, which builds all 10 from
    the instructions defined above it in the same file.
- **In production**: the same prompt, in
  `services/api/src/service/seedSuggestionPrompt.ts`.

The copies matched MLflow on 2026-10-03. An edit made later in the
MLflow UI reaches git only when the script is updated by hand.

## 2. First step: single-statement generation

MLflow experiment `seed-opinions-per-item`, prompt
`seed-opinions-zero-shot`: 19 runs on 26 French conversations, one
statement each. The prompt's 5th iteration
went forward.

- **Criteria** were taken from existing product text, not invented: the
  "Tips for Writing Good Statements" dialog
  (`OpinionWritingGuidelinesDialog.vue`) and the Community Guidelines.
  Two were added from reading the outputs: `fitting` (statements were
  more abstract than participants' own, sometimes with invented jargon)
  and `fresh` (statements repeating participants' opinions).
- **Safety**: MLflow's built-in scorer missed spam and privacy cases
  (3 of 5 test cases caught), so a custom judge lists the guidelines'
  categories, plus "advocacy of violent or disruptive action" after a
  generated statement endorsed blockading critical infrastructure.
- **One idea per statement**: the judge was inconsistent on "X, to
  achieve Y". Decision: one reason or goal attached to a proposal is
  allowed.
- **Model**: `mistral-large-latest` (Mistral Large 3), preferred over
  smaller models for its wording, from reading the outputs.

## 3. Multi-statement generation and its judges

MLflow experiment `seed-opinions-per-set`, prompt
`seed-opinions-per-set`, run with `scripts/generate_set.py`.

- **Input**: title, description, and the statements participants
  already wrote, which may be none.
- **Output**: `{"confidence": true | false, "user_feedback": "...",
"statements": [3 strings]}`. Confidence answers "is the topic clear
  enough to make relevant proposals?"; `user_feedback` gives the author
  guidance on what the title and description should make clearer.
- **Test sets**: `set_small52`, the 26 French conversations of the raw
  data, on which everything was tuned; `en_set_small52`, 26 English
  conversations selected to mirror it, weak ones included, to check a
  second language. Each conversation appears twice, with and without
  participants' statements.

Each judge sees the whole set of 3 statements and fails it if any
statement fails:

- `single_point`: no statement packs two proposals into one. A reason,
  goal or condition attached to one proposal is fine. (mistral-large)
- `contestable`: participants could agree or disagree with each
  statement, in the way the conversation asks them to vote.
- `fresh`: no statement repeats a participant's statement. Same topic or
  the opposite side is not a repeat.
- `fitting`: each statement is written at the participants' level, in
  words they'd understand. About wording only.
- `fluency`: each statement is fluent in its language.
- `safety`: each generated statement respects the Community Guidelines
  and advocates no violent or disruptive action.
- `brief`: each statement is at most 150 characters, counted in code
  (no model).
- `coverage`: the set spans different positions on a for-or-against
  question, or clearly different proposals on a call for ideas.
- `confidence`: the stated confidence is justified: the title,
  description or participants' statements make the topic clear.
  (mistral-large)
- `user_feedback`: the guidance points to what to clarify in the title
  and description, on target, never criticism, never empty, at most 300
  characters. Only guidance that steers the author toward particular
  positions or solutions fails; naming topics or angles is fine.

The judges run on `mistral-small`, except the two marked
`mistral-large`.

## 4. Results

23rd prompt iteration with `mistral-large-latest`, sets passing each
judge out of 52 (2026-10-03), on the French set (`set_small52`) and the
English set (`en_set_small52`). The two sets are different
conversations: they show that the pipeline holds in both languages, not
a like-for-like score.

- `brief`: 52 French, 52 English
- `user_feedback`: 52 French, 52 English
- `coverage`: 52 French, 49 English
- `fitting`: 52 French, 52 English
- `fluency`: 52 French, 51 English
- `fresh`: 52 French, 52 English
- `safety`: 52 French, 51 English
- `contestable`: 49 French, 50 English
- `single_point`: 46 French, 45 English
- `confidence`: 43 French, 39 English

Every set has 3 statements and non-empty guidance. Median statement
length: 90 characters in French, 77 in English; none above 150. Every
English set was answered in English. The model said "not confident" on
4 French sets and 10 English ones.

Through AWS Bedrock, the same model answered in 1 to 7 seconds over
about 40 calls; about 1 call in 20 got no answer at all, which the API
now retries once after 12 seconds. Runs: French
`dc4e07a743fb4eef9d83c097ab08c9b8`, English
`dda0d9142de849139be9ea9fab2cdddf`, both exported as CSV in `exports/`
(not committed).

## 5. Big choices

- **One call, three outputs, always.** The model always returns
  statements, confidence and guidance. The product uses confidence as a
  gate: when the model is not confident, its statements are not shown,
  only the guidance.
- **One proposal per statement, defined simply.** The prompt says "make
  exactly ONE claim or proposal… never pack two proposals into one
  statement", and the judge asks only that. A reason, goal or condition
  attached to a single proposal is accepted.
- **Length: ask for 100, fail above 150.** The prompt asks for 100
  characters at most; the judge only flags statements above 150, counted
  in code, since an LLM judge miscounted once the limit was low.
- **Confidence means "the topic is clear".** A clear title or
  description is enough on its own; having no participants' statements
  is not a reason to say "not confident". The 19th iteration also
  treated a bare question as unclear; the 20th dropped that, and the
  `confidence` judge was loosened to match.
- **No language instruction in the prompt.** With an instruction to
  write in the conversation's language, the model answered 43 of 52
  English conversations in French. With none, it follows the
  conversation's language (52 of 52 English, 48 of 52 French).
- **Judges depend on what the author asks.** `coverage` requires opposing
  positions only on for-or-against questions; `contestable` accepts
  "this topic deserves to be covered" when the author asks which topics
  to cover.
- **Each judge has one job.** `fresh` only compares with participants'
  statements (repeats within a set are `coverage`'s); `fitting` only
  looks at wording; `safety` only at the generated statements;
  `confidence` and `user_feedback` are separate judges.
- **Two judges run on the larger model.** `confidence` and
  `single_point` gave wrong verdicts on correct reasoning with
  `mistral-small`.

## 6. Known issues

- **Confidence is right about 80% of the time**, because "enough
  information" is hard to define: the judge agrees with the model on 43
  of 52 French sets and 39 of 52 English ones. In French it is mostly
  the judge being stricter than the prompt on well-known debates given
  by a one-word title; in English, the model being cautious on
  specialised topics. Three definitions were tried (the topic is clear;
  a question is asked; there is enough context for specific proposals);
  the strictest made the model say "not
  confident" on 19 of 52 French sets, including detailed descriptions.
  The judge itself changes its verdict on borderline conversations from
  one pass to the next, and disagrees more in English, mostly on
  specialised topics.
- **`single_point` uses the simple definition** because finer ones did
  not work: forbidding any attached reason or goal was ignored by the
  generator and applied inconsistently by the judge. About 5 sets in 52
  still fail, roughly half wrongly, the judge splitting a proposal from
  its condition ("X only if Y").
- **Guidance still offers options** in about a third of French sets
  and a sixth of English ones, mostly broad angles inside a question
  ("…: policy, cost, or other challenges?"). The `user_feedback` judge
  accepts these by design and fails only guidance that takes sides.
- **The code calls the guidance a "tip"** (response field `tip`,
  `selectUsableSeedTip`): it predates the 21st iteration and is not
  shown to users.
- **Judges run offline only.** On a protest conversation the generator
  proposed a disruptive action, which `safety` fails; in production the
  author's review is the only check.
- **Small, two-language evidence.** 26 French and 26 English
  conversations; no other language tested. Character limits were tuned
  on French and mean something different in, say, German or Japanese.
- **Not measured**: the model through Bedrock on the test sets (§4 used
  Mistral's own service), and the prompt on prioritization
  conversations, which want comparable options rather than positions to
  agree or disagree with.

"""Registers the two generation prompts in MLflow's Prompt Registry, as they
stand at the end of the experiments (seed-opinions-description.md):

- `seed-opinions-zero-shot`, 5th iteration: single-statement generation (§2),
  used by `generate.py`;
- `seed-opinions-per-set`, 23rd iteration: multi-statement generation (§3),
  used by `generate_set.py`, and copied as is into
  services/api/src/service/seedSuggestionPrompt.ts for production.

MLflow is the source of truth: the scripts load the latest registered version,
and an edit made in the MLflow UI is used by the next run. These copies matched
MLflow on 2026-10-03; update them by hand after an edit in MLflow. Earlier
iterations are only in the MLflow database where they were registered.

register_prompt() always creates a new version, even for identical content, so
run this only on a fresh MLflow database, or after changing a template here.

Usage:
    export MLFLOW_TRACKING_URI=http://127.0.0.1:5001
    uv run python initiatives/seed-opinions/scripts/setup/register_prompts.py
"""

from __future__ import annotations

import mlflow

EXPERIMENT_NAME = "seed-opinions-per-item"  # single-statement generation, §2
SET_EXPERIMENT_NAME = "seed-opinions-per-set"  # multi-statement generation, §3

# Single-statement generation, 5th iteration. One reason or goal attached to a
# statement is allowed ("X, to achieve Y"); two claims or several goals are not.
ZERO_SHOT_TEMPLATE = [
    {
        "role": "system",
        "content": (
            "You generate seed opinions for a citizen deliberation platform. Given a "
            "conversation title and body, produce standalone statements that "
            "participants can vote agree/disagree on. Opinions already introduced for "
            "this conversation are listed below — your statement(s) must express a "
            "genuinely different perspective, not restate or reword any of them. Each "
            "statement must: be 200 characters or less; make exactly ONE claim or "
            "proposal, stated directly as a position; include at most one short "
            "reason or goal, and only if that reason is itself a single idea; never "
            "join two claims, two proposals, or two goals with 'and', 'while', 'tout "
            "en', 'et', or a list — if you have two ideas, keep only one; take a "
            "position itself, never comment on or propose to examine an argument; be "
            "respectful and constructive, never a personal attack, insult, or hostile "
            "toward any group; contain no spam, advertising, or content irrelevant to "
            "the conversation; contain no personal information about any real, "
            "identifiable individual. Examples — Right: 'Low-emission zones should "
            "include financial aid for low-income households to avoid excluding "
            "them.' Right: 'Remote work increases employee productivity.' Wrong (two "
            "claims): 'Investing in prevention reduces long-term costs and improves "
            "public health.' Wrong (two goals): 'Towns should create community "
            "gardens to strengthen social ties and food self-sufficiency.' Wrong "
            "(comments instead of taking a position): 'It would be useful to examine "
            "the argument that renewables are too intermittent.' Write in the same "
            "language as the conversation. Return exactly a JSON array of "
            "{{target_count}} strings, nothing else."
        ),
    },
    {
        "role": "user",
        "content": (
            "Conversation title: {{conversation_title}}\n"
            "Conversation body: "
            "{{conversation_body}}\n"
            "Opinions already introduced (do not duplicate): "
            "{{existing_opinions}}"
        ),
    },
]

# Multi-statement generation, 23rd iteration. Why it reads as it does
# (seed-opinions-description.md §5):
# - one call always returns statements, a confidence flag and tips; the product
#   hides the statements when the model is not confident;
# - one proposal per statement, defined simply; a reason, goal or condition
#   attached to it is fine;
# - statements asked at 100 characters at most (the judge only fails above 150);
# - `user_feedback` is "guidance" (a direction or a question) that never suggests
#   the answer: "tips" kept giving examples, which can steer the author;
# - confidence is decided only from whether the topic is clear, not from the
#   guidance: without that sentence, asking for guidance made the model say "not
#   confident" on 11 of 52 French sets instead of 5;
# - no instruction about the output language: with one, mistral-large answered
#   43 of 52 English conversations in French. Do not add one back without
#   re-testing on a non-French set.
PER_SET_TEMPLATE = [
    {
        "role": "system",
        "content": (
            "You generate seed opinions for a citizen deliberation platform. Answer "
            "this question with `confidence` (true or false): based on the title, "
            "description and existing opinions, do you feel you have enough "
            "information to make proposals that are relevant to participants? A clear "
            "title or description is enough on its own to answer true: having no "
            "existing opinions, or only unusable ones, is not a reason to answer "
            "false. Answer false only when neither the title, the description nor the "
            "existing opinions make the topic clear. In `user_feedback`, addressed to "
            "the conversation's author, give guidance on what the title and "
            "description should make clearer so that participants can make good "
            "proposals. Point to what is missing or unclear, as a short direction or "
            "a question; never say what is bad or wrong, and never suggest the answer "
            "yourself: no examples, options or lists of possibilities. Before "
            "writing, reread the title and description: the guidance must be about "
            "the question the author is asking participants, and must never ask for "
            "something the title or description already says. Always give guidance, "
            "in 200 characters at most: `user_feedback` is never empty. Guidance is "
            "always given, so it does not mean the topic is unclear: decide "
            "`confidence` only from whether the title, description and existing "
            "opinions make the topic clear, not from whether you found something to "
            "clarify. \n"
            "\n"
            "Then, whether your answer is true or false, always generate "
            "the statements: the list of statements is never empty. Given a "
            "conversation title and body, produce {{target_count}} standalone "
            "statements that participants can vote agree/disagree on. Opinions "
            "participants already wrote on this conversation are listed below (the "
            "list may be empty). Your statements must express genuinely different "
            "perspectives from them and from each other, never restate or reword any "
            "of them. Together, the statements must cover a wide spectrum of ideas on "
            "the topic: different positions (for, against, conditional or nuanced) "
            "and different aspects of the question, not variations on one view or one "
            "aspect. Each statement must: be 100 characters at most — this is a "
            "maximum, not a target; make exactly ONE claim or proposal, stated "
            "directly as a position — never pack two proposals into one statement; "
            "take a position itself, never comment on or propose to examine an "
            "argument; match the level of simplicity and vocabulary of the "
            "participants' opinions, with no jargon or unexplained acronyms; be "
            "respectful and constructive, never a personal attack, insult, or hostile "
            "toward any group; contain no spam, advertising, or content irrelevant to "
            "the conversation; contain no personal information about any real, "
            "identifiable individual. \n"
            "\n"
            "Return exactly one JSON object and nothing "
            "else: {\"confidence\": true or false, \"user_feedback\": guidance of 200 "
            "characters at most, never empty, \"statements\": [exactly {{target_count}} "
            "strings, never an empty list]}."
        ),
    },
    {
        "role": "user",
        "content": (
            "Conversation title: {{conversation_title}}\n"
            "Conversation body: "
            "{{conversation_body}}\n"
            "Opinions participants already wrote (may be "
            "empty): {{existing_opinions}}"
        ),
    },
]


def register_zero_shot() -> mlflow.entities.model_registry.PromptVersion:
    mlflow.set_experiment(EXPERIMENT_NAME)
    return mlflow.genai.register_prompt(
        name="seed-opinions-zero-shot",
        template=ZERO_SHOT_TEMPLATE,
        commit_message="Single-statement generation, as retained (5th iteration).",
    )


def register_per_set() -> mlflow.entities.model_registry.PromptVersion:
    mlflow.set_experiment(SET_EXPERIMENT_NAME)
    return mlflow.genai.register_prompt(
        name="seed-opinions-per-set",
        template=PER_SET_TEMPLATE,
        commit_message="Multi-statement generation, as retained (23rd iteration).",
    )


def main() -> None:
    # register_prompt() associates the prompt with the active experiment, hence
    # the set_experiment() calls above.
    for prompt in (register_zero_shot(), register_per_set()):
        print(f"Registered '{prompt.name}' version {prompt.version}")


if __name__ == "__main__":
    main()

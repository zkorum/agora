from __future__ import annotations

import json
from dataclasses import dataclass, field

import pytest

from math_updater.bedrock_label_summary import (
    BedrockLabelSummaryConfig,
    BedrockLabelSummaryError,
    build_bedrock_converse_payload,
    generate_label_summaries_with_bedrock,
    parse_bedrock_label_summary_response,
    parse_label_summary_output,
    parse_llm_output_json,
)
from math_updater.description_input import (
    ConversationDescriptionInput,
    GroupDescriptionInput,
    RepresentativeOpinionText,
)
from math_updater.generated_models import VoteEnumSimple


@dataclass
class FakeBedrockClient:
    responses: list[object]
    calls: list[dict[str, object]] = field(default_factory=list)

    def converse(self, **kwargs: object) -> object:
        self.calls.append(kwargs)
        return self.responses.pop(0)


def _config() -> BedrockLabelSummaryConfig:
    return BedrockLabelSummaryConfig(
        region="us-east-1",
        model_id="test-model",
        temperature=0.15,
        top_p=0.9,
        max_tokens=1024,
        prompt="System prompt",
        connect_timeout_seconds=2.0,
        read_timeout_seconds=12.0,
    )


def _conversation() -> ConversationDescriptionInput:
    return ConversationDescriptionInput(
        conversation_title="Transit funding",
        conversation_body="How should transit be funded?",
        groups=[
            GroupDescriptionInput(
                group_key="0",
                representative_opinions=[
                    RepresentativeOpinionText(
                        opinion_id=10,
                        stance=VoteEnumSimple.agree,
                        content="Public transit should be free",
                    ),
                    RepresentativeOpinionText(
                        opinion_id=20,
                        stance=VoteEnumSimple.disagree,
                        content="Taxes are too high",
                    ),
                ],
            )
        ],
    )


def _bedrock_response(text: str) -> dict[str, object]:
    return {"output": {"message": {"content": [{"text": text}]}}}


def test_build_bedrock_converse_payload_matches_existing_prompt_contract() -> None:
    payload = build_bedrock_converse_payload(
        conversation=_conversation(),
        config=_config(),
    )

    assert payload["modelId"] == "test-model"
    assert payload.get("system") == [{"text": json.dumps("System prompt", ensure_ascii=False)}]
    assert payload.get("inferenceConfig") == {
        "maxTokens": 1024,
        "temperature": 0.15,
        "topP": 0.9,
    }
    expected_user_prompt = json.dumps(
        {
            "conversationTitle": "Transit funding",
            "clusters": {
                "0": {
                    "agreesWith": ["Public transit should be free"],
                    "disagreesWith": ["Taxes are too high"],
                }
            },
            "conversationBody": "How should transit be funded?",
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )
    assert payload.get("messages") == [
        {
            "role": "user",
            "content": [{"text": expected_user_prompt}],
        }
    ]


def test_parse_label_summary_output_returns_strict_mode() -> None:
    parsed = parse_label_summary_output(
        {
            "clusters": {
                "0": {
                    "reasoning": "They support free transit and reject tax concerns.",
                    "label": "Transitists",
                    "summary": "This group supports free public transit.",
                }
            }
        }
    )

    assert parsed.mode == "strict"
    assert parsed.clusters["0"].label == "Transitists"


def test_parse_label_summary_output_returns_loose_mode_when_strict_rules_fail() -> None:
    parsed = parse_label_summary_output(
        {
            "clusters": {
                "0": {
                    "label": "Very Long Label",
                    "summary": "This group supports free public transit.",
                }
            }
        }
    )

    assert parsed.mode == "loose"
    assert parsed.clusters["0"].reasoning is None


def test_parse_llm_output_json_handles_fenced_and_repaired_json() -> None:
    parsed = parse_llm_output_json('```json\n{"clusters":{"0":{"label":"A" "summary":"B"}}}\n```')

    assert parsed == {"clusters": {"0": {"label": "A", "summary": "B"}}}


def test_parse_bedrock_label_summary_response_concatenates_text_blocks() -> None:
    parsed = parse_bedrock_label_summary_response(
        {
            "output": {
                "message": {
                    "content": [
                        {"text": '{"clusters":{"0":'},
                        {"text": '{"reasoning":"ok","label":"Transitists","summary":"Summary"}}}'},
                    ]
                }
            }
        }
    )

    assert parsed.clusters["0"].summary == "Summary"


def test_generate_label_summaries_retries_after_parse_failure() -> None:
    client = FakeBedrockClient(
        responses=[
            _bedrock_response("not json"),
            _bedrock_response(
                json.dumps(
                    {
                        "clusters": {
                            "0": {
                                "reasoning": "ok",
                                "label": "Transitists",
                                "summary": "Summary",
                            }
                        }
                    }
                )
            ),
        ]
    )

    parsed = generate_label_summaries_with_bedrock(
        conversation=_conversation(),
        config=_config(),
        client=client,
    )

    assert parsed.clusters["0"].label == "Transitists"
    assert len(client.calls) == 2


def test_generate_label_summaries_raises_after_second_parse_failure() -> None:
    client = FakeBedrockClient(
        responses=[_bedrock_response("not json"), _bedrock_response("still not json")]
    )

    with pytest.raises(BedrockLabelSummaryError, match="after retry"):
        generate_label_summaries_with_bedrock(
            conversation=_conversation(),
            config=_config(),
            client=client,
        )

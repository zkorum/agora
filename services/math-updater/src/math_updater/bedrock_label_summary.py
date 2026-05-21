from __future__ import annotations

import json
import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol, TypeGuard, Unpack

from botocore.config import Config
from botocore.session import get_session

if TYPE_CHECKING:
    from mypy_boto3_bedrock_runtime.type_defs import ConverseRequestTypeDef

    from math_updater.description_input import ConversationDescriptionInput

CLUSTER_KEYS = frozenset({"0", "1", "2", "3", "4", "5"})
LABEL_PATTERN = re.compile(r"^\S+(?:\s\S+)?$")
MISSING_OBJECT_PROPERTY_COMMA_PATTERN = re.compile(
    r'("(?:[^"\\]|\\.)*")(\s+)(?="(?:[^"\\]|\\.)*"\s*:)',
)


class BedrockLabelSummaryError(RuntimeError):
    pass


class BedrockConverseClient(Protocol):
    def converse(self, **kwargs: Unpack[ConverseRequestTypeDef]) -> object: ...


@dataclass(frozen=True)
class BedrockLabelSummaryConfig:
    region: str
    model_id: str
    temperature: float
    top_p: float
    max_tokens: int
    prompt: str
    connect_timeout_seconds: float
    read_timeout_seconds: float


@dataclass(frozen=True)
class LabelSummary:
    reasoning: str | None
    label: str
    summary: str


@dataclass(frozen=True)
class ParsedLabelSummaryOutput:
    mode: str
    clusters: dict[str, LabelSummary]


def create_bedrock_converse_client(
    *,
    region: str,
    connect_timeout_seconds: float,
    read_timeout_seconds: float,
) -> BedrockConverseClient:
    client: object = get_session().create_client(
        "bedrock-runtime",
        region_name=region,
        config=Config(
            connect_timeout=connect_timeout_seconds,
            read_timeout=read_timeout_seconds,
        ),
    )
    if not _is_bedrock_converse_client(client):
        msg = "boto3 bedrock-runtime client does not expose converse()"
        raise BedrockLabelSummaryError(msg)
    return client


def generate_label_summaries_with_bedrock(
    *,
    conversation: ConversationDescriptionInput,
    config: BedrockLabelSummaryConfig,
    client: BedrockConverseClient | None = None,
) -> ParsedLabelSummaryOutput:
    bedrock_client = client or create_bedrock_converse_client(
        region=config.region,
        connect_timeout_seconds=config.connect_timeout_seconds,
        read_timeout_seconds=config.read_timeout_seconds,
    )
    command_payload = build_bedrock_converse_payload(
        conversation=conversation,
        config=config,
    )

    last_parse_error: Exception | None = None
    for _attempt in range(2):
        response = bedrock_client.converse(**command_payload)
        try:
            return parse_bedrock_label_summary_response(response)
        except BedrockLabelSummaryError as error:
            last_parse_error = error

    msg = "unable to parse Bedrock label/summary response after retry"
    raise BedrockLabelSummaryError(msg) from last_parse_error


def build_bedrock_converse_payload(
    *,
    conversation: ConversationDescriptionInput,
    config: BedrockLabelSummaryConfig,
) -> ConverseRequestTypeDef:
    user_prompt = json.dumps(
        _conversation_payload(conversation),
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return {
        "modelId": config.model_id,
        "system": [{"text": json.dumps(config.prompt, ensure_ascii=False)}],
        "messages": [
            {
                "role": "user",
                "content": [{"text": user_prompt}],
            }
        ],
        "inferenceConfig": {
            "maxTokens": config.max_tokens,
            "temperature": config.temperature,
            "topP": config.top_p,
        },
    }


def parse_bedrock_label_summary_response(response: object) -> ParsedLabelSummaryOutput:
    model_response_text = extract_text_content_from_response(response)
    if model_response_text is None:
        msg = "unable to extract text content from Bedrock response"
        raise BedrockLabelSummaryError(msg)
    model_response = parse_llm_output_json(model_response_text)
    return parse_label_summary_output(model_response)


def extract_text_content_from_response(response: object) -> str | None:
    if not _is_string_key_mapping(response):
        return None
    output = response.get("output")
    if not _is_string_key_mapping(output):
        return None
    message = output.get("message")
    if not _is_string_key_mapping(message):
        return None
    content = message.get("content")
    if not _is_object_sequence(content):
        return None

    text_parts: list[str] = []
    for block in content:
        if not _is_string_key_mapping(block):
            continue
        text = block.get("text")
        if isinstance(text, str):
            text_parts.append(text)
    text_content = "".join(text_parts)
    return text_content if text_content.strip() else None


def parse_llm_output_json(raw_llm_output: str) -> dict[str, object]:
    candidate_outputs = _candidate_llm_outputs(raw_llm_output)
    parsed_json = _parse_first_json_object(candidate_outputs)
    if parsed_json is not None:
        return parsed_json

    repaired_candidate_outputs = _repaired_candidate_outputs(candidate_outputs)
    repaired_json = _parse_first_json_object(repaired_candidate_outputs)
    if repaired_json is not None:
        return repaired_json

    for candidate_output in [*candidate_outputs, *repaired_candidate_outputs]:
        extracted_json = _extract_first_json_object(candidate_output)
        if extracted_json is not None:
            return extracted_json

    msg = "unable to extract first JSON object from LLM output"
    raise BedrockLabelSummaryError(msg)


def parse_label_summary_output(model_response: dict[str, object]) -> ParsedLabelSummaryOutput:
    strict_clusters = _parse_clusters(model_response, strict=True)
    if strict_clusters is not None:
        return ParsedLabelSummaryOutput(mode="strict", clusters=strict_clusters)

    loose_clusters = _parse_clusters(model_response, strict=False)
    if loose_clusters is not None:
        return ParsedLabelSummaryOutput(mode="loose", clusters=loose_clusters)

    msg = "unable to parse AI label/summary output"
    raise BedrockLabelSummaryError(msg)


def _conversation_payload(conversation: ConversationDescriptionInput) -> dict[str, object]:
    payload: dict[str, object] = {
        "conversationTitle": conversation.conversation_title,
        "clusters": {
            group.group_key: {
                "agreesWith": group.agrees_with,
                "disagreesWith": group.disagrees_with,
            }
            for group in conversation.groups
        },
    }
    if conversation.conversation_body is not None:
        payload["conversationBody"] = conversation.conversation_body
    return payload


def _parse_clusters(
    model_response: dict[str, object],
    *,
    strict: bool,
) -> dict[str, LabelSummary] | None:
    clusters = model_response.get("clusters")
    if not _is_string_key_mapping(clusters):
        return None

    parsed_clusters: dict[str, LabelSummary] = {}
    for key, value in clusters.items():
        if key not in CLUSTER_KEYS:
            return None
        if not _is_string_key_mapping(value):
            return None
        parsed_value = _parse_cluster_value(value, strict=strict)
        if parsed_value is None:
            return None
        parsed_clusters[key] = parsed_value
    return parsed_clusters


def _parse_cluster_value(
    value: Mapping[str, object],
    *,
    strict: bool,
) -> LabelSummary | None:
    reasoning = value.get("reasoning")
    label = value.get("label")
    summary = value.get("summary")
    if not isinstance(label, str) or not isinstance(summary, str):
        return None
    if reasoning is not None and not isinstance(reasoning, str):
        return None
    if strict:
        if not isinstance(reasoning, str) or len(reasoning) > 2000:
            return None
        if len(label) > 100 or LABEL_PATTERN.fullmatch(label) is None:
            return None
        if len(summary) > 1000:
            return None
    return LabelSummary(
        reasoning=reasoning if isinstance(reasoning, str) else None,
        label=label,
        summary=summary,
    )


def _candidate_llm_outputs(raw_llm_output: str) -> list[str]:
    trimmed_output = raw_llm_output.strip()
    markdown_code_fence_match = re.fullmatch(
        r"```(?:json)?\s*([\s\S]*?)\s*```",
        trimmed_output,
        flags=re.IGNORECASE,
    )
    unfenced_output = (
        markdown_code_fence_match.group(1).strip()
        if markdown_code_fence_match is not None
        else None
    )
    candidates = [trimmed_output]
    if unfenced_output:
        candidates.append(unfenced_output)
    return list(dict.fromkeys(candidate for candidate in candidates if candidate))


def _repaired_candidate_outputs(candidate_outputs: list[str]) -> list[str]:
    repaired_outputs = [
        MISSING_OBJECT_PROPERTY_COMMA_PATTERN.sub(r"\1,\2", candidate_output)
        for candidate_output in candidate_outputs
    ]
    return list(
        dict.fromkeys(
            repaired_output
            for candidate_output, repaired_output in zip(
                candidate_outputs,
                repaired_outputs,
                strict=True,
            )
            if repaired_output != candidate_output
        )
    )


def _parse_first_json_object(candidate_outputs: list[str]) -> dict[str, object] | None:
    for candidate_output in candidate_outputs:
        try:
            parsed = json.loads(candidate_output)
        except json.JSONDecodeError:
            continue
        if _is_string_key_mapping(parsed):
            return parsed
    return None


def _extract_first_json_object(candidate_output: str) -> dict[str, object] | None:
    decoder = json.JSONDecoder()
    for index, character in enumerate(candidate_output):
        if character != "{":
            continue
        try:
            parsed, _end = decoder.raw_decode(candidate_output[index:])
        except json.JSONDecodeError:
            continue
        if _is_string_key_mapping(parsed):
            return parsed
    return None


def _is_string_key_mapping(value: object) -> TypeGuard[dict[str, object]]:
    return isinstance(value, dict)


def _is_bedrock_converse_client(value: object) -> TypeGuard[BedrockConverseClient]:
    return callable(getattr(value, "converse", None))


def _is_object_sequence(value: object) -> TypeGuard[Sequence[object]]:
    return isinstance(value, Sequence) and not isinstance(value, str | bytes | bytearray)

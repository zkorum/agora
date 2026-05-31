from __future__ import annotations

import json
import logging
import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol, TypeGuard, Unpack

from botocore.config import Config
from botocore.session import get_session

if TYPE_CHECKING:
    from mypy_boto3_bedrock_runtime.type_defs import ConverseRequestTypeDef

    from agora_worker_shared.description_input import ConversationDescriptionInput

CLUSTER_KEYS = frozenset({"0", "1", "2", "3", "4", "5"})
LABEL_PATTERN = re.compile(r"^\S+(?:\s\S+)?$")
MISSING_OBJECT_PROPERTY_COMMA_PATTERN = re.compile(
    r'("(?:[^"\\]|\\.)*")(\s+)(?="(?:[^"\\]|\\.)*"\s*:)',
)
log = logging.getLogger(__name__)


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
            retries={"total_max_attempts": 1},
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
    log.info(
        "[DescriptionGenerator] Bedrock label/summary request "
        "model_id=%s analysis_snapshot_id=%s group_count=%d system_prompt_json=%s "
        "user_prompt=%s representative_opinions=%s",
        config.model_id,
        conversation.analysis_snapshot_id,
        len(conversation.groups),
        json.dumps(config.prompt, ensure_ascii=False),
        _conversation_payload_json(conversation),
        _representative_opinions_json(conversation),
    )

    response = bedrock_client.converse(**command_payload)
    model_response_text = extract_text_content_from_response(response)
    log.info(
        "[DescriptionGenerator] Bedrock label/summary response "
        "model_id=%s analysis_snapshot_id=%s response_text_json=%s",
        config.model_id,
        conversation.analysis_snapshot_id,
        json.dumps(model_response_text, ensure_ascii=False),
    )
    if model_response_text is None:
        msg = "unable to extract text content from Bedrock response"
        raise BedrockLabelSummaryError(msg)
    parsed = parse_bedrock_label_summary_text(
        model_response_text,
        expected_group_keys={group.group_key for group in conversation.groups},
        allow_partial=True,
    )
    log.info(
        "[DescriptionGenerator] Bedrock label/summary parsed "
        "model_id=%s analysis_snapshot_id=%s mode=%s labels=%s",
        config.model_id,
        conversation.analysis_snapshot_id,
        parsed.mode,
        _parsed_labels_json(parsed),
    )
    return parsed


def build_bedrock_converse_payload(
    *,
    conversation: ConversationDescriptionInput,
    config: BedrockLabelSummaryConfig,
) -> ConverseRequestTypeDef:
    user_prompt = _conversation_payload_json(conversation)
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


def parse_bedrock_label_summary_response(
    response: object,
    *,
    expected_group_keys: set[str] | None = None,
    allow_partial: bool = False,
) -> ParsedLabelSummaryOutput:
    model_response_text = extract_text_content_from_response(response)
    if model_response_text is None:
        msg = "unable to extract text content from Bedrock response"
        raise BedrockLabelSummaryError(msg)
    return parse_bedrock_label_summary_text(
        model_response_text,
        expected_group_keys=expected_group_keys,
        allow_partial=allow_partial,
    )


def parse_bedrock_label_summary_text(
    model_response_text: str,
    *,
    expected_group_keys: set[str] | None = None,
    allow_partial: bool = False,
) -> ParsedLabelSummaryOutput:
    last_error: BedrockLabelSummaryError | None = None
    for model_response in iter_llm_output_json_candidates(model_response_text):
        try:
            if expected_group_keys is not None:
                return parse_label_summary_output_for_groups(
                    model_response,
                    expected_group_keys=expected_group_keys,
                    allow_partial=allow_partial,
                )
            return parse_label_summary_output(model_response)
        except BedrockLabelSummaryError as error:
            last_error = error
    msg = "unable to parse AI label/summary output from any JSON object"
    raise BedrockLabelSummaryError(msg) from last_error


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
    for candidate in iter_llm_output_json_candidates(raw_llm_output):
        return candidate

    msg = "unable to extract first JSON object from LLM output"
    raise BedrockLabelSummaryError(msg)


def iter_llm_output_json_candidates(raw_llm_output: str) -> list[dict[str, object]]:
    candidate_outputs = _candidate_llm_outputs(raw_llm_output)
    repaired_candidate_outputs = _repaired_candidate_outputs(candidate_outputs)
    json_candidates: list[dict[str, object]] = []
    seen_candidates: set[str] = set()
    for candidate in [
        *_parse_json_objects(candidate_outputs),
        *_parse_json_objects(repaired_candidate_outputs),
        *_extract_json_objects([*candidate_outputs, *repaired_candidate_outputs]),
    ]:
        candidate_key = json.dumps(candidate, ensure_ascii=False, sort_keys=True)
        if candidate_key in seen_candidates:
            continue
        seen_candidates.add(candidate_key)
        json_candidates.append(candidate)
    return json_candidates


def parse_label_summary_output(model_response: dict[str, object]) -> ParsedLabelSummaryOutput:
    strict_clusters = _parse_clusters(model_response, strict=True)
    if strict_clusters is not None:
        return ParsedLabelSummaryOutput(mode="strict", clusters=strict_clusters)

    loose_clusters = _parse_clusters(model_response, strict=False)
    if loose_clusters is not None:
        return ParsedLabelSummaryOutput(mode="loose", clusters=loose_clusters)

    msg = "unable to parse AI label/summary output"
    raise BedrockLabelSummaryError(msg)


def parse_label_summary_output_for_groups(
    model_response: dict[str, object],
    *,
    expected_group_keys: set[str],
    allow_partial: bool = False,
) -> ParsedLabelSummaryOutput:
    unexpected_keys = expected_group_keys - CLUSTER_KEYS
    if unexpected_keys:
        msg = f"unsupported expected cluster keys: {sorted(unexpected_keys)}"
        raise BedrockLabelSummaryError(msg)
    clusters = model_response.get("clusters")
    if not _is_string_key_mapping(clusters):
        msg = "unable to parse AI label/summary output"
        raise BedrockLabelSummaryError(msg)

    parsed_clusters: dict[str, LabelSummary] = {}
    used_loose_mode = False
    for group_key in sorted(expected_group_keys):
        raw_cluster = clusters.get(group_key)
        if not _is_string_key_mapping(raw_cluster):
            if allow_partial:
                continue
            msg = f"missing generated description for group {group_key}"
            raise BedrockLabelSummaryError(msg)
        parsed_cluster = _parse_cluster_value(raw_cluster, strict=True)
        if parsed_cluster is None:
            parsed_cluster = _parse_cluster_value(raw_cluster, strict=False)
            used_loose_mode = parsed_cluster is not None
        if parsed_cluster is None:
            if allow_partial:
                continue
            msg = f"invalid generated description for group {group_key}"
            raise BedrockLabelSummaryError(msg)
        parsed_clusters[group_key] = parsed_cluster

    if not parsed_clusters:
        msg = "AI label/summary output did not include any valid expected clusters"
        raise BedrockLabelSummaryError(msg)
    if not allow_partial and set(parsed_clusters) != expected_group_keys:
        msg = "AI label/summary output did not include exactly the expected clusters"
        raise BedrockLabelSummaryError(msg)
    return ParsedLabelSummaryOutput(
        mode="loose" if used_loose_mode else "strict",
        clusters=parsed_clusters,
    )


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


def _conversation_payload_json(conversation: ConversationDescriptionInput) -> str:
    return json.dumps(
        _conversation_payload(conversation),
        ensure_ascii=False,
        separators=(",", ":"),
    )


def _representative_opinions_json(conversation: ConversationDescriptionInput) -> str:
    return json.dumps(
        {
            group.group_key: [
                {
                    "opinionId": opinion.opinion_id,
                    "stance": opinion.stance.value,
                    "content": opinion.content,
                }
                for opinion in group.representative_opinions
            ]
            for group in conversation.groups
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )


def _parsed_labels_json(parsed: ParsedLabelSummaryOutput) -> str:
    return json.dumps(
        {
            group_key: {
                "label": label_summary.label,
                "summary": label_summary.summary,
            }
            for group_key, label_summary in parsed.clusters.items()
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )


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
    if len(label) > 100 or len(summary) > 1000:
        return None
    if strict:
        if not isinstance(reasoning, str) or len(reasoning) > 2000:
            return None
        if LABEL_PATTERN.fullmatch(label) is None:
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


def _parse_json_objects(candidate_outputs: list[str]) -> list[dict[str, object]]:
    parsed_objects: list[dict[str, object]] = []
    for candidate_output in candidate_outputs:
        try:
            parsed = json.loads(candidate_output)
        except json.JSONDecodeError:
            continue
        if _is_string_key_mapping(parsed):
            parsed_objects.append(parsed)
    return parsed_objects


def _extract_json_objects(candidate_outputs: list[str]) -> list[dict[str, object]]:
    extracted_objects: list[dict[str, object]] = []
    decoder = json.JSONDecoder()
    for candidate_output in candidate_outputs:
        for index, character in enumerate(candidate_output):
            if character != "{":
                continue
            try:
                parsed, _end = decoder.raw_decode(candidate_output[index:])
            except json.JSONDecodeError:
                continue
            if _is_string_key_mapping(parsed):
                extracted_objects.append(parsed)
    return extracted_objects


def _is_string_key_mapping(value: object) -> TypeGuard[dict[str, object]]:
    return isinstance(value, dict)


def _is_bedrock_converse_client(value: object) -> TypeGuard[BedrockConverseClient]:
    return callable(getattr(value, "converse", None))


def _is_object_sequence(value: object) -> TypeGuard[Sequence[object]]:
    return isinstance(value, Sequence) and not isinstance(value, str | bytes | bytearray)

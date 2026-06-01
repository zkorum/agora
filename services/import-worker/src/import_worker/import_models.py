from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class PolisConversationData(BaseModel):
    model_config = ConfigDict(extra="allow")

    topic: str
    description: str
    ownername: str | None = None
    created: int | float | None = None
    participant_count: int | None = None
    link_url: str | None = None
    conversation_id: str | int | None = None


class PolisComment(BaseModel):
    model_config = ConfigDict(extra="allow")

    statement_id: int
    participant_id: int
    txt: str
    moderated: int | None = None
    active: bool | None = None
    agree_count: int | None = None
    disagree_count: int | None = None
    pass_count: int | None = None
    created: str | None = None
    datetime: str | None = None
    is_seed: bool | None = None


class PolisVoteRecord(BaseModel):
    model_config = ConfigDict(extra="allow")

    participant_id: int
    statement_id: int
    vote: int
    conversation_id: str | int | None = None
    datetime: str | None = None
    modified: int | float | None = None
    weight_x_32767: int | None = None

    @field_validator("vote")
    @classmethod
    def validate_vote(cls, value: int) -> int:
        if value not in {-1, 0, 1}:
            msg = "vote must be -1, 0, or 1"
            raise ValueError(msg)
        return value


class ImportPolisResults(BaseModel):
    model_config = ConfigDict(extra="forbid")

    report_id: str | None
    conversation_id: str | int | None
    conversation_data: PolisConversationData
    comments_data: list[PolisComment]
    votes_data: list[PolisVoteRecord]


class SummaryCsvRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str = Field(min_length=1, max_length=140)
    url: HttpUrl | Literal[""] | None = None
    views: int | None = Field(default=None, ge=0)
    voters: int = Field(ge=0)
    voters_in_conv: int = Field(alias="voters-in-conv", ge=0)
    commenters: int = Field(ge=0)
    comments: int = Field(ge=0)
    groups: int = Field(ge=0)
    conversation_description: str | Literal[""] | None = Field(
        default=None,
        alias="conversation-description",
    )


class CommentCsvRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    timestamp: int
    datetime: str
    comment_id: int = Field(alias="comment-id")
    author_id: int = Field(alias="author-id")
    agrees: int = Field(ge=0)
    disagrees: int = Field(ge=0)
    moderated: int
    importance: int | None = Field(default=None, ge=0)
    comment_body: str = Field(alias="comment-body")

    @field_validator("moderated")
    @classmethod
    def validate_moderated(cls, value: int) -> int:
        if value not in {-1, 0, 1}:
            msg = "moderated must be -1, 0, or 1"
            raise ValueError(msg)
        return value


class VoteCsvRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    timestamp: int
    datetime: str
    comment_id: int = Field(alias="comment-id")
    voter_id: int = Field(alias="voter-id")
    vote: int
    important: int | None = Field(default=None, ge=0, le=1)

    @field_validator("vote")
    @classmethod
    def validate_vote(cls, value: int) -> int:
        if value not in {-1, 0, 1}:
            msg = "vote must be -1, 0, or 1"
            raise ValueError(msg)
        return value

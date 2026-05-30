// SSE edge cases adapted from eventsource-parser tests (MIT).
// Copyright (c) 2026 Espen Hovlandsdal. https://github.com/rexxars/eventsource-parser

import { describe, expect, it } from "vitest";

import { parseRawSSEFrame, splitCompleteSSEFrames } from "./frameParser";

describe("splitCompleteSSEFrames", () => {
  it("keeps incomplete frames in the remaining buffer", () => {
    const result = splitCompleteSSEFrames('event: connected\ndata: {"tim');

    expect(result).toEqual({
      frames: [],
      remainingBuffer: 'event: connected\ndata: {"tim',
    });
  });

  it("splits complete LF-delimited frames", () => {
    const result = splitCompleteSSEFrames(
      'event: connected\ndata: {"timestamp":1}\n\n: heartbeat\n\nleftover'
    );

    expect(result).toEqual({
      frames: ['event: connected\ndata: {"timestamp":1}', ": heartbeat"],
      remainingBuffer: "leftover",
    });
  });

  it("splits complete CR-delimited frames", () => {
    const result = splitCompleteSSEFrames(
      'data: {"first":true}\r\rdata: {"second":true}\r\rdata: {"third":true}'
    );

    expect(result).toEqual({
      frames: ['data: {"first":true}', 'data: {"second":true}'],
      remainingBuffer: 'data: {"third":true}',
    });
  });

  it("splits frames with mixed valid line terminators", () => {
    const result = splitCompleteSSEFrames(
      'data: {"a":true}\r\n\ndata: {"b":true}\n\rdata: {"c":true}\r\r\n'
    );

    expect(result).toEqual({
      frames: [
        'data: {"a":true}',
        'data: {"b":true}',
        'data: {"c":true}',
      ],
      remainingBuffer: "",
    });
  });

  it("does not treat half of a CRLF as a frame delimiter", () => {
    const firstChunk = 'event: connected\r';
    const firstResult = splitCompleteSSEFrames(firstChunk);

    expect(firstResult).toEqual({
      frames: [],
      remainingBuffer: firstChunk,
    });

    const secondResult = splitCompleteSSEFrames(
      `${firstResult.remainingBuffer}\ndata: {"timestamp":1}\r\n\r\n`
    );

    expect(secondResult).toEqual({
      frames: ['event: connected\r\ndata: {"timestamp":1}'],
      remainingBuffer: "",
    });
  });

  it("keeps CR at the end of a chunk until the next chunk resolves the line ending", () => {
    const firstResult = splitCompleteSSEFrames("data: A\r\n");

    expect(firstResult).toEqual({
      frames: [],
      remainingBuffer: "data: A\r\n",
    });

    const secondResult = splitCompleteSSEFrames(
      `${firstResult.remainingBuffer}data: B\r`
    );

    expect(secondResult).toEqual({
      frames: [],
      remainingBuffer: "data: A\r\ndata: B\r",
    });

    const thirdResult = splitCompleteSSEFrames(
      `${secondResult.remainingBuffer}\ndata: C\r\n\n`
    );

    expect(thirdResult).toEqual({
      frames: ["data: A\r\ndata: B\r\ndata: C"],
      remainingBuffer: "",
    });
  });
});

describe("parseRawSSEFrame", () => {
  it("parses event and data lines", () => {
    expect(
      parseRawSSEFrame('event: connected\ndata: {"timestamp":1}')
    ).toEqual({
      kind: "event",
      event: "connected",
      data: '{"timestamp":1}',
      id: null,
      retry: null,
    });
  });

  it("ignores comment-only heartbeat frames", () => {
    expect(parseRawSSEFrame(": heartbeat")).toEqual({ kind: "comment" });
  });

  it("joins multiline data with newline characters", () => {
    expect(parseRawSSEFrame("event: message\ndata: {\ndata: }")).toEqual({
      kind: "event",
      event: "message",
      data: "{\n}",
      id: null,
      retry: null,
    });
  });

  it("removes only one optional space after field separators", () => {
    expect(parseRawSSEFrame('event:  spaced\ndata:  {"ok":true}')).toEqual({
      kind: "event",
      event: " spaced",
      data: ' {"ok":true}',
      id: null,
      retry: null,
    });
  });

  it("treats data fields without colons as empty data lines", () => {
    expect(parseRawSSEFrame("data\ndata")).toEqual({
      kind: "event",
      event: "",
      data: "\n",
      id: null,
      retry: null,
    });
  });

  it("parses event id and retry fields", () => {
    expect(
      parseRawSSEFrame('id: 42\nretry: 5000\nevent: update\ndata: {"ok":true}')
    ).toEqual({
      kind: "event",
      event: "update",
      data: '{"ok":true}',
      id: "42",
      retry: 5000,
    });
  });
});

// SSE parsing logic adapted from eventsource-parser (MIT).
// Copyright (c) 2026 Espen Hovlandsdal. https://github.com/rexxars/eventsource-parser

export type ParsedSSEFrame =
  | { kind: "comment" }
  | {
      kind: "event";
      event: string;
      data: string;
      id: string | null;
      retry: number | null;
    };

interface SplitCompleteSSEFramesResult {
  frames: string[];
  remainingBuffer: string;
}

const LF = 10;
const CR = 13;
const SPACE = 32;

const DATA_FIELD = "data";
const EVENT_FIELD = "event";
const ID_FIELD = "id";
const RETRY_FIELD = "retry";

function normalizeSSELineEndings(raw: string): string {
  return raw.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

export function splitCompleteSSEFrames(
  buffer: string
): SplitCompleteSSEFramesResult {
  const frames: string[] = [];
  let frameStart = 0;
  let frameContentEnd = 0;
  let lineStart = 0;
  let index = 0;

  while (index < buffer.length) {
    const charCode = buffer.charCodeAt(index);
    if (charCode !== LF && charCode !== CR) {
      index += 1;
      continue;
    }

    if (charCode === CR && index === buffer.length - 1) {
      break;
    }

    const lineEnd = index;
    let nextIndex = index + 1;
    if (charCode === CR && buffer.charCodeAt(nextIndex) === LF) {
      nextIndex += 1;
    }

    if (lineEnd === lineStart) {
      frames.push(buffer.slice(frameStart, frameContentEnd));
      frameStart = nextIndex;
      frameContentEnd = frameStart;
      lineStart = nextIndex;
      index = nextIndex;
      continue;
    }

    frameContentEnd = lineEnd;
    lineStart = nextIndex;
    index = nextIndex;
  }

  return { frames, remainingBuffer: buffer.slice(frameStart) };
}

function fieldValue({
  line,
  fieldName,
}: {
  line: string;
  fieldName: string;
}): string {
  if (line === fieldName) {
    return "";
  }

  const valueStart = fieldName.length + 1;
  return line.charCodeAt(valueStart) === SPACE
    ? line.slice(valueStart + 1)
    : line.slice(valueStart);
}

export function parseRawSSEFrame(raw: string): ParsedSSEFrame {
  let event = "";
  let id: string | null = null;
  let retry: number | null = null;
  const dataLines: string[] = [];
  for (const line of normalizeSSELineEndings(raw).split("\n")) {
    if (line.startsWith(":")) {
      continue;
    }

    if (line === EVENT_FIELD || line.startsWith(`${EVENT_FIELD}:`)) {
      event = fieldValue({ line, fieldName: EVENT_FIELD });
    } else if (line === DATA_FIELD || line.startsWith(`${DATA_FIELD}:`)) {
      dataLines.push(fieldValue({ line, fieldName: DATA_FIELD }));
    } else if (line === ID_FIELD || line.startsWith(`${ID_FIELD}:`)) {
      const value = fieldValue({ line, fieldName: ID_FIELD });
      if (!value.includes("\0")) {
        id = value;
      }
    } else if (line === RETRY_FIELD || line.startsWith(`${RETRY_FIELD}:`)) {
      const value = fieldValue({ line, fieldName: RETRY_FIELD });
      if (/^\d+$/.test(value)) {
        retry = Number(value);
      }
    }
  }

  if (event === "" && dataLines.length === 0) {
    return { kind: "comment" };
  }

  return { kind: "event", event, data: dataLines.join("\n"), id, retry };
}

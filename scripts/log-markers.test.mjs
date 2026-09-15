import assert from "node:assert/strict";
import test from "node:test";
import { extractMarkerPayload } from "./log-markers.mjs";

const event = {
  schemaVersion: 1,
  action: "save",
  metadata: { label: 'quoted "value"' },
};
const message = `AGORA_LOAD_EVENT ${JSON.stringify(event)}`;
for (const [name, line] of [
  ["Pino JSON", JSON.stringify({ level: 30, msg: message })],
  ["k6", `time="now" level=info msg=${JSON.stringify(message)} source=console`],
  ["Python", `2026-09-14 [INFO] worker: ${message}`],
]) {
  test(`extracts ${name} events`, () => {
    assert.deepEqual(
      JSON.parse(extractMarkerPayload({ line, prefix: "AGORA_LOAD_EVENT" })),
      event
    );
  });
}
test("ignores unrelated and incomplete messages", () => {
  for (const line of [
    "ordinary log",
    "AGORA_LOAD_EVENT {",
    JSON.stringify({ msg: "ordinary" }),
  ]) {
    assert.equal(
      extractMarkerPayload({ line, prefix: "AGORA_LOAD_EVENT" }),
      undefined
    );
  }
});

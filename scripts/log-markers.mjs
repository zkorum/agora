/** Extract existing semantic markers from Pino JSON, k6, and Python/plain logs. */
export function extractMarkerPayload({ line, prefix }) {
  const candidates = [line];
  try {
    const record = JSON.parse(line);
    if (typeof record?.msg === "string") candidates.unshift(record.msg);
  } catch {
    const match = line.match(/\bmsg="((?:\\.|[^"])*)"/);
    if (match) {
      try {
        candidates.unshift(JSON.parse(`"${match[1]}"`));
      } catch {
        // A truncated line is not a complete event.
      }
    }
  }
  for (const candidate of candidates) {
    const index = candidate.indexOf(prefix);
    if (index === -1) continue;
    const payload = candidate.slice(index + prefix.length).trim();
    if (!payload.startsWith("{")) continue;
    try {
      return JSON.stringify(JSON.parse(payload));
    } catch {
      // Try the next representation of the message.
    }
  }
  return undefined;
}

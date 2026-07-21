import {
  addStackOverflowDiagnostics,
  isStackOverflowEvent,
} from "src/utils/sentry/stackOverflowDiagnostics";
import { describe, expect, it } from "vitest";

function createDocument(bodyHtml = ""): Document {
  const documentRoot = document.implementation.createHTMLDocument();
  documentRoot.body.innerHTML = bodyHtml;
  return documentRoot;
}

describe("stack overflow diagnostics", () => {
  it("does not inspect or modify unrelated events", () => {
    const documentRoot = createDocument("<font><font>Translated</font></font>");
    const event = {
      type: undefined,
      exception: { values: [{ type: "TypeError", value: "Failed" }] },
    };

    expect(isStackOverflowEvent(event)).toBe(false);
    expect(addStackOverflowDiagnostics({ event, documentRoot })).toBe(event);
  });

  it("records translated DOM evidence without capturing text", () => {
    const documentRoot = createDocument(
      "<main><font><font><font>Private translated text</font></font></font></main>"
    );
    documentRoot.documentElement.classList.add("translated-ltr");

    const result = addStackOverflowDiagnostics({
      event: {
        type: undefined,
        tags: { existing: "tag" },
        contexts: { existing: { retained: true } },
        exception: {
          values: [
            {
              type: "RangeError",
              value: "Maximum call stack size exceeded.",
              stacktrace: {
                frames: [{ filename: "undefined", in_app: false }],
              },
            },
          ],
        },
      },
      documentRoot,
    });

    expect(
      isStackOverflowEvent({
        type: undefined,
        exception: {
          values: [
            {
              type: "RangeError",
              value: "Maximum call stack size exceeded.",
            },
          ],
        },
      })
    ).toBe(true);
    expect(result.tags).toEqual({
      existing: "tag",
      browser_translation_dom: "both",
      stack_overflow_frame_origin: "non_app",
    });
    expect(result.contexts).toEqual({
      existing: { retained: true },
      browser_translation_diagnostics: {
        google_class_marker: true,
        font_element_count_bucket: "2-4",
        max_observed_font_depth_bucket: "2-4",
        font_depth_scan_truncated: false,
      },
    });
    expect(JSON.stringify(result)).not.toContain("Private translated text");
  });

  it("distinguishes application frames from missing translation evidence", () => {
    const documentRoot = createDocument();
    const result = addStackOverflowDiagnostics({
      event: {
        type: undefined,
        exception: {
          values: [
            {
              type: "RangeError",
              value: "Maximum call stack size exceeded.",
              stacktrace: { frames: [{ in_app: true }] },
            },
          ],
        },
      },
      documentRoot,
    });

    expect(result.tags).toEqual({
      browser_translation_dom: "none",
      stack_overflow_frame_origin: "in_app",
    });
  });

  it("does not classify frames with missing ownership as non-app", () => {
    const result = addStackOverflowDiagnostics({
      event: {
        type: undefined,
        exception: {
          values: [
            {
              type: "RangeError",
              value: "Maximum call stack size exceeded",
              stacktrace: { frames: [{ filename: "undefined" }] },
            },
          ],
        },
      },
      documentRoot: createDocument(),
    });

    expect(result.tags?.stack_overflow_frame_origin).toBe("unknown");
  });

  it("bounds inspection of pathologically deep translated markup", () => {
    const nestedFonts = `${"<font>".repeat(60)}Private text${"</font>".repeat(60)}`;
    const result = addStackOverflowDiagnostics({
      event: {
        type: undefined,
        exception: {
          values: [
            {
              type: "RangeError",
              value: "Maximum call stack size exceeded.",
            },
          ],
        },
      },
      documentRoot: createDocument(nestedFonts),
    });

    expect(result.tags?.browser_translation_dom).toBe("nested_font");
    expect(result.contexts?.browser_translation_diagnostics).toEqual({
      google_class_marker: false,
      font_element_count_bucket: "50+",
      max_observed_font_depth_bucket: "50+",
      font_depth_scan_truncated: true,
    });
    expect(JSON.stringify(result)).not.toContain("Private text");
  });
});

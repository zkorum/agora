import linkifyHtml from "linkify-html";

import {
  convertHtmlToCountedTextFallback,
  htmlToCountedText,
} from "../../../../../shared/src/richText.js";
import {
  normalizeUserRichTextHtml,
  sanitizeRichTextContent,
} from "../../../../../shared/src/richTextHtml.js";
import {
  countPlainTextCharacters,
  hasVisiblePlainText,
  MAX_LENGTH_CONVERSATION_BODY,
  validateRichTextHtmlByteCount,
  validateRichTextInputWithPlainText,
} from "../../../../../shared/src/shared.js";

export const projectBodyCharacterLimit = MAX_LENGTH_CONVERSATION_BODY;

export function getProjectBodyStatus(value: string): {
  html: string;
  characterCount: number;
  failure: "plain_text_too_long" | "html_too_long" | undefined;
} {
  if (value === "") {
    return { html: "", characterCount: 0, failure: undefined };
  }
  const rawSize = validateRichTextHtmlByteCount({
    htmlString: value,
    mode: "conversation",
  });
  const normalized = normalizeUserRichTextHtml(value).trim();
  const countedText = htmlToCountedText(normalized);
  // The counting converter synthesizes bullet and number prefixes even when
  // list items contain no text. They cannot satisfy a required description.
  const visibleText = /<(?:ul|ol)>/i.test(normalized)
    ? convertHtmlToCountedTextFallback(normalized)
    : countedText;
  const html = hasVisiblePlainText(visibleText) ? normalized : "";
  const plainText = html === "" ? "" : countedText;
  const validation = validateRichTextInputWithPlainText({
    htmlString: normalized,
    plainText,
    mode: "conversation",
  });
  const failure = rawSize.success
    ? validation.success
      ? undefined
      : validation.reason
    : rawSize.reason;
  return {
    html,
    characterCount: validation.success
      ? validation.characterCount
      : validation.reason === "plain_text_too_long"
        ? validation.count
        : countPlainTextCharacters(plainText).characterCount,
    failure: failure === "plain_text_empty" ? undefined : failure,
  };
}

export function getProjectBodyDisplayHtml(value: string): string {
  return linkifyHtml(
    sanitizeRichTextContent({ htmlString: value, mode: "output" }),
    {
      defaultProtocol: "https",
      attributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
    },
  );
}

export function getProjectBodyExcerpt(value: string): string {
  const sanitized = sanitizeRichTextContent({
    htmlString: value,
    mode: "output",
  });
  return htmlToCountedText(sanitized).replace(/\s+/g, " ");
}

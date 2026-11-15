import { ZodSupportedDisplayLanguageCodes } from "src/shared/languages";
import { describe, expect, it } from "vitest";

import {
  privacyPolicyContent,
  type PrivacyPolicyNode,
} from "./privacy/index.i18n";
import { type TermsBlock, termsOfServiceContent } from "./terms/index.i18n";

function privacyLeaves(nodes: readonly PrivacyPolicyNode[]): string[] {
  return nodes.flatMap((node) =>
    typeof node === "string" ? [node] : privacyLeaves(node.children)
  );
}

function privacyText(nodes: readonly PrivacyPolicyNode[]): string {
  return privacyLeaves(nodes).join(" ");
}

function expectNumericalReferences({
  source,
  translation,
}: {
  source: string;
  translation: string;
}): void {
  const translatedNumbers = translation.match(/\d+/g) ?? [];
  let nextIndex = 0;
  // Translations may render spelled-out quantities, such as "one month", as digits.
  for (const number of source.match(/\d+/g) ?? []) {
    const index = translatedNumbers.indexOf(number, nextIndex);
    expect(index).toBeGreaterThanOrEqual(0);
    nextIndex = index + 1;
  }
}

function termsBlockText(block: TermsBlock): string {
  if (block.type === "address") return block.lines.join(" ");
  if (block.type === "list")
    return block.items
      .flatMap((item) => item.content.map((part) => part.text))
      .join(" ");
  return block.content.map((part) => part.text).join(" ");
}

function privacyStructure(nodes: readonly PrivacyPolicyNode[]): unknown {
  return nodes.map((node) => {
    if (typeof node === "string") return "text";
    return {
      tag: node.tag,
      children: privacyStructure(node.children),
      ...(node.tag === "a" ? { href: node.href, external: node.external } : {}),
    };
  });
}

function termsBlockStructure(block: TermsBlock): unknown {
  if (block.type === "address")
    return { type: block.type, lineCount: block.lines.length };
  const content =
    block.type === "list"
      ? block.items.map((item) => item.content)
      : [block.content];
  return {
    type: block.type,
    ...(block.type === "list"
      ? { ordered: block.ordered, marker: block.marker }
      : {}),
    content: content.map((parts) =>
      parts.map((part) => ({
        kind: part.kind,
        ...(part.kind === "link"
          ? { href: part.href, external: part.external }
          : {}),
      }))
    ),
  };
}

const englishPrivacy = privacyText(privacyPolicyContent.en.nodes);
const englishTerms = termsOfServiceContent.en.sections
  .flatMap((section) => section.blocks.map(termsBlockText))
  .join(" ");

describe("concise multilingual privacy/retention documents", () => {
  it("preserves both documents for every display locale", () => {
    const locales = [...ZodSupportedDisplayLanguageCodes.options].sort();
    expect(Object.keys(privacyPolicyContent).sort()).toEqual(locales);
    expect(Object.keys(termsOfServiceContent).sort()).toEqual(locales);
  });

  it.each(ZodSupportedDisplayLanguageCodes.options)(
    "%s preserves the English privacy structure, links, numerical references and publication date",
    (locale) => {
      const content = privacyPolicyContent[locale];
      expect(privacyStructure(content.nodes)).toEqual(
        privacyStructure(privacyPolicyContent.en.nodes)
      );
      expectNumericalReferences({
        source: englishPrivacy,
        translation: privacyText(content.nodes),
      });
      expect(privacyText(content.nodes).match(/\d{4}\/\d{2}\/\d{2}/g)).toEqual(
        englishPrivacy.match(/\d{4}\/\d{2}\/\d{2}/g)
      );
      expect(content.title.trim()).not.toBe("");
      expect(
        privacyLeaves(content.nodes).every((text) => text.trim() !== "")
      ).toBe(true);
      for (const label of Object.values(content.automatedTranslationNotice)) {
        expect(label.trim()).not.toBe("");
      }
    }
  );

  it.each(ZodSupportedDisplayLanguageCodes.options)(
    "%s preserves the English Terms structure, links, numerical references and publication date",
    (locale) => {
      const content = termsOfServiceContent[locale];
      expect(content.lastUpdatedDate).toBe(
        termsOfServiceContent.en.lastUpdatedDate
      );
      expect(
        content.sections.map((section) =>
          section.blocks.map(termsBlockStructure)
        )
      ).toEqual(
        termsOfServiceContent.en.sections.map((section) =>
          section.blocks.map(termsBlockStructure)
        )
      );
      const text = content.sections
        .flatMap((section) => section.blocks.map(termsBlockText))
        .join(" ");
      expectNumericalReferences({ source: englishTerms, translation: text });
      expect(content.introduction).toHaveLength(
        termsOfServiceContent.en.introduction.length
      );
      for (const label of [
        content.termsOfService,
        content.automatedTranslationNoticeTitle,
        content.automatedTranslationNotice,
        content.viewAuthoritativeEnglishVersion,
        content.returnToTranslatedVersion,
        content.lastUpdatedLabel,
      ]) {
        expect(label.trim()).not.toBe("");
      }
      for (const section of content.sections) {
        expect(section.heading.trim()).not.toBe("");
      }
    }
  );

  it.each(
    ZodSupportedDisplayLanguageCodes.options.filter((locale) => locale !== "en")
  )("%s does not leave substantive English passages untranslated", (locale) => {
    const privacy = privacyText(privacyPolicyContent[locale].nodes);
    const terms = termsOfServiceContent[locale].sections
      .flatMap((section) => section.blocks.map(termsBlockText))
      .join(" ");
    for (const passage of privacyLeaves(privacyPolicyContent.en.nodes)) {
      if (passage.trim().length >= 60)
        expect(privacy).not.toContain(passage.trim());
    }
    for (const passage of termsOfServiceContent.en.sections.flatMap((section) =>
      section.blocks
        .filter((block) => block.type !== "address")
        .map(termsBlockText)
    )) {
      if (passage.trim().length >= 60)
        expect(terms).not.toContain(passage.trim());
    }
  });

  it("keeps the privacy notice substantially below its 8056-word pre-concision draft", () => {
    expect(englishPrivacy.trim().split(/\s+/).length).toBeLessThan(2800);
    expect(englishPrivacy).not.toMatch(
      /TypeScript|us-east-1|us-central1|structural DOM|stack-overflow diagnostic|durable object addresses/i
    );
  });

  it.each(["Polis", "BWS", "pairwise", "QV"])(
    "discloses retained individual %s numerical inputs",
    (method) => {
      for (const text of [englishPrivacy, englishTerms]) {
        expect(text).toContain(method);
        expect(text).toContain("individual numerical inputs");
        expect(text).not.toContain("not yet enabled");
        expect(text).not.toContain("deletion service");
      }
    }
  );

  it("preserves material disclosures rather than only shortening retention wording", () => {
    for (const disclosure of [
      "political opinions",
      "explicit consent",
      "Legal basis?",
      "import",
      "outside the EEA",
      "standard contractual clauses",
      "free-text",
      "browser",
      "United States",
    ])
      expect(englishPrivacy).toContain(disclosure);
    for (const provider of [
      "Twilio",
      "Cloudflare",
      "Amazon Web Services",
      "Google Cloud Platform",
      "Plausible Analytics",
      "Sentry",
      "Rarimo",
    ])
      expect(englishPrivacy).toContain(provider);
    expect(englishPrivacy).toContain(
      "right to withdraw your previously given consent"
    );
    expect(englishPrivacy).toContain("right to have your data erased");
  });

  it("starts the recovery clock only after acceptance and does not imply instantaneous physical erasure", () => {
    expect(englishPrivacy).toContain(
      "An accepted deletion request starts the 15-day recovery period"
    );
    expect(englishPrivacy).toContain("a refused request does not");
    expect(englishTerms).toContain("Once your deletion request is accepted");
    expect(englishTerms).toContain(
      "A refused request does not close your account"
    );
    expect(englishPrivacy).toContain(
      "need not finish at the recovery deadline"
    );
    expect(englishTerms).toContain(
      "Cleanup delays do not extend recovery or restart applicable legal deadlines"
    );
    for (const text of [englishPrivacy, englishTerms])
      expect(text).toContain(
        "If organization responsibilities prevent account deletion through those controls, contact us"
      );
  });

  it("distinguishes live eligibility, asynchronous display updates and retained saved numbers", () => {
    expect(englishPrivacy).toContain("ineligible for new live calculations");
    expect(englishPrivacy).toContain("Open results refresh asynchronously");
    expect(englishPrivacy).toContain(
      "Ordinary deletion does not recalculate saved numbers"
    );
    expect(englishPrivacy).toContain(
      "Reopening excludes deleted or permanently detached participation"
    );
    expect(englishTerms).toContain(
      "This is not a history of every save or QV calculation"
    );
    expect(englishPrivacy).toContain(
      "Retained inputs are those used in saved results, not every ballot or calculation"
    );
  });

  it("states indefinite numerical retention and distinguishes recalculation from ordinary deletion", () => {
    for (const text of [englishPrivacy, englishTerms]) {
      expect(text).toContain(
        "indefinitely for voting analysis and recalculation"
      );
      expect(text).toContain("removing account links during permanent cleanup");
      expect(text).toContain(
        "Ordinary deletion does not recalculate saved numbers; separate corrections or re-analysis may change them"
      );
    }
  });

  it("keeps QV ballots private and retained input access limited", () => {
    expect(englishPrivacy).toContain(
      "does not publish individual ballots or enable individual-ballot exports"
    );
    expect(englishPrivacy).toMatch(
      /[Rr]emoving account links does not by itself guarantee anonymity/
    );
    expect(englishPrivacy).not.toContain(
      "Applicable lawful bases, consent requirements and retention limits continue to apply"
    );
  });

  it("separates existing-export availability from new exports, recovery sources and storage cleanup", () => {
    for (const text of [englishPrivacy, englishTerms]) {
      expect(text).toContain("at most 30 days after generation");
      expect(text).toContain("new exports use current deletion state");
    }
    expect(englishPrivacy).toContain(
      "Recovery-only data are excluded from ordinary access, historical displays and new exports"
    );
    expect(englishPrivacy).toContain("existing exports follow section 4.4");
    expect(englishPrivacy).toContain("Expired files undergo prompt cleanup");
    expect(englishPrivacy).not.toContain(
      "That recovery data is not served in checkpoints or exports"
    );
    expect(englishPrivacy).toContain(
      "cannot remotely erase independent downloads"
    );
  });

  it("does not promise redaction of all AI excerpts as part of original-statement deletion", () => {
    expect(englishPrivacy).toContain(
      "Historical AI descriptions are not automatically rewritten"
    );
    expect(englishPrivacy).toContain(
      "identifying excerpts remain subject to erasure rights"
    );
    expect(englishPrivacy).toContain(
      "removes or redacts affected output/translations without generating a replacement"
    );
    expect(englishPrivacy).not.toContain(
      "Deleted personal text, translations and attribution are not retained in those displays"
    );
    for (const text of [englishPrivacy, englishTerms])
      expect(text).not.toContain("[deleted]");
  });

  it("preserves statutory rights and their timing without adding a detached-record management feature", () => {
    expect(englishPrivacy).toContain("Rights requests are free");
    expect(englishPrivacy).toContain("normally within one month");
    expect(englishPrivacy).toContain("up to two further months");
    expect(englishPrivacy).toContain("within the first month");
    expect(englishPrivacy).toContain("manifestly unfounded or excessive");
    expect(englishPrivacy).toContain(
      "Response periods do not justify delaying required erasure"
    );
    expect(englishPrivacy).toContain(
      "Statutory erasure requests do not require waiting for account recovery to expire"
    );
    expect(englishPrivacy).toContain(
      "Account deletion does not waive your statutory data-protection rights"
    );
    for (const text of [englishPrivacy, englishTerms]) {
      expect(text).toContain("legal@zkorum.com");
      expect(text).toContain(
        "account controls cannot retrieve, change or withdraw"
      );
      expect(text).not.toContain(
        "provide links or other information enabling us to identify the relevant records"
      );
    }
  });

  it("distinguishes seed/shared ownership and separate parent deletion without provisioning detail", () => {
    expect(englishPrivacy).toContain(
      "Project-owned seed statements survive without your public attribution"
    );
    expect(englishPrivacy).toContain(
      "Conversation/project deletion removes its exclusively owned results and inputs"
    );
    expect(englishPrivacy).toContain(
      "Their deletion requires separate authorization"
    );
    for (const text of [englishPrivacy, englishTerms])
      expect(text).not.toMatch(
        /personal default|non-default|default (?:organization|project)/i
      );
  });

  it("keeps material provider, storage and international-processing disclosures", () => {
    for (const disclosure of [
      "generally in Ireland",
      "in the United States",
      "Automatic detection cannot be disabled",
      "unpublished drafts",
      "do not remove identifying information within text",
      "masked, error-triggered interaction replays",
      "advertising or cross-site tracking cookies",
      "Server deletion cannot erase every device-local copy",
      "information about applicable transfer safeguards",
    ]) {
      expect(englishPrivacy).toContain(disclosure);
    }
  });

  it("keeps distinct operational periods, recovery boundaries and California protections", () => {
    for (const disclosure of [
      "rolling 180-day retention",
      "at most 30 days after live-system removal",
      "Copies/restores do not restart that period",
      "deletion instructions are reapplied before restored data is exposed",
      "verified ownership and explicit cancellation before the deadline",
      "not revoked sessions, independent deletions, withdrawals, guest merges or moderation decisions",
      "original personal statement text and translations",
      "California Consumer Privacy Act",
      "proof that an agent is authorized",
      "Exercising rights will not affect prices or service quality except where law permits",
    ]) {
      expect(englishPrivacy).toContain(disclosure);
    }
  });
});

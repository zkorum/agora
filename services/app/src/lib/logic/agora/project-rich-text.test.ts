import { expect, test } from "vitest";

import { getProjectBodyDisplayHtml } from "./project-rich-text.js";

test("only turns visible URLs into links on the project page", () => {
  const html = getProjectBodyDisplayHtml(
    '<p><a href="http://other.example">Read the guide</a> and <strong>https://example.org</strong></p>',
  );
  expect(html).toContain("Read the guide and ");
  expect(html).not.toContain("other.example");
  expect(html).toContain('href="https://example.org"');
  expect(html).toContain('rel="noopener noreferrer nofollow"');
});

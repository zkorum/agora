export function plainTextToSafeHtml({ plainText }: { plainText: string }): string {
  return plainText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n|\r|\n/g, "<br>");
}

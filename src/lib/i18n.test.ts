import { describe, expect, it } from "vitest";
import { locales, translate } from "./i18n";

describe("checkout confirmation translations", () => {
  it("uses a real line break in every supported language", () => {
    for (const locale of locales) {
      const title = translate(locale, "paidTitle");
      expect(title).toContain("\n");
      expect(title).not.toMatch(/<[^>]+>/);
    }
  });
});

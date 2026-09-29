import { describe, expect, it } from "vitest";
import { parseThemeChoice, savedTheme } from "./theme.ts";

describe("parseThemeChoice", () => {
  it("keeps light and dark", () => {
    expect(parseThemeChoice("light")).toBe("light");
    expect(parseThemeChoice("dark")).toBe("dark");
  });

  it.each([null, "", "Dark", "blue", 1])("reads %j as system", (value) => {
    expect(parseThemeChoice(value)).toBe("system");
  });
});

describe("savedTheme", () => {
  it("follows the system when storage isn't available", () => {
    // The tests run in Node, which has no localStorage
    expect(savedTheme()).toBe("system");
  });
});

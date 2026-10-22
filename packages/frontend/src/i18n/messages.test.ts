import { describe, expect, it } from "vitest";

import { en } from "./en";
import { zh } from "./zh";

const tokens = (s: string): string[] =>
  [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("message dictionaries", () => {
  it("have the same keys", () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
  });

  it.each([
    ["en", en],
    ["zh", zh],
  ] as const)("%s has no empty values", (_, messages) => {
    for (const [key, value] of Object.entries(messages)) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("use the same {tokens} per key", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(tokens(zh[key]), key).toEqual(tokens(en[key]));
    }
  });
});

import { describe, expect, it } from "vitest";

import {
  interpolate,
  resolveText,
  translate,
  type TranslateFn,
} from "./translate";

describe("interpolate", () => {
  it("fills a single token", () => {
    expect(interpolate("Hi {name}", { name: "Ann" })).toBe("Hi Ann");
  });

  it("fills repeated tokens", () => {
    expect(interpolate("{a}-{a}", { a: "x" })).toBe("x-x");
  });

  it("stringifies numbers", () => {
    expect(interpolate("{n}/{max}", { n: 2, max: 5 })).toBe("2/5");
  });

  it("leaves an unknown token visible", () => {
    expect(interpolate("{a} {b}", { a: "x" })).toBe("x {b}");
  });

  it("returns the template untouched without params", () => {
    expect(interpolate("{a}")).toBe("{a}");
  });
});

describe("translate", () => {
  it("differs between en and zh", () => {
    expect(translate("en", "log.title")).toBe("Voyage Log");
    expect(translate("zh", "log.title")).toBe("航海日志");
  });

  it("interpolates params", () => {
    expect(translate("en", "fleet.title", { count: 1, max: 3 })).toBe(
      "Active Fleet (1/3)",
    );
  });
});

describe("resolveText", () => {
  const t: TranslateFn = (key, params) => translate("en", key, params);

  it("translates a key", () => {
    expect(resolveText(t, { key: "send.risk", params: { pct: "5%" } })).toBe(
      "5% risk",
    );
  });

  it("passes raw text through", () => {
    expect(resolveText(t, { raw: "boom" })).toBe("boom");
  });
});

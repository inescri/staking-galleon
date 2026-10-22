import { describe, expect, it, vi } from "vitest";

import {
  LOCALE_STORAGE_KEY,
  detectLocale,
  readStoredLocale,
  resolveInitialLocale,
  writeStoredLocale,
} from "./locale";

describe("detectLocale", () => {
  it.each([
    ["zh", "zh"],
    ["zh-CN", "zh"],
    ["ZH-tw", "zh"],
    ["zh-Hant-TW", "zh"],
    ["en-GB", "en"],
    ["fr", "en"],
    ["zhx", "en"],
    ["", "en"],
    [undefined, "en"],
  ])("%s → %s", (language, expected) => {
    expect(detectLocale(language)).toBe(expected);
  });
});

describe("resolveInitialLocale", () => {
  it("prefers a valid stored value", () => {
    expect(resolveInitialLocale("en", "zh-CN")).toBe("en");
    expect(resolveInitialLocale("zh", "en-US")).toBe("zh");
  });

  it("ignores junk and falls back to the browser language", () => {
    expect(resolveInitialLocale("klingon", "zh-CN")).toBe("zh");
    expect(resolveInitialLocale(null, "en-US")).toBe("en");
  });
});

describe("locale storage", () => {
  const throwing = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };

  it("reads and writes the locale key", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: vi.fn((k: string, v: string) => void store.set(k, v)),
    };
    writeStoredLocale(storage, "zh");
    expect(storage.setItem).toHaveBeenCalledWith(LOCALE_STORAGE_KEY, "zh");
    expect(readStoredLocale(storage)).toBe("zh");
  });

  it("does not throw when storage throws", () => {
    expect(readStoredLocale(throwing)).toBeNull();
    expect(() => writeStoredLocale(throwing, "en")).not.toThrow();
  });

  it("is a no-op without storage", () => {
    expect(readStoredLocale(null)).toBeNull();
    expect(() => writeStoredLocale(null, "en")).not.toThrow();
  });
});

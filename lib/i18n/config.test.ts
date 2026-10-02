import { describe, expect, it } from "vitest";
import { localizePath, splitLocale } from "./config";

describe("localizePath", () => {
  it("keeps English URLs unprefixed", () => expect(localizePath("en", "/coaching")).toBe("/coaching"));
  it("prefixes French URLs", () => {
    expect(localizePath("fr", "/")).toBe("/fr");
    expect(localizePath("fr", "/coaching")).toBe("/fr/coaching");
    expect(localizePath("fr", "/booking?service=private-lesson")).toBe("/fr/booking?service=private-lesson");
    expect(localizePath("fr", "/#intro")).toBe("/fr#intro");
  });
  it("never touches admin, api, external or already-localized links", () => {
    expect(localizePath("fr", "/admin")).toBe("/admin");
    expect(localizePath("fr", "/api/availability")).toBe("/api/availability");
    expect(localizePath("fr", "https://wa.me/1")).toBe("https://wa.me/1");
    expect(localizePath("fr", "/fr/coaching")).toBe("/fr/coaching");
  });
});

describe("splitLocale", () => {
  it("detects the locale prefix", () => {
    expect(splitLocale("/fr/booking")).toEqual({ locale: "fr", path: "/booking" });
    expect(splitLocale("/fr")).toEqual({ locale: "fr", path: "/" });
    expect(splitLocale("/booking")).toEqual({ locale: "en", path: "/booking" });
    expect(splitLocale("/francais")).toEqual({ locale: "en", path: "/francais" });
  });
});

import { describe, expect, it } from "vitest";
import { canUseFeature, resolveAccess } from "./access-control";

const base = { defaultPageAccess: ["forms", "minutes", "meetings"], defaultFeatureAccess: ["ask-echo", "notetaker-record", "forms-submit", "meetings-export"] };
describe("feature access resolver", () => {
  it("uses explicit feature rules over defaults", () => {
    const access = resolveAccess("A@EXAMPLE.COM", { ...base, pagePermissions: [{ email: "a@example.com", allowedPages: ["forms"], allowedFeatures: ["forms-submit"] }] });
    expect(access.allowedFeatures).toEqual(["forms-submit"]);
  });
  it("uses defaults for unlisted users and remains backwards compatible", () => {
    expect(resolveAccess("new@example.com", base).allowedFeatures).toContain("ask-echo");
    expect(resolveAccess("new@example.com", { defaultPageAccess: ["forms"] }).allowedFeatures).toContain("forms-submit");
  });
  it("requires the owning page and global toggle", () => {
    const access = resolveAccess("u@example.com", { ...base, features: { askEchoEnabled: false }, pagePermissions: [{ email: "u@example.com", allowedPages: ["forms"], allowedFeatures: ["ask-echo", "notetaker-record"] }] });
    expect(access.allowedFeatures).toEqual([]);
  });
  it("fails closed for unknown feature ids", () => {
    expect(canUseFeature("unknown", { allowedFeatures: [] })).toBe(false);
    expect(resolveAccess("u@example.com", { ...base, defaultFeatureAccess: ["not-a-feature"] }).allowedFeatures).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { resolveAllowedPages, sourcesEnabledForPages } from "./access";

describe("Ask Echo page access", () => {
  it("uses a user's explicit page rule", () => {
    const pages = resolveAllowedPages("ana@example.com", { defaultPageAccess: ["meetings"], pagePermissions: [{ email: "ana@example.com", allowedPages: ["notebook", "tasks"] }], admins: [] });
    expect(pages).toEqual(["notebook", "tasks"]);
  });

  it("does not enable Notebook context when Notebook is restricted", () => {
    const sources = sourcesEnabledForPages(["meetings", "tasks"]);
    expect(sources).toContain("meetings");
    expect(sources).toContain("tasks");
    expect(sources).not.toContain("notebook");
  });

  it("applies the default page policy to configured admins", () => {
    const pages = resolveAllowedPages("admin@example.com", { defaultPageAccess: ["forms"], pagePermissions: [], admins: [{ email: "admin@example.com", active: true }] });
    expect(pages).toEqual(["forms"]);
    expect(sourcesEnabledForPages(pages)).not.toContain("notebook");
  });

  it("does not inject pages that were not configured", () => {
    const pages = resolveAllowedPages("new@example.com", { defaultPageAccess: ["dashboard", "meetings", "minutes"], pagePermissions: [], admins: [] });
    expect(pages).toEqual(["dashboard", "meetings", "minutes"]);
  });
});

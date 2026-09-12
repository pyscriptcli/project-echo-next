import { describe, expect, it } from "vitest";
import { resolveAllowedPages, sourcesEnabledForPages } from "./access";

describe("Ask Echo page access", () => {
  it("uses a user's explicit page rule", () => {
    const pages = resolveAllowedPages("ana@example.com", { defaultPageAccess: ["meetings"], pagePermissions: [{ email: "ana@example.com", allowedPages: ["notebook", "tasks"] }], admins: [] });
    expect(pages).toEqual(["notebook", "tasks", "market-insights", "demands"]);
  });

  it("does not enable Notebook context when Notebook is restricted", () => {
    const sources = sourcesEnabledForPages(["meetings", "tasks"]);
    expect(sources).toContain("meetings");
    expect(sources).toContain("tasks");
    expect(sources).not.toContain("notebook");
  });

  it("gives configured admins access to every source", () => {
    const pages = resolveAllowedPages("admin@example.com", { defaultPageAccess: ["forms"], pagePermissions: [], admins: [{ email: "admin@example.com", active: true }] });
    expect(sourcesEnabledForPages(pages)).toContain("notebook");
  });
});

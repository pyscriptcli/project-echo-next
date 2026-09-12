import { describe, expect, it, vi } from "vitest";
import { loadClickUpContext } from "./clickup";

describe("loadClickUpContext", () => {
  it("fetches only lists belonging to pages the user can access", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ tasks: [] }) });
    await loadClickUpContext({ token: "token", pages: ["tasks"], taskListId: "task-list", formListIds: ["forms-list"], fetcher: fetcher as any });
    const urls = fetcher.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes("task-list"))).toBe(true);
    expect(urls.some((url) => url.includes("901418075633"))).toBe(false);
    expect(urls.some((url) => url.includes("forms-list"))).toBe(false);
  });

  it("labels notebook records so the UI can open the matching page", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ tasks: [{ id: "log-1", name: "September 12, 2026 - Dave", text_content: "Completed the proposal", url: "https://app.clickup.com/t/log-1" }] }) });
    const sources = await loadClickUpContext({ token: "token", pages: ["notebook"], taskListId: "", formListIds: [], fetcher: fetcher as any });
    expect(sources[0]).toMatchObject({ page: "notebook", meetingId: "log-1", meetingTitle: "September 12, 2026 - Dave" });
  });
});

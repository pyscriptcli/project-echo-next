// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ContractsWorkspace } from "./ContractsWorkspace";

const storage = vi.hoisted(() => ({
  push: vi.fn(),
  getContractsFolderStatus: vi.fn(),
  getContractsFolderPickerStatus: vi.fn(),
  chooseContractsFolder: vi.fn(),
  listLocalWorkspaces: vi.fn().mockResolvedValue([]),
  saveLocalWorkspace: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/contracts", useRouter: () => ({ push: storage.push }) }));
vi.mock("@/components/DeltaReview", () => ({ DeltaReview: () => null }));
vi.mock("@/lib/contracts/localStore", () => storage);

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Contracts folder selection", () => {
  it("gives Brave recovery instructions and lets the user retry instead of disabling Select path", async () => {
    storage.getContractsFolderStatus.mockResolvedValue({ connected: true, accessible: true, name: "This browser" });
    storage.getContractsFolderPickerStatus.mockReturnValue({ available: false, reason: "unsupported" });
    storage.chooseContractsFolder.mockRejectedValue(new Error("Folder access is unavailable."));
    render(<ContractsWorkspace />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Create new" }))[0]);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("brave://flags/#file-system-access-api")).toBeTruthy();
    const select = dialog.getByRole("button", { name: "Select path" }) as HTMLButtonElement;
    expect(select.disabled).toBe(false);
    fireEvent.click(select);
    await waitFor(() => expect(storage.chooseContractsFolder).toHaveBeenCalledOnce());
    expect((dialog.getByRole("button", { name: "Create workspace" }) as HTMLButtonElement).disabled).toBe(true);
    expect(storage.saveLocalWorkspace).not.toHaveBeenCalled();
  });

  it("creates the named workspace only after a computer folder has been selected", async () => {
    storage.getContractsFolderStatus.mockResolvedValueOnce({ connected: true, accessible: true, name: "This browser" })
      .mockResolvedValue({ connected: true, accessible: true, name: "Mosaic Contracts" });
    storage.getContractsFolderPickerStatus.mockReturnValue({ available: true });
    storage.chooseContractsFolder.mockResolvedValue({ name: "Mosaic Contracts", migratedCount: 0 });
    render(<ContractsWorkspace />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Create new" }))[0]);
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Workspace name"), { target: { value: "Lease review" } });
    fireEvent.click(dialog.getByRole("button", { name: "Select path" }));
    await waitFor(() => expect((dialog.getByRole("button", { name: "Create workspace" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(dialog.getByRole("button", { name: "Create workspace" }));
    await waitFor(() => expect(storage.saveLocalWorkspace).toHaveBeenCalledWith(expect.objectContaining({ name: "Lease review" })));
    expect(storage.push).toHaveBeenCalledWith(expect.stringMatching(/^\/contracts\/local\//));
  });

  it("keeps the workspace form intact when the user cancels folder selection", async () => {
    storage.getContractsFolderStatus.mockResolvedValue({ connected: true, accessible: true, name: "This browser" });
    storage.getContractsFolderPickerStatus.mockReturnValue({ available: true });
    storage.chooseContractsFolder.mockRejectedValue(new DOMException("Canceled", "AbortError"));
    render(<ContractsWorkspace />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Create new" }))[0]);
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Workspace name"), { target: { value: "Lease review" } });
    fireEvent.click(dialog.getByRole("button", { name: "Select path" }));
    await waitFor(() => expect((dialog.getByRole("button", { name: "Select path" }) as HTMLButtonElement).disabled).toBe(false));
    expect((dialog.getByLabelText("Workspace name") as HTMLInputElement).value).toBe("Lease review");
    expect(dialog.queryByRole("alert")).toBeNull();
    expect(storage.saveLocalWorkspace).not.toHaveBeenCalled();
    expect(storage.push).not.toHaveBeenCalled();
  });
});

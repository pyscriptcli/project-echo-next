// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { FinalizeMeetingModal } from "./FinalizeMeetingModal";

afterEach(cleanup);

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  metadata: {
    client_name: "",
    date: "2026-09-16",
    meeting_type: "Internal",
    location: "GreatWork Mega Tower 32F - Secret Room",
  },
  onUpdateMetadata: vi.fn(),
  primeAttendees: ["Dave Policarpio"],
  onUpdatePrimeAttendees: vi.fn(),
  externalAttendees: [],
  onUpdateExternalAttendees: vi.fn(),
  onExportWord: vi.fn().mockResolvedValue(undefined),
  onExportPdf: vi.fn().mockResolvedValue(undefined),
  onArchiveClickUp: vi.fn().mockResolvedValue(undefined),
  archiveSpaces: [
    { id: "space-1", name: "Industrial Brokerage", teamName: "Prime Team" },
  ],
  loadingArchiveSpaces: false,
  selectedSpaceId: "space-1",
  onSelectSpaceId: vi.fn(),
  isProcessing: false,
  processingText: "",
  initialAction: "export" as const,
};

describe("FinalizeMeetingModal", () => {
  it("displays validation warning if title/client name is empty when clicking export", async () => {
    render(<FinalizeMeetingModal {...baseProps} />);

    expect(screen.getByText("Finalize Meeting Minutes")).toBeDefined();
    expect(screen.getByText(/Meeting Details Verification/i)).toBeDefined();

    // Click Word Document export while title is empty
    const wordBtn = screen.getByText("Word Document");
    fireEvent.click(wordBtn);

    // Should NOT call export and should show error
    expect(baseProps.onExportWord).not.toHaveBeenCalled();
    expect(screen.getByText(/Please enter a meeting title or client name before continuing/i)).toBeDefined();
  });

  it("calls export when title is present", async () => {
    const onExportWord = vi.fn().mockResolvedValue(undefined);
    render(
      <FinalizeMeetingModal
        {...baseProps}
        metadata={{ ...baseProps.metadata, client_name: "Megaworld Q3 Strategy" }}
        onExportWord={onExportWord}
      />
    );

    const wordBtn = screen.getByText("Word Document");
    fireEvent.click(wordBtn);

    expect(onExportWord).toHaveBeenCalledOnce();
  });

  it("switches to ClickUp archive tab and shows space selector", () => {
    render(<FinalizeMeetingModal {...baseProps} initialAction="archive" />);

    expect(screen.getByText("Select Target ClickUp Space")).toBeDefined();
    expect(screen.getByText("Industrial Brokerage")).toBeDefined();
  });
});

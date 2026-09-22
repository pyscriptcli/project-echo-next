// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { MoveMeetingModal } from "./MoveMeetingModal";
import * as api from "@/lib/api";

afterEach(cleanup);

const mockMeeting = {
  id: "meeting-123",
  meeting_id: "meeting-123",
  title: "Warehouse Lease Discussion",
  date: "2026-09-22",
  meeting_type: "Internal" as const,
  location: "Online Meeting",
  summary: "Brief meeting summary",
  attendees_prime: ["Dave Policarpio"],
  attendees_external: [],
  items: [],
  clickup_space_id: "space-1",
  clickup_space_name: "Brokerage",
  clickup_list_id: "list-1",
  clickup_list_name: "General Meetings",
  is_confidential: false,
};

const mockSpaces = [
  { id: "space-1", name: "Brokerage", teamName: "Prime Team" },
  { id: "space-2", name: "Capital Markets", teamName: "Prime Team" },
];

describe("MoveMeetingModal", () => {
  it("renders with current meeting information and loads lists for the selected space", async () => {
    vi.spyOn(api, "fetchSpaceLists").mockResolvedValue({
      lists: [
        { id: "list-1", name: "General Meetings" },
        { id: "list-2", name: "Archive 2026" },
      ],
    });

    render(
      <MoveMeetingModal
        isOpen={true}
        onClose={vi.fn()}
        meeting={mockMeeting}
        onMeetingMoved={vi.fn()}
        spaces={mockSpaces}
      />
    );

    expect(screen.getByText("Move Meeting Archive")).toBeDefined();
    expect(screen.getByText(/Relocate #meeting-123/i)).toBeDefined();
    expect(screen.getByText(/Brokerage → General Meetings/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Archive 2026")).toBeDefined();
    });
  });

  it("calls moveMeetingArchive when a destination list is selected and confirmed", async () => {
    vi.spyOn(api, "fetchSpaceLists").mockResolvedValue({
      lists: [
        { id: "list-1", name: "General Meetings" },
        { id: "list-2", name: "Archive 2026" },
      ],
    });

    const moveSpy = vi.spyOn(api, "moveMeetingArchive").mockResolvedValue({
      success: true,
    });

    const onMeetingMoved = vi.fn();
    const onClose = vi.fn();

    render(
      <MoveMeetingModal
        isOpen={true}
        onClose={onClose}
        meeting={mockMeeting}
        onMeetingMoved={onMeetingMoved}
        spaces={mockSpaces}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Archive 2026")).toBeDefined();
    });

    const select = screen.getByDisplayValue("General Meetings");
    fireEvent.change(select, { target: { value: "list-2" } });

    const confirmBtn = screen.getByRole("button", { name: /confirm move/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(moveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          meetingId: "meeting-123",
          destinationListId: "list-2",
          sourceListId: "list-1",
          isConfidential: false,
        })
      );
      expect(onMeetingMoved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});

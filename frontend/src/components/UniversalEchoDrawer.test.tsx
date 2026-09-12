// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UniversalEchoDrawer } from "./UniversalEchoDrawer";

vi.mock("@/lib/api", () => ({ askEcho: vi.fn().mockResolvedValue({ answer: "Alex owns the lease follow-up.", confidence: "supported", sources: [{ sourceId: "meeting:m1:item:i1", meetingId: "m1", meetingTitle: "Leasing review", meetingDate: "2026-09-01", topic: "Renewal", excerpt: "Alex will send the lease." }], followUps: ["When is it due?"] }) }));

describe("UniversalEchoDrawer", () => {
  it("shows a casual greeting and grounded sources after a question", async () => {
    render(<UniversalEchoDrawer isOpen onClose={() => {}} meetings={[]} />);
    expect(screen.getByText(/Hi — I’m Echo/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Message Ask Echo"), { target: { value: "Who owns the lease?" } });
    fireEvent.click(screen.getByLabelText("Send message"));
    await waitFor(() => expect(screen.getByText("Alex owns the lease follow-up.")).toBeTruthy());
    fireEvent.click(screen.getByText(/Sources · 1/));
    expect(screen.getByText("Leasing review")).toBeTruthy();
    expect(screen.getByText("When is it due?")).toBeTruthy();
  });
});

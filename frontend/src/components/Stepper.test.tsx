// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { Stepper } from "./Stepper";

afterEach(cleanup);

describe("Stepper component", () => {
  it("renders stages and disables Save & Export when review is not allowed", () => {
    const onSaveExport = vi.fn();
    render(
      <Stepper
        currentStage="Input"
        onStageChange={vi.fn()}
        isReviewAllowed={false}
        onSaveExport={onSaveExport}
      />
    );

    expect(screen.getByText("Meeting Workspace")).toBeDefined();
    expect(screen.getByText("Discussion Review")).toBeDefined();

    const saveBtn = screen.getByRole("button", { name: /save & export/i });
    expect(saveBtn).toBeDefined();
    expect(saveBtn.hasAttribute("disabled")).toBe(true);

    fireEvent.click(saveBtn);
    expect(onSaveExport).not.toHaveBeenCalled();
  });

  it("enables and fires Save & Export when review is allowed", () => {
    const onSaveExport = vi.fn();
    render(
      <Stepper
        currentStage="Review"
        onStageChange={vi.fn()}
        isReviewAllowed={true}
        onSaveExport={onSaveExport}
      />
    );

    const saveBtn = screen.getByRole("button", { name: /save & export/i });
    expect(saveBtn.hasAttribute("disabled")).toBe(false);

    fireEvent.click(saveBtn);
    expect(onSaveExport).toHaveBeenCalledOnce();
  });
});

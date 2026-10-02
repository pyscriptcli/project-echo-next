// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { DiscoverTopicsModal } from "./DiscoverTopicsModal";
import type { DiscoveredTopicItem } from "@/app/api/discover-topics/route";

afterEach(cleanup);

describe("DiscoverTopicsModal component", () => {
  const mockTopics: DiscoveredTopicItem[] = [
    {
      topic_title: "Signing Sequence Preference",
      discussion_point: "Landlords should execute ahead of the franchisee.",
      evidence_quote: "[00:10:09] property owners to sign ahead",
      action_plan: "Send standard draft",
      indicative_delivery_date: "October 6, 2026",
      person_in_charge: "Melisa",
      confidence: "High",
    },
    {
      topic_title: "Reclamation Projects",
      discussion_point: "Malabon and Pasig reclamation overview.",
      evidence_quote: "[01:13:53] government is planning to pursue",
      action_plan: "Monitor brokerage opportunities",
      indicative_delivery_date: "TBD",
      person_in_charge: "Unassigned",
      confidence: "Medium",
    },
  ];

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <DiscoverTopicsModal
        isOpen={false}
        onClose={vi.fn()}
        missedTopics={mockTopics}
        isDiscoveringTopics={false}
        autoDiscoverEnabled={true}
        onToggleAutoDiscover={vi.fn()}
        topicQuery=""
        onTopicQueryChange={vi.fn()}
        onDiscoverTopics={vi.fn()}
        onAddTopic={vi.fn()}
        onAddAllTopics={vi.fn()}
        onDismissTopic={vi.fn()}
        transcript="sample transcript"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders topic cards and triggers onAddTopic and onAddAllTopics", () => {
    const onAddTopic = vi.fn();
    const onAddAllTopics = vi.fn();
    const onClose = vi.fn();

    render(
      <DiscoverTopicsModal
        isOpen={true}
        onClose={onClose}
        missedTopics={mockTopics}
        isDiscoveringTopics={false}
        autoDiscoverEnabled={true}
        onToggleAutoDiscover={vi.fn()}
        topicQuery=""
        onTopicQueryChange={vi.fn()}
        onDiscoverTopics={vi.fn()}
        onAddTopic={onAddTopic}
        onAddAllTopics={onAddAllTopics}
        onDismissTopic={vi.fn()}
        transcript="sample transcript"
      />
    );

    expect(screen.getByText("Signing Sequence Preference")).toBeDefined();
    expect(screen.getByText("Reclamation Projects")).toBeDefined();
    expect(screen.getByText(/2 topics suggested/i)).toBeDefined();

    // Click individual "Add to Matrix"
    const addButtons = screen.getAllByRole("button", { name: /add to matrix/i });
    expect(addButtons.length).toBe(2);
    fireEvent.click(addButtons[0]);
    expect(onAddTopic).toHaveBeenCalledWith(0);

    // Click "Add All (2) to Matrix"
    const addAllBtn = screen.getByRole("button", { name: /add all \(2\) to matrix/i });
    fireEvent.click(addAllBtn);
    expect(onAddAllTopics).toHaveBeenCalledOnce();

    // Click Close
    const closeBtn = screen.getByRole("button", { name: /close dialog/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
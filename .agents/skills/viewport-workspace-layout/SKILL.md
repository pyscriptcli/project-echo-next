---
name: viewport-workspace-layout
description: Design and fix multi-column desktop workspaces, dashboards, and chat/notepad studios so pinned inputs, textboxes, and action bars stay visible within the viewport without page scrolling, while preserving natural scrolling for document reviews and long forms. Use when designing full-height layouts, fixing cut-off inputs/textareas, or handling scroll locking.
---

# Viewport Workspace Layout

Guidance for designing and implementing full-height, multi-column desktop applications (like Meeting Studios, Notepads, Chat interfaces, and Dashboards) where pinned inputs must remain directly visible on screen without page-level scrolling.

---

## The 5 Golden Principles

### 1. The Continuous Flex Height Chain
In CSS Flexbox, a flex child cannot calculate its definite height or shrink below its content unless **every ancestor in the chain** provides a constrained height and allows shrinking.

- **The Rule**: Every container between the root viewport and the column content must have:
  ```html
  h-full flex flex-col flex-1 min-h-0 overflow-hidden
  ```
- **The Pitfall**: An intermediate container with `min-h-full` or `flex-1` *without* `h-full min-h-0` breaks the chain. The browser will then allow the inner columns to size based on content height rather than available screen space.
- **The Anti-Pattern**: Avoid hardcoded viewport height calculations like `h-[calc(100vh-175px)]` or large `min-h-[600px]`. These break when topbars change, when browser chrome varies, or when the user has 125%/150% Windows display scaling. Let Flexbox dynamically calculate the exact remaining height.

### 2. Scoped Viewport Locking
Never apply `overflow-hidden` unconditionally to the top-level `<main>` tag or page container.

- **The Rule**: Scope the full-height lock strictly to the active interactive workspace mode:
  ```tsx
  const isMeetingWorkspace = currentView === "minutes" && stage === "Input" && sourceTab === "record";

  <main className={`flex-1 min-h-0 ${
    isMeetingWorkspace 
      ? "h-full overflow-hidden flex flex-col p-0" 
      : "overflow-y-auto px-4 py-5 md:px-8"
  }`}>
  ```
- **Why**: If you lock the entire page, views like **Discussion Review**, long reports, or settings cannot be scrolled.
- **The Contract**:
  - Active Studio / Recording / Chat: Viewport-constrained (`h-full overflow-hidden`).
  - Review / Document / Reading: Natural page scroll (`overflow-y-auto`).

### 3. Pinned Bottom Composer Pattern
To keep a textbox, prompt pills, or action buttons visible at the bottom of a column:

```tsx
<div className="flex flex-col h-full min-h-0 bg-white">
  {/* 1. Header (Fixed height) */}
  <header className="shrink-0 px-4 py-3 border-b border-slate-200">
    <h3>User notes</h3>
  </header>

  {/* 2. Scrollable Body (Takes all available space, scrolls internally) */}
  <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
    {messagesOrNotes.map(...)}
  </div>

  {/* 3. Composer / Input Form (Pinned to bottom, never pushed off) */}
  <div className="shrink-0 border-t border-slate-200 bg-white p-2.5">
    <form onSubmit={...}>
      <textarea rows={2} className="w-full resize-none text-xs" />
      <button type="submit">Submit</button>
    </form>
  </div>
</div>
```

- **`shrink-0`** on the header and footer prevents them from compressing.
- **`flex-1 min-h-0 overflow-y-auto`** on the body absorbs all height variance. When empty, it fills the empty gap; when long, it scrolls internally.

### 4. Breakpoint Selection (`lg` over `xl`)
Many desktop and laptop screens (13" to 16" laptops, or 1080p monitors) run Windows display scaling at 125% or 150%. Combined with a navigation sidebar (60–240px), the usable content width is typically between **1000px and 1180px**.

- **The Rule**: Always use `lg:flex-row` (1024px+) rather than `xl:flex-row` (1280px+) for 3-column side-by-side workspaces.
- **Consequence of using `xl:`**: A 1080p laptop at 125% scaling will trigger the mobile `flex-col` layout, stacking all 3 columns vertically and pushing columns 2 and 3 hundreds of pixels below the fold.

### 5. Automatic Scroll Reset on Mode Transitions
When switching between views or stages, if the page was previously scrolled down, activating `overflow-hidden` can trap the user at a non-zero scroll offset, hiding the top bar or stepper.

- **The Rule**: Add a scroll reset hook on the view and stage changes:
  ```tsx
  useEffect(() => {
    if (currentView === "minutes") {
      const mainEl = document.querySelector("main");
      if (mainEl) mainEl.scrollTop = 0;
      window.scrollTo(0, 0);
    }
  }, [currentView, stage, sourceTab]);
  ```

---

## Quick Diagnostic Checklist

| Symptom | Probable Cause | Fix |
| :--- | :--- | :--- |
| **Input box is cut off below the screen fold** | Parent container has `min-h-[Xpx]` or `calc(100vh - X)` exceeding viewport; or missing `min-h-0` on ancestor flexbox. | Replace fixed heights with `h-full flex-1 min-h-0` down the entire container tree. |
| **Columns stack vertically on a laptop screen** | Used `xl:flex-row` (1280px), but display scaling puts viewport width under 1280px. | Lower breakpoint to `lg:flex-row` (1024px). |
| **Cannot scroll in review or long document mode** | Applied `overflow-hidden` to `<main>` indiscriminately. | Scope `overflow-hidden` strictly to `stage === "Input" && sourceTab === "record"`. |
| **Screen is cut off at the top and cannot scroll up** | `overflow-hidden` was applied while `scrollTop > 0`. | Add `useEffect` resetting `scrollTop = 0` when entering the view. |
| **Internal list pushes the input box downwards** | Input container is missing `shrink-0`, or list is missing `min-h-0 overflow-y-auto`. | Add `shrink-0` to composer and `min-h-0 overflow-y-auto` to list container. |

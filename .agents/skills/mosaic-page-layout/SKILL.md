---
name: mosaic-page-layout
description: Apply the Projects page layout and visual patterns when building or revising feature pages in Project Echo Next, adapting the content to each feature.
---

# Mosaic page layout

Use the Projects experience as the visual reference for feature pages in this repository. Reuse its hierarchy and interaction patterns while keeping each feature's content and workflow specific.

## Source of truth

- Read `frontend/src/components/ProjectWorkspace.tsx` before styling a page.
- `ProjectPageHeader` defines the page and workspace header.
- The Projects gallery defines landing cards.
- `SubprojectSites` defines the editable table treatment.
- Prefer existing shared components when available. Keep reference patterns local when extracting them would change unrelated pages.

## Page patterns

- Use a centered `max-w-[1440px]` content area with `space-y-5 pb-8`.
- Use the Projects header hierarchy: small uppercase eyebrow, compact title, optional concise subtitle, and actions aligned at the right. For nested workspaces, use the square back button. For a landing page, use the small gold accented folder icon.
- When a feature has multiple workspaces, show them on a landing page before opening one. Use the Projects gallery's responsive card grid, white surface, thin slate border, gold-accented icon, clear title, one useful content summary, and open affordance.
- Use `space-y-5` between major areas and compact spacing within toolbars, tabs, and forms. Keep action buttons and fields aligned in one row when their widths allow; let them wrap cleanly on narrow screens.
- For data that benefits from row and column comparison, render a real `<table>`. Follow `SubprojectSites`: neutral slate header, thin cell borders, alternating white and slate rows, compact typography, and editable cells that look like text until focused. Use the gold focus treatment and a horizontal scroller when the table needs more width.
- Set column widths for the content, keep row heights driven by actual text, and preserve all existing edit and action behavior when restyling a table.
- Carry the app palette forward: navy `#003366`, blue `#31577D`, gold `#C9A84C`, white surfaces, and slate borders. Keep geometry square and avoid decorative elements that do not improve hierarchy or use.

## Applying the pattern

Inspect the actual Projects components and the target feature before editing. Change only the feature page unless the user asks for broader UI changes. Keep labels, data, permissions, and feature behavior owned by the target feature; this skill supplies layout and visual rules, not product copy or behavior.

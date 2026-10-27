---
name: travel-product-context
version: v0.1
description: Find and apply internal Yandex Travel product context from the bundled passport for product, UX, design, and Figma work; preserve source dates, scope, and uncertainty instead of treating mockups as shipped behavior.
metadata:
  version: 0.2.0
  updated: 2026-09-07
  status: beta
  owner: Travel Design
  type: knowledge
  short-description: Travel product knowledge router
---

# Travel Product Context

Use this skill when work in Yandex Travel depends on an existing direction, project, UI surface, decision, or historical design. The bundled passport is a navigation and evidence base, not a substitute for current requirements or production verification.

## Read progressively

1. Read [the passport index](references/product-passport/README.md).
2. Open only the relevant note in `references/product-passport/domains/`.
3. If visual precedent matters, use [the visual index](references/product-passport/visual/README.md) to find exact Figma nodes, then reopen the live nodes when access is available.
4. Search `references/product-passport/catalog/` only when the project is not found in the short notes. Do not load complete JSON catalogs by default.
5. Before implementing behavior, verify the current project, issue, resolution, and current Figma branch when the task provides access.

## Evidence boundaries

Always distinguish an idea, observed mockup, approved decision, completed implementation task, reported launch, and verified production availability.

A Figma filename, canvas position, `SPECA`, `RFD`, `v3`, node number, or recent `updatedAt` does not prove release or current behavior. Preserve platform, audience, surface, experiment or iteration, and source date.

When sources conflict, name the exact conflict and ask only what changes the current result. Keep unaffected work moving. Do not invent missing business rules, ownership, or status.

## Applying context

- Use the passport to recognize product structure, find precedent, and avoid transferring patterns between guest Travel, Extranet, App/Louvre, transport, and B2B without evidence.
- Product knowledge does not replace Design System provenance or live Figma inspection.
- A decision from the current user task overrides an older passport note for that task.
- Update the shared passport only when the user asks or the repository workflow explicitly includes maintenance; preserve the previous rule and source history.

## Internal-data boundary

The passport is internal. Do not publish it, upload it to external services, or copy raw comments, credentials, customer data, or meeting secrets. Share it only through the approved private repository or an explicitly authorized internal package.

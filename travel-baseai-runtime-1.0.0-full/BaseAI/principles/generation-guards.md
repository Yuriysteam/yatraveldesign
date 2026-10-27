# Principles: Generation Guards

Use these guards to prevent common generation mistakes. Guards are product-generation preferences, not permanent design-system laws.

## Temporary Guard: No B2C Dashboards

- Status: temporary, remove or revise if B2C dashboard-like products become explicitly required.
- Scope: generated B2C Travel prototypes.
- Rule: do not generate dashboard-style interfaces for B2C products by default.
- Avoid dense KPI grids, admin panels, metric tiles, management tables, analytics widgets, and equal-box dashboard compositions for B2C screens.
- Prefer product scenarios and Travel UI patterns instead: search, listing, detail, trip, booking, checkout, discovery, support, empty state, or error state.
- Exception: if the user explicitly asks for a B2C dashboard, analytics view, or metric-heavy screen, follow the request and keep the result within BaseAI layout and visual principles.

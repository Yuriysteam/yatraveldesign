# Prototype component registry

Before creating UI, reuse the existing component listed here. If it is absent, check Arcadia Travel UI Kit before implementing a new variant.

| Component | Canonical implementation | Used by |
|---|---|---|
| Header and primary navigation | `styles.css`, markup in `index.html` | All pages |
| Profile menu | `profile-menu.js`, `profile-menu.css` | All pages |
| Date-range calendar | `.calendar-*` styles in `overrides.css`, behavior pattern in `home.js` | Search, hotel, payment documents |
| Hotel offer row | `.room-offer` in `hotel.html`, `hotel.css`, `hotel.js` | Hotel offers |
| Facilities modal | `.facilities-modal` in `hotel.html`, `hotel.css`, `hotel.js` | Hotel page |
| Data table | `.documents-table`, `.documents-row`, `.documents-row--head` in `payment-documents.css` | Payment documents and future data tables |
| Destination card | `.destination-card` in `index.html`, `home.css` | Home recommendations |
| Event card | `.event-card`, `.event-card--featured` in `index.html`, `home.css` | Home events |
| Collection list row (Cell L) | `.collection-row` in `collections.html`, `collections.css` | Collections |
| Destructive confirmation modal | `.collections-modal` in `collections.html`, `collections.css` | Collections |

Rules:

1. Search this registry and the prototype code before adding markup or CSS.
2. Reuse the canonical class names and interaction behavior; do not create page-specific visual copies.
3. If the component is missing, search the Arcadia Travel UI Kit.
4. Add every newly accepted reusable component to this registry.
5. Table column headings always use a 14 px font size at every viewport width.
6. Table headings and cell values align to the left edge of their shared column.

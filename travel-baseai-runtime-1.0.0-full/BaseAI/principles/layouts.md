# Principles: Layouts

BaseAI prototypes should prefer light, airy, simple, clean, and clarity-first interfaces.

This file describes layout principles for Travel product screens. The flat layout works for desktop, touch, and mobile/app screens. This document defines the main reusable layout models: flat, island, and inset.

## Token Meaning

- Use semantic surface names in layout decisions: `Background Primary`, `Background Secondary`, `Card Primary`, and `Card Secondary`.
- Use `principles/tokens.md` to map semantic surface names to CSS variables from `tokens/theme-vars.css`.
- When examples use literal colors, map them back to semantic tokens instead of hardcoding color values.

## Layout Selection Guide

Choose the layout by the role of content, not by visual taste.

### Desktop

- Use flat layout for visual, airy product pages: main pages, detail pages, trip pages, inspiration grids, editorial blocks, photo-led collections, and simple photo+text card feeds.
- Use island layout for functional search/result pages where each result is a product snippet with interaction density: price, rating, CTA, status, badges, filters, map, or itinerary details.
- Use inset layout for homogeneous card-based lists, settings, bookings, account-like groups, or listings split into subcategories with headings.
- If there are many cards but each card is only photo plus text, choose flat layout, not island layout.
- If each card is a functional product result with CTA/price/rating/status, choose island layout.
- If cards are homogeneous rows grouped under category headings, choose inset layout.

### Touch And Mobile/App

- Use flat layout for long visual fills, discovery, home pages, trip highlights, events, object grids, and photo-led rails.
- Use island layout for detail or form pages split into standalone content blocks: hero plus details, date, tickets, map, services, amenities, checkout blocks.
- Use inset layout for homogeneous app lists split into groups: bookings by transport type, settings groups, card-based subsections.

## Cross-Layout Conflict Rules

- The desktop `1200px` content column is the flat layout default, not a global rule for every layout.
- Island layout may use full desktop width when search/results/map need it.
- Inset layout is usually capped around `900px`; remaining desktop space can stay empty or become a side column.
- Shadows are not used for regular layout surfaces. Sticky bottom purchase bars may inherit product shadows from existing app patterns, but content islands/cards should remain shadowless.
- Borders/outlines are not layout separators. Thin dividers are allowed only inside dense content blocks where they are part of the component or table/list structure.
- Headings are outside inset islands on desktop, but inside the grey inset group on touch/mobile.
- When token names and captured Figma colors differ, prefer semantic token intent over literal color values.
- Do not mix layout models inside one page just to add variety.
- Combined layout is allowed when the product task changes by page phase, for example flat hero plus island checkout blocks, or flat content followed by an inset account group.
- In a combined layout, each page phase must still follow one of the documented layout models: flat, island, or inset.

## Responsive Mapping

- Desktop flat usually maps to touch/mobile flat: visual sections become one-column cards, two-column tiles, or horizontal rails inside `20px` page padding.
- Desktop island usually maps to touch/mobile island: each functional module becomes a full-width island with `8px` vertical gaps.
- Desktop inset usually maps to touch/mobile inset: the group heading moves inside the grey group and inner cards become compact full-width rows.
- If the desktop page combines a visual header with functional blocks, keep the visual header flat/hero-like on mobile and convert the functional blocks to islands.
- If the mobile page would become too dense with separate islands for every row, use inset instead.

## Open Layout Coverage

- More Figma references are still needed for flight, rail, and car search result island layouts to calibrate differences from hotel search.
- More production examples are needed for inset layout with real settings/account content beyond booking-card groups.

## Desktop Content Width

- For flat desktop layout, limit the main desktop content column to `1200px`.
- Keep the content column centered within the page when viewport width is larger than `1200px`.
- Do not stretch flat-layout primary content blocks across the full desktop viewport unless the specific product pattern requires it.
- On a `1440px` desktop frame, the working content area is approximately `1200px` wide with about `118-120px` side margins.
- Header content, hero content, body content, footer content, and breadcrumbs should align to the same desktop content column unless there is a deliberate product reason to break alignment.

## 1. Flat Layout

Flat layout consists of a single background layer with content placed directly on it.

### Background

- Always use Design System `Background Secondary` as the page background.
- Do not introduce additional page layers just for decoration.

### Surface Model

- Use large BaseAI cards and product blocks directly on the secondary background.
- Prefer large, calm surfaces with clear spacing over nested containers.
- Do not use shadows.
- Do not use outlines/borders as a default separation method.
- Separation should come from background, scale, spacing, and content hierarchy.
- Thin dividers are acceptable inside dense content blocks, such as tariff rows, footer groups, tables, and text-heavy sections.
- Avoid boxed “admin dashboard” containers around every section. A section may simply be a title plus content on the page background.

### Page Structure

- Build the page as a vertical stack of large sections inside the desktop content column.
- Keep section starts visually clear with large vertical gaps, not with decorative separators.
- Use a single top navigation/header layer; it may have a subtle bottom divider when it is fixed or visually separated from the page.
- Keep page title, tabs/chips, actions, hero, body, and footer aligned to the same content grid.
- Let narrower content sit inside the `1200px` column when it improves readability. For example, editorial or recommendation blocks can use an `800px` inner column centered inside the page.
- Use asymmetry only when it supports the product task: a wide main column plus a narrower side column is appropriate for detail pages.

### Desktop Column Patterns

- Single-column marketing or feed sections can use a centered inner column around `800px` wide.
- Detail pages can split the `1200px` content area into a main column around `792px`, a side column around `380px`, and a `32px` gap.
- Large card grids should keep clear gutters: `16px` for dense photo grids, `24px` when cards are bigger and need more air.
- Two-card visual rows can use `24px` gaps.
- Compact chip/filter rows use `8px` gaps.

### Visual Emphasis

- Put the main emphasis on product visuals.
- Use large photos with rounded corners, especially in hotel/product cards and similar visual-first entities.
- Keep the interface clean and simple rather than dense or decorative.
- Prefer image-led modules for travel inspiration, trips, hotel galleries, destinations, and promo banners.
- Large hero/trip cards can use very large radii, around `40-48px`.
- Standard photo cards and banners commonly use radii around `24-32px`.
- If text is placed over a photo, use a quiet dark overlay and `Text Inverse` or the matching BaseAI text-on-media style; avoid extra frames or decorative effects.
- Use inset `Background Primary` information panels inside large visual cards when the product entity needs metadata, status, or a CTA.

### Spacing

- Use generous spacing between elements and content groups.
- Distance from a page/section title to the next content block should usually be `24px` or `28px`.
- Major vertical gaps between independent sections can be much larger, commonly `56px` to `76px`.
- Use `24px` between title/header rows and primary content for normal sections.
- Use `28px` when the section needs slightly more breathing room or starts a larger product block.
- Inside visual cards, use comfortable insets: `20px`, `28px`, `32px`, or `40px`, depending on card scale.
- Card text below images can be compact: image to text around `8px`, title to secondary text around `4px`.

### Typography And Hierarchy

- Desktop page titles can use large YS Display typography, around `40px / 42px`.
- Section titles commonly use YS Display around `28px / 32px` or `20px / 24px`, depending on section importance.
- Use secondary text color for inactive tabs, captions, prices context, addresses, and metadata.
- Keep action hierarchy obvious and avoid competing calls to action in the same viewport.

### Controls And Navigation

- Header navigation should stay light and functional: logo, service tabs, utility icons, user entry.
- Use chips/tabs for local filtering; selected state can be a soft secondary control background.
- Search and primary CTA areas should feel integrated into the flat canvas, not like a separate heavy panel.
- Rounded controls should follow BaseAI component radii and spacing; do not invent custom pill systems when snippets exist.

### Typical Use Cases

- Main page.
- Hotel page.
- My trip page.
- Screens with large cards, forms, profile content, and other primary product blocks.

### Observed Reference Patterns

- Main page: centered service tabs, large rounded search row, then an inner `800px` content feed with visual event cards and 4-column destination grids.
- Hotel page: `1200px` hero/gallery area, then a `792px + 32px + 380px` main/aside split for tariffs, about, amenities, reviews, loyalty, and nearby hotels.
- My trip page: `1200px` title/action row, compact status chips, one large `590px` visual trip card with a `Background Primary` inset information panel, and lots of empty space around the core object.

### Anti-Patterns For Flat Layout

- Full-width desktop content that ignores the `1200px` column.
- Dense dashboards with many equal boxes, borders, and shadows.
- Multiple nested background layers around simple sections.
- Small generic cards when the screen should be led by travel visuals.
- Stretching text-heavy content to `1200px` when an `800px` readable inner column is more appropriate.
- Using dividers as the main page structure instead of spacing and visual hierarchy.

### Figma References

- Main page: https://www.figma.com/design/rZ1waudWTdSTEnrHeFCfVL/Specs-%E2%80%93-%D0%9B%D0%9A-%D1%87%D0%B0%D1%81%D1%82%D1%8C-2?node-id=5171-35214&t=OCtQ4lHtqs59WoOj-11
- Hotel page: https://www.figma.com/design/rZ1waudWTdSTEnrHeFCfVL/Specs-%E2%80%93-%D0%9B%D0%9A-%D1%87%D0%B0%D1%81%D1%82%D1%8C-2?node-id=5178-44048&t=OCtQ4lHtqs59WoOj-11
- My trip: https://www.figma.com/design/rZ1waudWTdSTEnrHeFCfVL/Specs-%E2%80%93-%D0%9B%D0%9A-%D1%87%D0%B0%D1%81%D1%82%D1%8C-2?node-id=5235-52775&t=OCtQ4lHtqs59WoOj-11

## 1A. Flat Layout For Touch And Mobile/App

Touch and mobile/app screens use the same flat layout idea: one calm page layer, large visual content blocks, clear spacing, and minimal chrome.

### Mobile Canvas

- Use the flat layout for touch and mobile/app screens as the default product layout.
- Use `20px` horizontal page padding.
- On a `375px` mobile frame, the usable content width is `335px`.
- The outer app canvas can use `Background Secondary`; the main content fill is often a large `Background Primary` rounded surface with `32px` radius.
- White content fills may start at the top of the screen and continue as a long vertical sheet. This creates the “long fills” pattern for flat mobile pages.
- Keep content in a single vertical flow unless a specific module needs horizontal scrolling or a compact tile row.
- Do not add outlines around cards or sections.
- Prefer `controls/primary` surface for clickable cards and tappable content blocks.
- Keep backgrounds light, clean, and quiet; the content and imagery should create hierarchy.

### Mobile Section Rhythm

- Use `32px` vertical spacing between content sections.
- Most sections should have a title.
- Skip the title when the content itself clearly explains the section purpose.
- Section title to content spacing is commonly `16px` on mobile.
- Page-level title to filters/chips can also use `16px` when the chips are part of the same header block.
- Use the desktop `24px/28px` rule only when the mobile block needs extra air.
- A long page should feel like a sequence of clear content fills: section, large card or tile group, section, large card or tile group.

### Mobile Card Model

- Use large cards for hotels and other primary content entities.
- Put large photos inside cards to attract attention and make the product feel travel-first.
- Cards can be arranged as one large card, two cards per row, or horizontally scrollable cards.
- One-column card lists are appropriate for event feeds and content where each item needs enough visual and text space.
- Two-column tile grids are appropriate for compact discovery blocks and object pages where users compare small sets of options.
- Horizontal scrolling is appropriate for recommendation rails and blocks that extend beyond the viewport.
- A more complex grid made from control-like cards is allowed, but should be rare and purposeful.
- Two-column mobile tiles commonly use `162px` card width with a `12px` horizontal gap inside the `335px` content width.
- Square photo tiles commonly use `162px × 162px` with `24px` radius.
- Tall discovery/place tiles can use `162px × 225-250px` images with text below.
- Full-width visual cards commonly use `335px` width, `32px` radius, and heights around `294-334px` depending on content.
- Recent/search cards can scroll horizontally with widths around `277-292px`, leaving the next card partially visible.
- Compact service tiles can use a wrapped grid with `12px` gaps, `162px` wide top tiles, and smaller flexible tiles when the layout needs more rhythm.

### Mobile Visual Emphasis

- Let photos carry the first impression. Text and controls should support the card, not overpower it.
- Use rounded photo/card corners consistently with BaseAI radii.
- Use larger visual cards for the most important entity on the screen, such as the current trip, hotel, destination, or event.
- Avoid small generic cards when the content is meant to be inspiring or visual.
- Avoid borders, outlines, and shadow-heavy stacks. Use surface color, size, imagery, and spacing instead.
- Photo cards can use small blur badges over the image for price, distance, dates, artists, or status.
- Text over image should be centered for hero/event cards and paired with a calm dark overlay around `20%` opacity.
- Inset information panels inside hero cards should use `Background Primary`, large radius, and internal padding; they should feel embedded, not like a separate modal.
- For content cards, keep the photo dominant and place title/metadata below with compact spacing.

### Mobile Filters And Header Blocks

- Use horizontal chips directly under the page title for category filters.
- Active chip uses a soft secondary background; inactive chips are text-only or visually lighter.
- Chips can overflow horizontally when the category set is wider than the viewport.
- Page-level titles on object/list pages can use `28px / 32px` YS Display.
- Section titles inside long pages commonly use `20px / 24px` YS Display.

### Mobile Interaction

- Entire cards may be clickable when they represent a single entity or destination.
- Tappable cards should use BaseAI/card or `controls/primary` surfaces rather than custom bordered containers.
- Keep tap targets comfortable and avoid tightly packed control grids unless the grid is the core interaction.
- Preserve simple, direct hierarchy: lead with the most important card/action, then supporting cards or filters.
- Use horizontal scroll to preserve card scale instead of shrinking important content too much.
- Make the next offscreen card visibly peek when a row is scrollable.

### Mobile Reference Patterns

- App main page: `Background Primary` long fill with `20px` padding; wrapped service tile grid at the top, horizontal “continue search” cards, horizontally scrollable place/hotel rails, and a large full-width “wanted to visit” visual card.
- My trip page: one large visual trip card as the main object, with a `Background Primary` inset booking panel, then a second `Background Primary` fill with segmented control and `32px` section rhythm.
- My trip page support blocks: participant avatars in a horizontal row, two-column weather cards, horizontally scrollable eSIM/product cards, and a full-width map card.
- Object page: page title plus horizontal chips, then a two-column `162px` card grid with image, blur price badge, title, rating, and metadata.
- Events page: page title plus horizontal chips, then one-column full-width `335px × 334px` visual event cards with centered text-on-media and optional artist badges.

### Observed Mobile Measurements

- Frame width: `375px`.
- Page padding: `20px`.
- Content width: `335px`.
- Main `Background Primary` fill radius: `32px`.
- Section gap: `32px`.
- Section title to content: `16px`.
- Two-column tile: `162px + 12px + 162px`.
- Tile image radius: `24px`.
- Full-width visual card radius: `32px`.
- Trip hero internal media radius: around `28px`; embedded booking panel radius: around `24px`.
- Chip height: `40px`, radius `16px`, horizontal padding around `14px` plus inner `4px`.

### Mobile Figma References

- App main page: https://www.figma.com/design/rZ1waudWTdSTEnrHeFCfVL/Specs-%E2%80%93-%D0%9B%D0%9A-%D1%87%D0%B0%D1%81%D1%82%D1%8C-2?node-id=5235-56759&t=OCtQ4lHtqs59WoOj-11
- My trip page: https://www.figma.com/design/rZ1waudWTdSTEnrHeFCfVL/Specs-%E2%80%93-%D0%9B%D0%9A-%D1%87%D0%B0%D1%81%D1%82%D1%8C-2?node-id=5235-57009&t=OCtQ4lHtqs59WoOj-11
- Object page: https://www.figma.com/design/rZ1waudWTdSTEnrHeFCfVL/Specs-%E2%80%93-%D0%9B%D0%9A-%D1%87%D0%B0%D1%81%D1%82%D1%8C-2?node-id=5235-57086&t=OCtQ4lHtqs59WoOj-11
- Events: https://www.figma.com/design/rZ1waudWTdSTEnrHeFCfVL/Specs-%E2%80%93-%D0%9B%D0%9A-%D1%87%D0%B0%D1%81%D1%82%D1%8C-2?node-id=5235-57115&t=OCtQ4lHtqs59WoOj-11

## 2. Island Layout For Desktop

Island layout is a desktop layout for screens built from grouped functional islands and repeated clickable snippets: hotel cards, flight cards, rail cards, car cards, search result cards, and similar product result entities.

Use this layout when the screen naturally consists of separate product snippets or grouped task modules.

Do not choose island layout just because there are many cards. If snippets are only photo plus text, use flat layout on desktop even when there are many of them.

### Layer Model

- Island layout has two visual layers.
- The back layer is `Background Primary`.
- Islands placed on top use `Background Secondary`.
- The back layer acts as the separator between islands.
- Do not use shadows.
- Do not use borders as the main island separator.
- Separation should come from the primary backdrop visible between secondary islands.
- Controls must never be placed directly on the back layer in desktop island layout. Buttons, inputs, selects, sliders, toggles, chips, tabs, and other interactive controls always live inside an island or inside a product snippet island.

### Width And Page Composition

- Island layout can use the full desktop width.
- It does not need to be constrained to the `1200px` centered content column from flat layout.
- Search results can occupy the left/content part of the viewport while a map or contextual panel occupies the right side.
- A map column can be sticky or fixed in the visible viewport when the task is location-based.
- Header content can still align to the shared desktop header grid, but the body may expand to the full work area.

### Island Grouping

- Group content semantically: search form in its own island, filters in their own island, every result snippet as its own island, informational banners in their own island, pagination/actions in their own island.
- Do not merge unrelated modules just to reduce whitespace.
- Do not split one semantic task into many tiny islands if it belongs together.
- A filter sidebar is one island containing many filter groups.
- A search form island may sit above the result list and span the working content area.
- SEO, FAQ, reviews, and recommendation blocks can appear as larger content islands after the result list.

### Snippet Cards

- Use island layout when ready-made snippets are available or when the product entity can be represented as a snippet.
- The snippet should be a functional product/result entity, not just a simple photo-and-text card.
- Result snippets are clickable cards.
- Result snippets will most likely contain a photo or strong visual preview.
- Use large media inside snippets when the domain is hotel, travel, destination, or experience search.
- Keep one snippet as one semantic clickable product island.
- Do not hand-build repeated product snippets from generic divs when a BaseAI snippet/component exists.

### Radius And Padding

- Use `36px` radius for islands and snippets by default.
- Use `24px` internal padding inside island content.
- Use the same value for the main internal gap between content groups inside a desktop island as the island internal padding. With the default padding, desktop island internal gap is `24px`.
- If a snippet has an inner photo, keep photo radius aligned with the snippet scale and BaseAI component defaults.
- Do not reduce radius just to fit more items; island layout should feel spacious and clear.

### Spacing

- Use `8px` gaps between repeated snippets in a result list.
- Use `8px` vertical gaps between desktop islands by default.
- Use visible primary backdrop gaps between large semantic islands; increase them only when the page phase changes.
- Keep filters dense enough to scan, but preserve clear grouping within the filter island.
- Use larger vertical gaps only between different page phases, for example result list to SEO/FAQ content.

### Common Use Cases

- Hotel search results.
- Flight search results.
- Rail search results.
- Car search results.
- Any desktop result page where product snippets are the main interaction.
- Search pages with a map or side contextual surface.

### When To Use Flat Layout Instead

- Use flat layout for desktop collections made from simple photo-and-text cards.
- Use flat layout for inspiration grids, destination cards, event promos, editorial collections, and visual feeds.
- Use flat layout even if there are many simple cards; quantity alone does not make the screen island-based.

### Observed Reference Pattern

- Hotel search results use a full-width desktop work area.
- The right side is a map column around `400px` wide.
- The left side contains the search/results work area around `880px` wide.
- The filter island is a left column around `228px`; filter content uses `24px` padding.
- The result/list column starts next to filters and uses repeated snippet islands around `644px` wide.
- Snippet islands are stacked with `8px` gaps and contain a large photo, title, rating, price, badges, and an action area.
- Search, filters, result snippets, informer, pagination, FAQ, reviews, and SEO blocks are separated by semantic islands rather than shadows.

### Anti-Patterns For Island Layout

- Using island layout for a simple visual landing/feed page where flat layout would be calmer.
- Adding shadows to separate islands.
- Putting all filters, search, snippets, map, and content into one giant container.
- Placing action buttons, filters, dropdowns, sliders, or other controls directly on the backdrop between islands.
- Making snippets too small or visually weak when they are the core action.
- Using borders around every island instead of letting the backdrop separate them.
- Constraining the whole body to `1200px` when the task needs full-width search plus map.

### Figma References

- Hotel search results: https://www.figma.com/design/rZ1waudWTdSTEnrHeFCfVL/Specs-%E2%80%93-%D0%9B%D0%9A-%D1%87%D0%B0%D1%81%D1%82%D1%8C-2?node-id=5171-35780&t=OCtQ4lHtqs59WoOj-11

## 2A. Island Layout For Touch And Mobile/App

Mobile island layout is simpler than desktop island layout. The main unit is the island.

Use it for app/touch pages where content is split into clear self-contained blocks: hotel details, services, trip information, maps, lists, cards, forms, or action groups.

### Page Structure

- The page can start with a navbar.
- The page can start with a large background illustration or hero visual, especially on hotel pages and services pages.
- Below the top area, content is arranged as vertical islands.
- Islands touch the left and right screen edges. Do not add `20px` outer page margins around island containers.
- Use `8px` vertical spacing between islands.
- Do not use shadows.
- Do not use borders as island separators.
- Object/detail pages may overlap the first island with the hero image area, so the content sheet starts before the image fully ends.
- Flow/form pages can skip the hero and start with status bar + navbar + first island.
- Sticky bottom purchase/checkout bars are allowed for the main action, but they are not part of the regular island stack.

### Island Anatomy

An island can contain:

- Title.
- Subtitle.
- Content: map, text+icon list items, cards, controls, forms, or structured product content.
- Full-width button.

The generic island composition is title plus content. Subtitle and button are optional and depend on the task.

### Island Container

```css
.island {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  margin-left: 0;
  margin-right: 0;
  height: auto;
  padding: 20px 20px 24px;
  gap: 20px;
  background: var(--yatraveluikit-bg-fill-primary-color);
  border-radius: 36px;
}
```

- The CSS example uses the generic new-island target. Existing app screens often use `32px`; match the existing screen radius when extending an established flow.
- Some first/detail islands can use `padding: 20px 20px 28px` when the top content needs a little more breathing room.
- Form islands and compact input islands may use `padding: 20px` when the button is outside or the content is short.
- Islands usually occupy the full `375px` frame width on app/touch examples and sit flush to the screen edges.
- Island internal padding is `20px`, so their internal content width is `335px` on a `375px` frame.
- Adjacent islands create separation through the `8px` background gap, not through shadow.

### Title

```css
.island-title {
  width: 100%;
  margin-bottom: 8px;
}
```

- Use `Headline/H3 Long` for island titles.
- Use third-level heading style for multiline titles.
- This title style applies to app and touch.
- The title should describe the island, not the whole page.

### Subtitle

```css
.island-subtitle {
  width: 100%;
}
```

- Use `Body/B3` for subtitle text.
- Subtitle should clarify the title or explain the content state.
- Do not add a subtitle if it repeats the title.

### Content

- Content should fill the island width.
- Text+icon list items should align cleanly and keep a simple vertical rhythm.
- Maps can be placed as full-width content inside the island.
- Cards inside an island should be grouped by one task or one semantic meaning.
- If content is already self-explanatory, the island may omit the title and start with the content.
- Product cards inside an island can use secondary surfaces, radius around `32px`, and internal price/action rows.
- Input fields inside an island can use solid secondary surfaces and full width.
- Lists of text+icon rows commonly use `12px` vertical padding per row or `16px` gaps between standalone rows.
- Map previews can be shorter than visual cards, around `88px` high, with radius around `20px`.
- Ticket/form rows may use a left text block and right controls; keep the row simple and readable.
- Chip grids inside an island can wrap with `8px` gaps and `48px` control height.

### Button

- If an island has a main action, place a full-width button at the bottom of the island.
- Use one main action per island when possible.
- Do not put multiple competing primary buttons inside one island.

### Observed Mobile Island Patterns

- Service/object detail page: large hero image at the top, floating toolbar over the image, then a first `Background Primary` island overlapping the hero with title, rating, description, and details.
- Service/object detail page: following islands include date input, ticket cards, excursion service cards, location map plus text+icon rows, amenities list, and a full-width secondary button.
- Checkout/selection page: status bar + navbar, then islands for ticket summary, date, ticket counters, type choice, and time choice.
- Ticket cards inside an island can be secondary rounded blocks with title, price row, and a yellow primary button.
- Bottom purchase bar can be sticky with total price and a main action; it may have a top radius and platform home bar area.
- Existing references contain bottom shadows on sticky bottom bars, but regular content islands should remain shadowless.

### Observed Mobile Island Measurements

- Frame width: `375px`.
- Island width: `375px`.
- Island outer horizontal margin: `0px`.
- Internal content width: `335px`.
- Vertical gap between islands: `8px`.
- Island radius: commonly `32px`; use `36px` as the generic target when creating new islands unless matching an existing screen.
- Island padding: `20px 20px 24px`; first/detail islands may use bottom `28px`.
- Island title: `24px / 28px` for regular island titles; page/detail title can be `28px / 32px`.
- Content gap inside regular touch/mobile islands: `20px`.
- Nested ticket/product cards: radius around `32px`, padding top/sides around `20px/8px`, with inner `Background Primary` price/action panel radius around `28px`.

### Anti-Patterns For Mobile Island Layout

- Shadows between islands.
- Borders around islands.
- Tiny islands for every small row when rows belong to one semantic block.
- Missing title on an island whose content is not self-explanatory.
- Multiple unrelated content groups inside one island.

### Mobile Island Figma References

- Service/object detail with hero and islands: https://www.figma.com/design/rZ1waudWTdSTEnrHeFCfVL/Specs-%E2%80%93-%D0%9B%D0%9A-%D1%87%D0%B0%D1%81%D1%82%D1%8C-2?node-id=5238-23462&t=OCtQ4lHtqs59WoOj-11
- Ticket selection / checkout flow with navbar and islands: https://www.figma.com/design/rZ1waudWTdSTEnrHeFCfVL/Specs-%E2%80%93-%D0%9B%D0%9A-%D1%87%D0%B0%D1%81%D1%82%D1%8C-2?node-id=5238-23554&t=OCtQ4lHtqs59WoOj-11

## 3. Inset Layout For Desktop

Inset layout consists of three layer levels. Islands with `Background Primary` are inset into a shared `Background Secondary` page substrate. Content cards with `Background Secondary` sit on top of those inset islands.

Use it when a page needs grouped content blocks where the group container and the cards inside it should both be visible, but the layout should stay calm and clean.

### Layer Model

- Page substrate: `Background Secondary`.
- Inset island: `Background Primary` visually cut into the secondary substrate.
- Content cards inside the island: `Background Secondary`.
- This creates a three-level surface model: secondary page, primary inset island, secondary content cards.
- Do not use shadows.
- Do not vary border colors; border/edge treatment should stay consistent and neutral.
- Prefer surface contrast and spacing over strokes.

### Group Structure

- Each inset island represents one semantic group.
- Content cards inside the island represent repeated or related items in that group.
- Use internal gaps between content cards to separate blocks inside the island.
- Use external vertical spacing to separate different semantic groups.
- On desktop, headings are placed outside the inset island.
- The heading and its island form one semantic group.

### Width And Placement

- Desktop inset layout is usually not wider than about `900px`.
- The remaining desktop space can stay empty or contain a side column.
- Do not stretch inset groups to the full viewport width.
- Keep the inset group visually compact and readable.

### Desktop Measurements

- Example inset island width: `912px`; in real layouts, target about `900px` max width.
- Example inset island radius: `40px`.
- Example content card width: `896px`.
- Example content card radius: `32px`.
- Example inset between island edge and content card: `8px`.
- Example content card height: `168px`.
- Example content placeholder/image: `112px × 112px`, radius `24px`, with `20px` padding when it is an icon/placeholder container.
- Distance from heading to island: usually `24px`.
- Distance between semantic groups: usually `40px`, and can be larger when the page rhythm needs more air.

### Content Card Anatomy

- Each `CardBg` should contain a square image, icon, or placeholder on a rounded background.
- The square visual element is always rounded.
- The square visual can be an actual image or an icon on a colored background.
- `CardBg` can be clickable.
- If clickable, the whole content card should behave as one target.
- Avoid making only the image clickable when the card is the semantic target.

### Spacing Rules

- Use the gaps between content cards inside an island to separate internal blocks.
- Use the gaps between islands to separate page groups.
- Use `24px` between heading text and the inset island.
- Use `40px` or more between semantic groups.
- Keep island internals regular and predictable; repeated cards should align exactly.

### When To Use

- Grouped lists where each item is a calm card with icon/image plus text.
- Account/profile/settings-like groups where each group needs a visible container and repeated rows/cards.
- Product flows where cards need to feel inset into a larger grouped surface.
- Desktop pages where flat layout is too loose, but island layout would make every item feel too separate.
- Listings made from homogeneous content split into subcategories with headings.
- Settings-like pages based on cards, split into subsections.
- Card-based lists where each subsection title matters more than each card being a separate island.

### Anti-Patterns For Inset Layout

- Putting headings inside the inset island on desktop when the pattern calls for external headings.
- Using shadows to lift the inset island or inner cards.
- Changing border colors to create emphasis.
- Mixing unrelated cards in one inset island.
- Using this layout for pure photo grids; flat layout is better for simple visual collections.

### Figma References

- Inset layout example: https://www.figma.com/design/rZ1waudWTdSTEnrHeFCfVL/Specs-%E2%80%93-%D0%9B%D0%9A-%D1%87%D0%B0%D1%81%D1%82%D1%8C-2?node-id=5239-25184&t=OCtQ4lHtqs59WoOj-11

## 3A. Inset Layout For Touch And Mobile/App

App/touch inset layout uses the same three-level idea, but the section heading moves into the grey inset island.

### Mobile Layer Model

- Page substrate: usually `Background Primary`.
- Inset island/group: `Background Secondary`.
- Content cards inside the inset group: `Background Primary`.
- The grey inset group contains both the heading and the cards.
- Do not use shadows.
- Do not change border colors for emphasis.

### Mobile Group Structure

- Each grey inset group represents one subcategory or semantic section.
- The group title is placed inside the grey inset group, above its cards.
- Content cards inside the group are homogeneous and repeat the same structure.
- Use this for listings of homogeneous content, settings, bookings, or card-based groups split by subcategory headings.
- Use this when grouping matters more than making every card its own separate island.

### Mobile Measurements

- Frame width: `375px`.
- Inset group width: `335px`.
- Inset group horizontal position: `20px` page margin.
- Inset group radius: `32px`.
- Inner card width: `319px`.
- Inner card horizontal inset: `8px` from the grey group edge.
- Inner card radius: `24px`.
- Inner card height in examples: `104px`.
- Group title x-position: `20px` inside the grey group.
- First card starts around `72px` below the group top when the title is present.
- Gap between inner cards: `8px`.
- Gap between inset groups: `8px`.

### Mobile Card Anatomy

- Inner cards usually contain a left square image/icon and a text block.
- The visual square can be `64px × 64px` with `16px` radius.
- Text block commonly uses title, secondary metadata, and optional status badge.
- The whole inner card can be clickable if it represents a booking, setting, trip item, or list entity.

### Observed Mobile Inset Patterns

- Bookings page: `Background Secondary` group “Hotels” contains two `Background Primary` booking cards.
- Bookings page: `Background Secondary` group “Train” contains one `Background Primary` train card.
- Generic example: `Background Secondary` group contains title and one or more `Background Primary` placeholder cards.
- The mobile title is inside the grey group, unlike desktop where the title sits outside the island.

### Mobile Inset Figma References

- Generic app/touch inset example: https://www.figma.com/design/rZ1waudWTdSTEnrHeFCfVL/Specs-%E2%80%93-%D0%9B%D0%9A-%D1%87%D0%B0%D1%81%D1%82%D1%8C-2?node-id=5239-25203&t=OCtQ4lHtqs59WoOj-11
- App bookings inset example: https://www.figma.com/design/rZ1waudWTdSTEnrHeFCfVL/Specs-%E2%80%93-%D0%9B%D0%9A-%D1%87%D0%B0%D1%81%D1%82%D1%8C-2?node-id=5239-25320&t=OCtQ4lHtqs59WoOj-11

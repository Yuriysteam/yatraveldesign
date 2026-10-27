---
name: travel-figma-design-system
version: v0.1
description: "Applies the shared Travel Figma component, token, icon, and library-provenance rules for product mockups and specs. Use with figma-design-machine or figma-spec-builder whenever work touches Base 2.0, Organisms 2.0, Travel.Styles, Extranet UI, or local component decisions."
metadata:
  short-description: "Общий DS-контекст для Travel Figma"
  version: "0.1.1"
  updated: "2026-09-07"
  last_editor: "Codex"
  status: "beta"
  owner: "Travel Design"
  auto_trigger: true
  type: "companion"
  parents: ["figma-design-machine", "figma-spec-builder"]
---

# Travel Figma Design System

Общий источник правил выбора компонентов и токенов для продуктовых макетов и рабочих Figma-спек Travel. Этот навык не проектирует решение и не оформляет spec shell: он определяет, из чего собирать интерфейс и как доказать связь с дизайн-системой.

## Маршрутизация

- Перед созданием или редактированием продуктового UI, выбором крупного блока либо аудитом component provenance полностью прочитать [карту Organisms 2.0](references/organisms20-figma-map.md).
- Когда задача затрагивает controls, variants, semantic variables, text styles, spacing, radii или effects, полностью прочитать [карту Base 2.0](references/base20-figma-map.md).
- [Машинный индекс Base 2.0](references/base20-figma-components.json) открывать только для поиска точного component set, key, variant axis или page inventory; не загружать целиком без необходимости.
- Для чистой раскладки spec shell без изменения product UI карты не нужны; использовать правила `figma-spec-builder`.

Карты являются снимками, а живая Figma-библиотека — источником истины. Если статус, key, variant или generation расходятся с картой, проверить библиотеку live, зафиксировать расхождение и не угадывать.

## Лестница выбора

Для каждого самостоятельного блока идти сверху вниз:

1. Published organism целевого продукта и платформы.
2. Published component Base 2.0.
3. Композиция связанных library instances.
4. Локальный component только для подтверждённого нового или повторяемого паттерна.
5. Свободные слои — последний вариант.

Для navbar, modal, drawer, sheet, card/snippet, map, upload, bottom action area и других крупных блоков сначала искать целый organism. Импортировать его по точному `assetKey`, оставлять корень linked `INSTANCE` и настраивать exposed properties. Не считать внешнюю frame-обёртку с отдельными instances внутри целым organism.

## Токены и provenance

- Base 2.0 задаёт controls, semantic colors, typography, spacing, radii и effects внутри или вокруг organism.
- Совпадающий HEX, шрифт или числовой отступ не считается токеном без реального variable binding или published style.
- Проверять `mainComponent`, source library, variant, component properties, variable modes и bindings, а не только визуальное сходство.
- Не создавать local master, если доступен правильный library component. Если master `UNPUBLISHED` или недоступен, назвать asset gap; не создавать ложную привязку к локальной копии.
- Страницу `🛠️ Кандидаты в организмы от разработки` не открывать и не использовать как источник решений.
- `CHANGED`, старые/новые дубли, технические имена и внутренние parts трактовать по карте Organisms; неоднозначность не разрешать молча.

## Extranet и Travel.Styles

- Для input и search по умолчанию использовать Base 2.0 `InputOutlined`. `InputSolid` допустим только при подтверждённом продуктовом паттерне или явном требовании.
- Standalone и swappable icons брать из `Travel.Styles` в точном размере slot; при семантической альтернативе предпочитать asset с суффиксом `New`.
- Размер icon asset обязан совпадать с `IconContainer`: `24 px` → `IconContainer · XL · 24`. Не прятать mismatch масштабированием.
- После swap проверять semantic color binding. В пустом Extranet input/search leading icon использует `text & icons/secondary`, как placeholder.
- В back button использовать полную стрелку со штоком. Для `24 px` slot — `Icons / 24 / ArrowLongLeftNew`, не chevron.
- Для закрытия modal использовать `Icons / 24 / CloseNewNew`.
- Amenity icons должны быть semantic, exact-size, с `New` и более тонким рисунком, чем interface icons; не выбирать `Bold`, `Heavy` или `Filled`, если есть тонкая альтернатива.
- Иконку внутри published component не заменять, если компонент не экспонирует instance-swap property.

## Выход проверки

Для каждого исключения или нарушения назвать node, фактический source/binding, ожидаемый component/token, затронутые аналоги и статус: blocker, некритичное, подтверждённое исключение или unresolved asset gap. Не придумывать node IDs, keys или bindings без доступа к target.

# Travel Figma Codex

- Для общей или многоэтапной задачи начинать с `$figma-workflow-router`.
- Для создания и исправления макетов использовать `$figma-design-machine`.
- Для сборки и handoff-аудита спеки использовать `$figma-spec-builder`.
- Компоненты, токены, иконки и library provenance проверять через `$travel-figma-design-system`.
- Новый или изменяемый UX-текст вести через `$yandex-travel-ux-writing`; утверждённый текст без запроса не переписывать.
- HTML → Figma/спека выполнять через `$html-to-figma-spec`.
- Figma → кликабельный HTML выполнять через `$figma-to-baseai`, используя workspace или отдельно установленный BaseAI runtime и обязательный browser gate.
- Для Figma ↔ HTML до генерации отдельно проверять: целостность BaseAI, живой Storybook, локальные карты Base 2.0/Organisms, доступность live Figma libraries, component coverage и token coverage. Snapshot не равен live-подключению; unresolved значимый компонент нельзя заменять generic HTML или свободными слоями.
- Сохранять прямой вызов профильного навыка; не запускать весь комплект без необходимости.
- Паспорт продукта в пакет не входит. Для продуктовых фактов использовать доступные живые источники или отдельно установленный внутренний паспорт.
- Не публиковать пакет: внутри корпоративные DS-карты, Figma identifiers и внутренние договорённости.

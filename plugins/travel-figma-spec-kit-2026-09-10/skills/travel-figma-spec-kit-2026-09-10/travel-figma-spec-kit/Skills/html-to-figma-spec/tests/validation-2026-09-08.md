# Проверка 0.1.0 — 2026-09-08

- Штатный `skill-creator/scripts/quick_validate.py`: passed для источника и установленной ссылки.
- UI metadata, автоматический выбор, локальные Markdown-ссылки, уникальность IDs карты и типы ключей: passed.
- `python3 -B -m unittest discover -s Skills/html-to-figma-spec/tests -v`: 8 тестов passed, включая вложенный output-каталог, защиту исходников, разрешение document root и границы evidence.
- BaseAI simple-form: найдены 5 элементов с кандидатами карты; общий `.button` остаётся неоднозначным между BaseAI и Base2.0.
- Base2.0 bookings с явно указанным web root: прочитаны 9 CSS-зависимостей и 385 деклараций custom properties; нестандартные controls остаются неразрешёнными.
- Независимый dry-run на отдельной HTML-форме: скрытый dialog, неработающий trigger и неподтверждённый Figma-атрибут не стали готовым сценарием или доказанной library linkage. Браузерная проверка отделена от статического inventory.

Карта содержит 26 component entries: 20 `candidate`, 6 `unresolved`, 0 подтверждённых HTML→Figma соответствий. Проверены локальные source paths/hashes, selectors, Figma keys и axes по датированным снимкам. 7 semantic→CSS записей и внешний индекс 856 иконок подтверждают только прямо указанную локальную связь, не текущую публикацию или binding в target.

Живой импорт библиотек и полная сборка Figma-спеки в этой проверке не выполнялись. Это проверка нового скилла, инспектора и evidence, а не подтверждение работоспособности Figma-интеграции в каждой сессии.

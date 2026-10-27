# Changelog

## 1.3.0 — 2026-10-13

- Preflight теперь проверяет целостность BaseAI, ссылки компонентов/snippets, наличие CSS tokens и доступность живого Storybook index.
- При сетевом ограничении Node live-проверка может быть подтверждена read-only browser/web-доступом к непустому Storybook index.
- Добавлены обязательные component/token coverage до кода и запрет silent fallback на generic HTML.
- Разделены статусы BaseAI snapshot, Storybook live, Base 2.0 snapshot, live Figma libraries и browser QA.

## 1.2.1 — 2026-10-05

- Добавлено автоматическое обнаружение отдельно установленного `travel-baseai-runtime` через `${CODEX_HOME}/team-runtimes/BaseAI/.active`.
- Сохранена обратная совместимость с workspace и bundled BaseAI; preflight принимает явный абсолютный путь вторым аргументом.

## 1.2.0 — 2026-10-05

- Добавлено разрешение BaseAI runtime из workspace или установленного командного package.
- Добавлен локальный preflight обязательных BaseAI-файлов и доступности Playwright.
- Визуальный gate допускает Playwright или browser/computer-use инструмент со screenshot и кликами; degraded mode по-прежнему требует явного согласия.
- Переносимый HTML не должен сохранять зависимости от пользовательского `CODEX_HOME`.

## 1.1.0 — 2026-07-03

- Зафиксирован перенос Figma-фреймов в кликабельные BaseAI-прототипы с обязательной визуальной проверкой.

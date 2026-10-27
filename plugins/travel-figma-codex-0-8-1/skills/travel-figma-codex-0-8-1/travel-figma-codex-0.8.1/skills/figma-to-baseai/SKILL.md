---
name: figma-to-baseai
version: v1.3.0
description: "Figma MCP → кликабельный high-fidelity HTML/CSS-прототип на BaseAI. Используй для pixel-perfect переработки Figma-фреймов в прототипы; иконки брать из BaseAI, не из Figma."
metadata:
  version: "1.3.0"
updated: "2026-10-13"
last_editor: Codex
status: standalone
owner: Yuriy
auto_trigger: false
type: standalone
parents: []
---

# figma-to-baseai

Standalone-скилл для переработки Figma-фрейма в кликабельный high-fidelity HTML/CSS-прототип на `BaseAI/`.

Главная цель: максимально точно повторить экран из Figma по layout, визуальной иерархии, плотности, состояниям и интеракциям, но собирать интерфейс из локальных BaseAI building blocks, а не вручную клонировать дизайн-систему.

## Когда использовать

Используй скилл, когда пользователь просит:

- сделать прототип из Figma
- сверстать Figma в HTML/CSS
- переработать Figma-фрейм в кликабельный прототип
- сделать high-fidelity или pixel-perfect прототип
- использовать `BaseAI/` как источник компонентов
- `figma-to-baseai`

Не используй для генерации новых экранов без Figma-источника, UX research или дизайн-процесса. Base 2.0 может быть источником component identity в Figma, но runtime HTML всегда строится на BaseAI/Storybook, а не на визуальной копии Figma-компонента.

## Жесткие правила

- До основной работы обязательно проверь, что Figma MCP доступен и отвечает. Если MCP не работает, остановись и не переходи к генерации.
- До кода полностью прочитай readiness gate из установленного `travel-figma-design-system/references/readiness-gate.md`. Если companion skill недоступен, остановись: нельзя подтвердить Base 2.0/Organisms provenance источника.
- Runtime-источник UI: только `BaseAI/`.
- Обязательно подключай `BaseAI/fonts.css` и `BaseAI/library.css` относительным путем из HTML-файла.
- Компоненты брать сначала из `BaseAI/snippets/snippets.json`, затем из `BaseAI/components/`, и только потом писать минимальную локальную разметку.
- Видимые интерактивные элементы не делать нативными браузерными контролами, если есть BaseAI-аналог.
- Custom CSS писать только для page layout, responsive rules, композиции, позиционирования, spacing и локальных контейнеров.
- Не переписывать внутренние состояния BaseAI-кнопок, инпутов, селектов, чекбоксов, свитчей, табов, чипов, карточек, модалок и похожих компонентов.
- Иконки не вытягивать из Figma. Сначала искать в `BaseAI/icons/` и `BaseAI/components.json`; если точного совпадения нет, использовать ближайшую BaseAI-иконку или текстовый fallback без emoji.
- Из Figma можно брать изображения, фотографии, иллюстрации и контентные assets, но не system icons.
- Emoji запрещены для продуктовых иконок.
- Прототип должен быть кликабельным: основные CTA, табы, раскрытия, модалки, drawer, checkbox/switch-like состояния и переходы должны иметь JS-поведение, если это видно или требуется в сценарии.
- После верстки обязательно открыть HTML в браузере и проверить через Playwright. Без Playwright-проверки нельзя считать результат pixel-perfect.

## Минимальные входные данные

Нужны только:

- ссылка на Figma-фрейм или `fileKey + nodeId`
- целевой путь HTML или короткое имя прототипа

Если чего-то не хватает, задай один короткий вопрос. Не спрашивай имя автора, стрим, Arcadia, S3 или любые старые поля из `makedesign`, если пользователь сам этого не требует.

## Где находится BaseAI

До работы разрешить `BASEAI_ROOT` в таком порядке:

1. `<workspace>/BaseAI`, если прототип создаётся в общем репозитории;
2. отдельно установленный runtime из `${CODEX_HOME:-~/.codex}/team-runtimes/BaseAI/.active`;
3. bundled runtime старого командного пакета: `BaseAI` в корне package, на два уровня выше установленного `skills/figma-to-baseai`;
4. явно переданный пользователем каталог BaseAI.

Запустить `scripts/preflight.sh [workspace-root] [baseai-root] [offline|check-live|require-live]`. Для обычной работы использовать `check-live`: скрипт проверяет структуру BaseAI, component/snippet references, token variables и пробует открыть живой Storybook index. `offline` допустим только для локальной диагностики; `require-live` — когда пользователь требует актуальную Storybook-версию. Figma MCP и browser tools проверить отдельными read-only вызовами на шаге 0. Не ссылаться на BaseAI-копию только потому, что каталог совпал по имени.

Локальный прототип может использовать относительный путь от HTML до найденного runtime. Для переносимого результата по явному запросу скопировать только требуемые BaseAI assets вместе с артефактом и снова проверить относительные ссылки; установленный путь в `CODEX_HOME` не должен попадать в передаваемый HTML.

## Рабочий процесс

### 0. Source readiness gate

До чтения BaseAI-контекста и до любой генерации проверь доступность MCP:

- Figma MCP отвечает на базовый запрос к переданному `fileKey/nodeId` или хотя бы позволяет получить metadata.
- Если доступен browser/Playwright MCP, проверь, что можно открыть локальную страницу или пустой browser context.

Если Figma MCP недоступен, токен невалиден, node не читается, сервер не отвечает или нет инструмента для получения screenshot/design context, остановись. Сообщи пользователю коротко, что именно не работает, и не делай HTML по памяти или по догадкам.

Если нет ни Playwright, ни browser/computer-use инструмента, способного открыть страницу, сделать screenshot и прокликать состояния, можно подготовить файл только после явного согласия пользователя на degraded mode. По умолчанию не продолжай, потому что финальная визуальная проверка обязательна.

Запусти BaseAI preflight и отдельно `node <travel-figma-design-system>/scripts/preflight.mjs`. Затем зафиксируй статусы: Figma source, BaseAI snapshot, Storybook live, Base 2.0 snapshot, live Figma libraries, browser QA. `SNAPSHOT_ONLY`, `NOT_CHECKED` и `PASS` не взаимозаменяемы.

Если Node-проверка Storybook вернула `SNAPSHOT_ONLY`, попробуй открыть `manifest.storybookIndex` доступным browser/web-инструментом и подтвердить непустой JSON index. Если live-source недоступен обоими способами, сообщи дату snapshot и до кода запроси явное согласие на degraded mode. Если BaseAI integrity, Figma source или локальная карта DS не прошли проверку, не продолжай.

### 1. Подготовь BaseAI-контекст

Перед генерацией прочитай:

- `BaseAI/AGENT.md`
- `BaseAI/AI_USAGE.md`
- `BaseAI/principles/layouts.md`
- `BaseAI/principles/visual-style.md`
- `BaseAI/principles/tokens.md`
- `BaseAI/principles/validation.md`

Затем найди релевантные building blocks:

- `BaseAI/snippets/snippets.json` для готовых production-safe фрагментов
- `BaseAI/components.json` для индекса компонентов
- `BaseAI/components/*/markup.html` как fallback
- `BaseAI/icons/` только для имен иконок, если нужны system icons

### 2. Получи Figma-данные через MCP

Извлеки `node-id` из ссылки: `114-1388547` → `114:1388547`.

Через Figma MCP получи:

- `get_metadata` для структуры фрейма
- `get_screenshot` для визуальной калибровки
- `get_variable_defs`, если доступно
- `get_design_context` для root или отдельных секций

Если фрейм большой, не тащи весь root одним контекстом: сначала `get_metadata`, затем `get_design_context` по ключевым секциям.

Скриншот является обязательным источником контекста. По нему дополнительно восстанови:

- visual hierarchy: главный action, secondary actions, quiet controls
- логические группы и последовательность сценария
- текущие состояния: selected, active, disabled, error, empty, loading, overlay
- предполагаемые клики и переходы между состояниями
- какие элементы являются navigation, filter, form, list item, card action, modal trigger или dismiss action

Если `get_design_context` и screenshot расходятся, приоритет для визуального результата у screenshot, а для компонентного provenance у `componentName` / `variantProperties`.

### 3. Сделай короткую инвентаризацию

Перед кодом зафиксируй для себя:

- размер фрейма и предполагаемый viewport
- тип: страница, экран приложения, модалка, drawer, bottom sheet, state overlay
- основные секции сверху вниз
- интерактивные элементы и их состояния
- предполагаемую логику работы экрана и переходы состояний
- компоненты из Figma `componentName` / `variantProperties`
- что маппится на BaseAI snippet/component
- какие assets нужны кроме иконок

Для каждого крупного блока и интерактивного контрола добавь строку `Figma node/component → BaseAI snippet/component → variant/state → tokens → evidence → status`. До кода все такие элементы должны иметь source либо статус blocker. Похожий внешний вид или совпавшее имя не являются source.

Не публикуй длинную инвентаризацию пользователю, если он не просил. Используй ее как чеклист качества.

### 4. Маппинг на BaseAI

Маппинг делай по смыслу, `componentName`, `variantProperties` и screenshot-калибровке.

Приоритет источников:

1. Готовый snippet из `BaseAI/snippets/`.
2. Raw component markup из `BaseAI/components/`.
3. Минимальная локальная HTML-композиция поверх BaseAI tokens/classes.

Сохраняй BaseAI class names, ARIA, `data-*`, state classes и вложенность, если берешь snippet/component.

Перед версткой посчитай component coverage. Все видимые controls, navigation, modal/drawer/sheet, cards/snippets и system icons должны быть sourced из BaseAI, если соответствующий building block существует. Локальными могут оставаться page-layout wrappers и подтверждённые gaps; каждый gap назвать до реализации. Незакрытый значимый блок останавливает зависимую часть работы.

Отдельно посчитай token coverage: semantic colors, typography, radii, effects и повторяемый spacing должны ссылаться на BaseAI CSS variables/classes. Совпавшие HEX, font-size или radius не считаются использованием токена. Не начинать код при неизвестном token source для системного элемента.

### 5. Верстка

Создай один HTML-файл с локальными `<style>` и `<script>`.

HTML должен:

- подключать `BaseAI/fonts.css` и `BaseAI/library.css`
- использовать относительные пути
- быть самодостаточным для локального открытия
- иметь реалистичный русский copy, если в Figma нет текста или текст неполный
- сохранять визуальные размеры, spacing, цвета, radii и плотность исходного фрейма
- адаптироваться минимум к исходному viewport; если экран web/touch, добавить базовый responsive behavior

CSS должен:

- использовать CSS variables из BaseAI, когда они есть
- не дублировать font-face и BaseAI runtime styles
- не переопределять BaseAI component internals без крайней необходимости
- использовать flex/grid по Auto Layout логике Figma
- использовать `position: absolute` только для overlay, точных декоративных слоев, sticky/fixed элементов или когда Figma-слой реально абсолютный

JS должен:

- быть маленьким и локальным
- включать только нужную кликабельность
- не добавлять framework
- поддерживать очевидные состояния: active tab, selected item, opened modal/drawer, accordion, switch/checkbox-like state, close/back actions

### 6. Иконки и assets

Иконки:

- не экспортируй из Figma
- ищи аналог в `BaseAI/icons/`
- если BaseAI-иконки нет, используй ближайший смысловой аналог или оставь текстовый action без иконки
- не используй emoji

Assets:

- фотографии, карты, иллюстрации и контентные изображения можно брать из Figma MCP asset export
- сохраняй assets рядом с прототипом или в понятной подпапке, если MCP это поддерживает
- не копируй BaseAI runtime-файлы в папку прототипа

### 7. Проверка качества

Перед показом проверь:

- файл открывается локально без критичных ошибок
- подключились `fonts.css` и `library.css`
- нет видимых нативных кнопок/инпутов/селектов вместо BaseAI-компонентов
- основные клики работают
- Figma-иконки не экспортированы и не используются как system icons
- для web-страниц фон viewport должен быть белым, без серых подложек, искусственных рамок, скругленных контейнеров вокруг всего Figma-фрейма или видимых границ макетной области; Figma-frame width — это координатная область, а не карточка на сером фоне
- визуальное отличие от screenshot не бросается в глаза: сетка, отступы, typography, surfaces, states, component density
- нет lorem ipsum, emoji и случайного generic SaaS UI
- у каждого значимого product block есть зафиксированный BaseAI source либо явно согласованный local gap
- component coverage и token coverage пересчитаны по фактическому DOM/CSS, а не по первоначальному плану

### 8. Playwright pixel-perfect gate

После создания файла обязательно проверь результат через Playwright либо доступный browser/computer-use инструмент с screenshot и кликами:

- открой HTML в браузере
- сделай screenshot фактической страницы
- сравни с Figma screenshot визуально по layout, typography, spacing, surfaces, component states и плотности
- проверь ключевые viewport-размеры исходного фрейма; для web/touch дополнительно проверь mobile/desktop, если релевантно
- прокликай основные интеракции и проверь состояния после кликов
- исправляй HTML/CSS/JS итеративно, пока грубые расхождения не устранены

Pixel-perfect критерий: пользователь с первого взгляда должен видеть тот же экран и тот же сценарный смысл, а не похожую страницу на тех же цветах.

Если инструмент не смог открыть файл, сделать screenshot или выполнить клики, остановись и явно сообщи, что pixel-perfect gate не пройден.

### 9. Показ в браузере

После создания HTML обязательно открой его в браузере:

```bash
open "path/to/prototype.html"
```

Если браузер открыть нельзя, явно скажи почему и дай команду открытия. Не называй результат pixel-perfect, если Playwright gate не пройден.

## Результат пользователю

В финале сообщи коротко:

- путь к HTML-файлу
- что открыто в браузере
- что проверено через Playwright и какие расхождения исправлены
- какие BaseAI источники использованы
- статусы Storybook/BaseAI/Base 2.0/live Figma и числа component/token coverage
- какие интеракции реализованы
- что не удалось проверить, если такое было

Не предлагай S3, commit, Arcadia, zip или обновление index.html, если пользователь отдельно этого не просил.

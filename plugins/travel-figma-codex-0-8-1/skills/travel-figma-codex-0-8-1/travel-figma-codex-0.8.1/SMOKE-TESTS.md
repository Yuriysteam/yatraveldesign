# Read-only smoke-tests

Запускать в новой задаче после установки. Для каждого кейса проверить выбранный маршрут и отсутствие незапрошенных изменений.

```text
$figma-workflow-router Определи маршрут для задачи: есть Figma-макеты, нужно исправить экраны и затем собрать спеку. Ничего не меняй; перечисли этапы, ведущие навыки и критерии завершения.
```

```text
$figma-workflow-router Мы начали со спеки в Figma, но теперь нужен локальный HTML-прототип. Ничего не создавай; объясни, как изменится оставшаяся часть маршрута и какие решения сохранятся.
```

```text
$figma-design-machine Проведи read-only аудит экрана: сценарий, состояния, DS provenance и границы изменений. Не меняй Figma.
```

```text
$figma-spec-builder Проведи read-only handoff-аудит спеки: сценарии, состояния, overlays, provenance и геометрия стрелок trigger → frame. Не меняй Figma.
```

```text
$yandex-travel-ux-writing Проверь только UX-текст экрана. Не меняй продуктовую логику или Figma; дай рекомендуемую версию и причины.
```

```text
$html-to-figma-spec Разбери структуру переданного HTML и составь read-only план переноса в Figma. Отдельно укажи статусы Base 2.0 snapshot, live Figma libraries, component coverage и token coverage. Не записывай результат.
```

```text
$figma-to-baseai Проверь готовность окружения для переноса конкретного Figma-фрейма в HTML: BaseAI integrity, живой Storybook, Base 2.0 snapshot, live Figma libraries, component/token coverage, Figma MCP и browser gate. Ничего не создавай.
```

# Readiness gate: Storybook, BaseAI и Figma-библиотеки

Читать перед Figma → HTML, HTML → Figma и любой работой, где качество зависит от доступности BaseAI, Storybook, Base 2.0, Organisms 2.0 или semantic tokens.

## Что именно считается готовностью

Не объединять разные уровни доказательств в одно «дизайн-система подключена»:

| Проверка | Что подтверждает | Что не подтверждает |
|---|---|---|
| `BaseAI snapshot` | Локальный runtime цел, читаются компоненты, snippets, icons и CSS tokens | Актуальность живого Storybook и соответствие конкретному Figma-компоненту |
| `Storybook live` | Живой индекс UI Kit доступен в текущей сессии | Что нужный компонент уже выбран и применён в прототипе |
| `Base 2.0 snapshot` | Известны датированные страницы, component-set keys и variant axes | Что master по-прежнему опубликован и доступен в target-файле |
| `Figma libraries live` | Конкретные masters, variables, styles и modes разрешаются сейчас | Что итоговые nodes действительно связаны с ними |
| `Component coverage` | Каждый значимый блок сопоставлен с конкретным source component | Корректность токенов и финального вида |
| `Token coverage` | Семантические цвета, текст, радиусы, эффекты и spacing связаны с runtime/Figma tokens | Компонентную структуру |

Статус `PASS` допустим только при фактической проверке в текущей задаче. Иначе использовать `SNAPSHOT_ONLY`, `GAP`, `FAIL` или `NOT_CHECKED`.

## Общий preflight

До первой генерации или записи составить короткую таблицу:

| Источник | Статус | Evidence | Дата/версия | Влияние |
|---|---|---|---|---|
| Figma source node и screenshot |  |  |  |  |
| BaseAI runtime integrity |  |  |  |  |
| Storybook live index |  |  |  |  |
| Base 2.0 snapshot |  |  |  |  |
| Base 2.0 live masters/variables |  |  |  |  |
| Organisms 2.0 live masters |  |  |  |  |
| Component coverage |  |  |  |  |
| Token coverage |  |  |  |  |
| Browser/Figma visual QA |  |  |  |  |

Не обязательно показывать таблицу пользователю целиком, но её статусы и blockers должны попасть в итог.

## Gate для Figma → HTML

До написания продуктовой разметки обязательны:

1. Figma node читается; получены metadata/design context и screenshot.
2. Локальный BaseAI runtime прошёл структурный preflight.
3. Живой Storybook проверен по `manifest.storybookIndex`. Если Node preflight не проходит из-за сети среды, повторить read-only проверку доступным browser/web-инструментом; непустой JSON index является evidence `LIVE`. Если источник недоступен обоими способами, продолжать по датированному snapshot можно только как `SNAPSHOT_ONLY`; назвать дату и получить явное согласие пользователя на degraded mode.
4. Для каждого крупного блока и интерактивного контрола выбран конкретный BaseAI snippet/component либо зафиксирован blocker. «Похожий div» не является соответствием.
5. Для каждого семантического цвета, текста, радиуса, эффекта и повторяемого spacing выбран существующий BaseAI token/class. Совпавший HEX или размер не считается token coverage.
6. Layout wrappers могут быть локальными. Видимые controls, modal/drawer/sheet, navigation, cards/snippets и системные icons нельзя собирать вручную при наличии библиотечного источника.

До кода вести карту `Figma node/component → BaseAI snippet/component → variant/state → tokens → evidence → status`. Незакрытый значимый блок останавливает зависимую часть генерации. Нельзя молча переходить к generic HTML/CSS.

## Gate для HTML → Figma

До первой записи продуктового UI обязательны:

1. Установлена фактическая provenance HTML: BaseAI/другая библиотека, точный component/snippet, modifiers, локальные overrides.
2. Локальная карта Base 2.0 и карта Organisms прочитаны и прошли структурный preflight.
3. В живой Figma разрешены masters для всех крупных блоков и интерактивных controls, а также используемые semantic variables/styles и modes.
4. Для каждого переносимого элемента заполнена карта `HTML source → Figma master/key → properties/slots → variables/styles → evidence → status`.
5. Первый репрезентативный экран после записи перечитан: корни являются linked `INSTANCE`, keys/properties верны, variables/styles связаны, а screenshot соответствует источнику.

Если master, variant, slot или variable не разрешается, не рисовать визуальную копию свободными слоями. Остановить зависимый блок, назвать gap и запросить решение только если без него нельзя продолжить.

## Coverage gate

Перед финальным QA вывести отдельно:

- `Component coverage`: количество значимых блоков всего / linked or sourced / local approved / unresolved.
- `Token coverage`: semantic bindings/classes / documented exceptions / unresolved literals.
- `Storybook`: `LIVE` или `SNAPSHOT_ONLY` с датой.
- `Figma libraries`: `LIVE_VERIFIED`, `PARTIAL` или `NOT_CHECKED`.

Нельзя называть результат основанным на дизайн-системе, если coverage не посчитан или unresolved значимые элементы скрыты общей фразой.


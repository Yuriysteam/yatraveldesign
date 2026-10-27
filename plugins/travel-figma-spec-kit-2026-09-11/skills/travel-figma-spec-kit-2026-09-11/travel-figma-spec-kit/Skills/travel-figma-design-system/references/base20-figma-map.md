# Base 2.0 — карта Figma для сборки продуктовых спек

> Снимок файла на 2026-08-21. Пройдено 57 из 57 страниц.  
> Источник: [Base 2.0](https://www.figma.com/design/nS3RFzW68XXRzFtw8OtRnL/Base-2.0?node-id=2049-7511) · file key `nS3RFzW68XXRzFtw8OtRnL`.

Эта карта нужна для сборки продуктовых спек в Figma: найти правильный мастер-компонент, выбрать состояния, понять границы дизайн-системы и не принять служебные или старые элементы за боевые. Для целых продуктовых паттернов сначала использовать [карту Organisms 2.0](./organisms20-figma-map.md), а Base 2.0 — как общий слой controls, tokens, typography, spacing и effects.

Подробный машинный индекс страниц, component set keys и variant axes лежит в [base20-figma-components.json](./base20-figma-components.json).

## Главное правило

1. Сначала искать подходящий целый опубликованный организм в Organisms 2.0.
2. Если целого организма нет, искать готовый опубликованный компонент Base 2.0.
3. Вставлять именно instance и настраивать его свойства, не копировать внешний вид вручную.
4. Локальный компонент делать только если в Organisms 2.0 и Base 2.0 нет подходящего паттерна или экрану нужен новый составной продуктовый блок.
5. Локальные компоненты спеки держать отдельно от экранов и явно помечать как local.
6. Для каждого сценария показывать только значимые состояния: normal, loading/skeleton, empty, error, disabled, success и крайние данные — по смыслу конкретного сценария.
7. Статусы на документационных страницах читать по платформам и секциям: одна страница может одновременно содержать «Готов», «В работе» и «На ревью».
8. Не брать новые решения из `Trash`, из секций «для прототипа», из явно устаревших блоков и со страницы `🛠️ Кандидаты в организмы от разработки`.

## Как выбирать состав спеки

У спеки нет универсального обязательного состава. Глубина зависит от риска, новизны и границ задачи. Базовый каркас — понятные сценарии, используемые экраны, значимые состояния, связи там, где без них нельзя понять путь, контакт и статус готовности. Остальные секции подключаются только если снимают реальную неоднозначность.

Сценарии удобно читать слева направо; состояния одного экрана — рядом. Local components, edge cases, правила поведения, темы и адаптивы выносятся отдельно лишь тогда, когда они влияют на реализацию. Системную клавиатуру, status bar и другое платформенное окружение брать со страницы `System`.

Подробный критерий достаточности и компоненты оформления из Organize: [figma-spec-sufficiency.md](../../figma-spec-builder/references/figma-spec-sufficiency.md).

Служебная страница `Template` содержит готовые элементы документации: `Status` со значениями «В работе», «Готов», «На ревью», «Не взят в работу», «Есть изменения», а также переключатель примеров Light/Dark. Это не продуктовые UI-компоненты.

### Как читать документацию компонента

Наполненные страницы обычно идут в одном порядке: карточки Design/iOS/Android/Web со статусом, ссылкой и ответственным → «Анатомия» → «Взаимодействие» → «Темизация» → «Контекст». Changelog, Review и прототипные заготовки лежат отдельно и не являются нормативом. В файле есть тёмное и светлое поколения шаблона, но логика у них одна.

Пустая строка или шаблонная памятка «не забыть skeleton/processing» не означает, что состояние действительно поддерживается. Подтверждением считается вариант в master, явное правило или показанный сценарий.

## Основы

| Страница | Page ID | Что внутри | Как использовать |
|---|---:|---|---|
| ◆ Principles | `12254:152444` | Layout, Colors, Typography, Effects, Blocks | Правила слоёв, фонов и компоновки. Для плоского layout указан `Background Secondary`. |
| ◆ Graphics | `142:1712` | Иконки, иллюстрации, Favorite, Trust, Plus, More, Uchouten Avatar, Loyalty Scene | Брать графику и DS-иконки отсюда; не перерисовывать вручную. |
| ◆ Constant | `104:2` | Типографика, цвета, тени, скругления | Визуальная документация базовых констант. |
| ◆ Colors temp | `30687:15773` | Таблицы App/Web-токенов | Справочник semantic colors; при конфликте ориентироваться на подключённые variables. |
| ◆ Animation & Haptic | `11615:1524` | Pull to refresh, Skeleton, Spinner, Haptic | Использовать для motion/haptic-спек; содержит Spinner и Haptic variants. |
| ❖ Text Area | `13832:20180` | TextArea, 45 вариантов | Dynamic on/off, Solid/Outlined, Empty/Filled/Hover/Focused/Disabled/Error/Skeleton, inverse. |

### Variables и styles

- 3 коллекции, 214 variables: `2. Base Colors` — 59, `1. Tokens` — 131, `Roundings` — 24.
- `1. Tokens` имеет Light/Dark; base colors скрыты от публикации, semantic tokens опубликованы.
- Основные группы токенов: base colors, accent, controls, constant, background, text & icons, padding, rating, shadow, promo.
- 45 text styles: Headline H0–H3 и Long, Title T1–T3 и Short, Body B1–B3, Caption C1–C3/Fat, Promo, Brand, Receipt.
- Шрифты: YS Display, YS Text, YS Text Cond.
- 13 effect styles и 3 gradient paint styles; grid styles отсутствуют.
- У `Roundings` единственный mode всё ещё называется `Mode 1` — техническое имя, не смысловой режим.
- Направленную тень `Shadow/Soft/S-both-themes-bottom` документация просит по возможности не использовать.

## Buttons

| Страница | Page ID | Боевые наборы | Ключевые оси |
|---|---:|---|---|
| ❖ Button 🟠 | `2049:7511` | `Button` 250, `RoundedButton` 250, `IconContainer` 5 | 10 types × 5 sizes × Default/Hover-Active/Disabled/Skeleton/Processing; текст, caption, left/right icons. |
| ❖ Button Group | `13832:64851` | `Button Group` 3 | Single, Horizontal, Vertical. Это spacing-container; внутри могут быть Button и IconButton. |
| ❖ Chips 🟠 | `2049:7521` | Два набора `Chips`: 40 и 32 | Type, 56/48/40/32, Default/Disabled, Checked; у одного набора есть text size. |
| ❖ More Button / Kebab | `36524:81542` | `More` 3 | Primary, Secondary, Transparent. |

## Input & selection

| Страница | Page ID | Боевые наборы | Ключевые оси |
|---|---:|---|---|
| ❖ Checkbox | `1949:2166` | `CheckboxSolid`, `CheckboxOutlined` | State, 18/22/28/32, one/multi-line, left/right alignment. |
| ❖ Dropdown | `2316:150` | `Dropdown`, `Dropdown chips`, `Select`, `Stroke` | Solid/Outline, 9 field states, 4 sizes, Select/Multiselect. Статус зависит от платформенной секции. |
| ❖ Input | `1993:202` | Solid, White Solid, Outlined, Transparent, Underlined | Empty/Filled/Hover/Focused/Disabled/Error/Skeleton; размерный ряд зависит от типа. |
| ❖ Radiobutton | `12254:52943` | Solid, Outlined | Та же логика размера, строки и выравнивания, что у Checkbox. |
| ❖ Range | `12272:54959` | `Range`, `Knob`, `Marks` | S/L, Default/Disabled/Skeleton; knob hover/pressed; 2–4 marks. |
| ❖ Segmented Control | `3171:22604` | `Segmented control` и внутренние Tab-наборы | 2–6 tabs, sizes, Plus, weight; Active/Default/Disabled/Blocked. |
| ❖ Stepper | `12272:38933` | `Stepper` 8 | Набор существует, но variant metadata повреждена — проверять экземпляр визуально перед использованием. |
| ❖ Suggest | `11203:93255` | `Intent` | 56/48/40/32, Default/Hover/Active/Disabled/Skeleton; title, caption, focus и right icon. |
| ❖ Switch | `12254:52944` | `Switch` | Black/Primary/Secondary, 22/28/32, Default/Hover-Active/Disabled/Readonly, Toggle. |

## Indication & status

| Страница | Page ID | Боевые наборы | Ключевые оси |
|---|---:|---|---|
| ❖ Badges 🟠 | `2049:7509` | PillBadge, Icon PillBadge, Discount Badge, product badges | У PillBadge: 20/24/28/32, type и tone. Для нового использования сверяться с FAQ PillBadge. |
| ❖ Informer | `2049:7519` | Новые vertical/horizontal/compact Informer и части Left/Middle/Right | Info/Warning/Success/Alert/Neutral и компоновка. Старые DesktopLight/MobileLight не выбирать. |
| ❖ Position Indicator | `13832:79487` | `Position Indicator` | 2/3/4 позиции и активная позиция 1–4. |
| ❖ Plus Points | `38778:52395` | `Plus Badge` | XS/S/M/L, также встречается опция SBP. |
| ❖ Rating | `13832:91184` | `Rating Badge`, `Right` | 18–40, Positive/Neutral/Monochrome, Icon/Text. |
| ❖ Spinner | `2052:7522` | `Spinner`, `.Notification` | Primary/Brand, 12–160. |

## Content display

| Страница | Page ID | Боевые наборы | Ключевые оси и ограничения |
|---|---:|---|---|
| ❖ Accordion | `13224:221621` | Нет локального component set | На странице примеры FAQ и changelog; готовый master в файле не найден. |
| ❖ Avatar | `13224:221622` | `Yandex Avatar`, `Avatar` | 20–80, Img/Empty/Text, Circle/Rectangular. |
| ❖ Notification Dot | `39937:9068` | `Notification dot` | 10/12/14/24, Red/Grey/Black, Counter yes/no. |
| ❖ Divider | `12672:47691` | `Divider` | Horizontal/Vertical, margin 0/16/20/24/28. |
| ❖ List item | `4316:20665` | `List item`, `SectionLeft`, `SectionRight` | S/M/L, themes, разные левые/правые секции. Часть документации помечена «в процессе обсуждения», есть устаревший дизайн. |
| ❖ Text+Icon | `13256:22670` | `Text + Icon` | XXL/XL/L/M/S, weight on/off. Не ориентироваться на безымянный `Component 6`. |
| ❖ Price | `32669:74433` | `Price`, `Discount` | Страница помечена `Freeze design – code ok`; metadata Price повреждена. Не развивать дизайн без отдельного решения. |

## Messaging

| Страница | Page ID | Боевые наборы | Ключевые оси |
|---|---:|---|---|
| ❖ Snackbar | `13224:221625` | `Snackbar` | 3 реальные комбинации Image/Horizontal; auto-hide 4500 ms, вход/выход 750 ms. App допускает swipe down; при открытой клавиатуре показ откладывается. |
| ❖ Toast | `2053:7524` | `Toast` | Positive, Neutral, Negative (в Figma `Negativ`); auto-hide 2500 ms, loading живёт до результата. Смена статуса — два последовательных toast, не morph. |
| ❖ Tooltip | `2053:7523` | `Tooltip`, `Tooltip-Promo` | S/M/L/XL = 220/300/375/430 px. Стороны tail — независимые boolean, поэтому оставлять ровно одну. Страница в работе; Promo и Tooltip-* task-specific, не ядро. |

## Navigation

| Страница | Page ID | Боевые наборы | Ключевые оси и ограничения |
|---|---:|---|---|
| ❖ Navigation Breadcrumbs | `13224:221623` | Локального component set нет | По сути только changelog; перед локальной сборкой проверить опубликованную библиотеку. |
| ❖ Tabs | `30190:17962` | `Tabitem` 96 | White/Black/Inverse, 56/48/40/32, Default/Hover/Active/Disable, horizontal/vertical. Наборы «Для прототипа» и «Табы прото» не считать DS API. Design готов, mobile на ревью, Web не взят. |
| ❖ Link | `12272:56893` | `Link` | Primary/Secondary, Default/Hover/Click/Disabled; focus — отдельное Desktop-правило, не variant State. Реализация по платформам ещё не готова. |
| ❖ Tab Bar Menu | `22259:11526` | `TabBar`, `Tab`, `NavBar` | 3/4 tabs; tab Default/Active/Disabled/Hover и dot; iOS/Android/Web navbar. Scope App/Touch. Тень нужна только над скроллируемым контентом. |

## Служебные и архивные страницы

| Страница | Page ID | Роль |
|---|---:|---|
| ❖ System | `5891:49799` | Platform chrome: keyboards, status/home/navbar/bottom bars и системные mock-компоненты. Использовать как оболочку ОС, не как продуктовую ДС; live-activity заготовки вне основной секции ненормативны. |
| Template | `8476:31036` | Шаблон документации компонента, служебные `Status`, owner/link/category blocks. Их можно ставить в документацию, но не внутрь экранов. |
| Trash | `14332:7100` | Архив старых решений, включая старые InformerDesktopLight/MobileLight. Не использовать в новой спеке. |
| Cover | `0:1` | Обложка файла. |
| Разделители и заголовки | несколько страниц | Навигационная структура файла; UI-компонентов не содержат. |

## Известные риски файла

- У component sets `Stepper`, `Price` и `Alphabetic Keyboard` есть ошибки variant metadata. Нужна визуальная проверка конкретного instance.
- На нескольких страницах в описании остался шаблонный текст про кнопку; его нельзя принимать за руководство к текущему компоненту.
- В `Informer` одновременно лежат новые и старые семейства. Использовать новые составные Informer; старые дополнительно лежат в `Trash`.
- Одинаковые имена не гарантируют один и тот же master: `More`, `Spinner`, `.Notification`, `Chips`, `Informer`, `Left/Middle/Right` и другие встречаются с разными keys. Выбирать по странице, component key и назначению; точные keys есть в JSON-индексе.
- В `Tabs` есть прототипные наборы с техническими variant names — они пригодны для демонстрации, но не как системный компонент.
- `Price` заморожен, `List item` частично обсуждается, `Accordion` и `Navigation Breadcrumbs` не имеют локального master set.
- Имена местами содержат опечатки и технические названия: `Negativ`, `InputTranceperent`, `Horisontal`, `Component 6`. При поиске учитывать фактическое имя в Figma.
- Статус нельзя назначать всей странице по одному бейджу: платформы и дизайн/код могут иметь разные статусы.

## Минимальный чек перед передачей спеки

- DS-компоненты — связанные instances подходящих утверждённых библиотек: сначала продуктовые Organisms, затем Base 2.0; иконки — из предусмотренного источника. Tokens/styles проверяются отдельно и не обязаны быть instances.
- У каждого сценария есть вход, действие, результат и переход к следующему экрану.
- Показаны только нужные состояния, включая ошибки и загрузку.
- Тексты и контент проверены на короткие, длинные, пустые и переполненные значения.
- Local components собраны отдельно и названы по роли, а не по внешнему виду.
- Никаких компонентов из `Trash` или «для прототипа» в боевом решении.
- Для спорных или повреждённых masters добавлена заметка разработчику.
- Если используются platform chrome или клавиатура, они взяты из `System`.

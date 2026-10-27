# Organisms 2.0 — карта Figma для продуктовых макетов

> Снимок файла на 2026-08-27. Изучены 21 рабочая страница; найдено 227 опубликованных assets на 20 страницах и отдельная нормативная страница motion.  
> Источник: [🌐 Organisms 2.0](https://www.figma.com/design/OllfhKgXnq748DUtPiPN0A/%F0%9F%8C%90-Organisms-2.0?m=auto) · file key `OllfhKgXnq748DUtPiPN0A`.

Страница `🛠️ Кандидаты в организмы от разработки` намеренно полностью исключена из аудита и запрещена как источник решений для будущих макетов.

Эта карта нужна до начала сборки продуктового экрана в Figma. Она помогает выбрать целый продуктовый организм до перехода к компонентам Base 2.0 и не принять внутреннюю запчасть, старый дубль или пример на холсте за готовый библиотечный контракт.

## Главное правило выбора

1. Сначала определить продукт, платформу, роль блока и нужное состояние.
2. Проверить, есть ли подходящий целый организм в этой карте.
3. Импортировать master по точному `assetKey`, затем настроить его properties на instance.
4. Не собирать заново Navbar, modal, sheet, map, snippet, card или upload из внутренних частей, если целый организм уже существует.
5. Внутренний контент организма собирать из актуальных instances Base 2.0 и семантических tokens.
6. Локальный master создавать только после проверки Organisms 2.0 и Base 2.0.
7. Если в файле одновременно есть old/new, дубли с одинаковым именем или техническое имя вроде `Component 1`, не угадывать: свериться с поколением в текущем продукте или задать вопрос.

### Как читать статус

- `CURRENT` — опубликованный asset совпадает с текущим master и подходит для нового применения.
- `CHANGED` — на холсте есть неопубликованные изменения; импорт по key может отличаться от видимого master. Нужна визуальная сверка.
- `UNPUBLISHED` — не считать библиотечным API и не использовать как основу нового макета.

У большинства assets пустые `description` и `documentationLinks`. Поэтому название и публикация сами по себе недостаточны: правила ниже восстановлены из master-секций, properties, анатомии и примеров на холсте.

## Покрытие страниц

| Страница | Основной результат аудита |
|---|---|
| `❖ Bars` | `Navbar Page`, `Navbar Sheet`; новый `FilterBar`. Старые Header/ToolBar — преимущественно внутреннее поколение. |
| `❖ Image block` | Целый мобильный верхний image-organism. |
| `❖ My trip` | Контейнер поездки, карточка поездки и состояния бронирований. |
| `❖ Modal View` | Desktop modal с размером, типом, выравниванием и scroll. Set и variants сейчас `UNPUBLISHED`, metadata повреждена; использовать как нормативный референс до публикации. |
| `❖ SidePanel [Extra only]` | Desktop/Extra drawer шириной 500 или 720. |
| `❖ Bottom Sheet` | Целый mobile sheet; `Middle` — его внутренняя контентная часть. |
| `❖ Fullscreen modal view` | Полноэкранная маркетинговая modal-коммуникация. |
| `❖ Cards` | Контентные, броневые, погодные, авиа-, отельные и коллекционные карточки. |
| `❖ Banners` | Banner и несколько самостоятельных travel-композиций. |
| `❖ Maps` | Актуальные составные `Map Desktop`/`Map Mobile` и их публичные map-parts. |
| `❖ Snippet` | Старое и новое поколения hotel snippets; для нового решения приоритет у `New`. |
| `↴ Процесс` | Текущий `ServiceSnippet` и следы миграции старых snippets. |
| `❖ Empty` | Только `Error frame`; универсального Empty master нет. |
| `❖ Bottom` | Нижняя mobile action-зона, default/sticky и разные виды содержимого. |
| `❖ Attention Sticker` | Sticker с техническими именами; самостоятельный и контекстный варианты. |
| `❖ LiveActivity` | iOS Live Activity, два theme-варианта. |
| `❖ Picker (Date & Period)` | Один рекомендуемый Calendar в секции `For designers`; рядом лежат старые дубли. |
| `❖ Helper` | Строка helper/validation и внутренняя точечная шкала. |
| `❖ Island` | Универсальная продуктовая обёртка со swap-контентом. |
| `❖ File upload` | Upload-trigger плюс состояния уже прикреплённых файлов. |
| `❖ Scale Animation` | Норматив motion; импортируемого организма нет. |

## Навигация, модалки и action-зоны

### Navbar Page

- Node `7599:22932`
- assetKey `95437a39f696e64853489f9db64937f579cead09`
- Назначение: верхняя панель полноценной mobile-страницы, включая status bar.
- `Type`: `Default | Big Title | Search | Blured Dark | Blured Light | Floating`.
- Booleans: `Subtitle`, `Scroll`, `Right Icon`, `Left Icon`, `Title`.
- Instance swaps: обычные, dark, light и floating action-секции.
- Высота зависит от типа: примерно `100`, `116` или `122` px.

Использовать вместо ручной сборки из `Header`, `ToolBar`, `SectionLeft`, `SectionRight` и отдельных actions.

### Navbar Sheet

- Node `7599:18016`
- assetKey `cbcbb7d1a5d5b9ed80a55de992bcc4eba165f7c8`
- Назначение: верхняя панель mobile Bottom Sheet.
- `Type`: `Empty | Default | Big Title`.
- Booleans: `Subtitle`, `Right Icon`, `Left Icon`, `Scroll`.
- Высота `72` px, у `Empty` — `32` px.

### FilterBar

- Новый set: node `7772:20000`, assetKey `e20afe3a2561489ba4314fe45fc0182311d83851`.
- `Hotel`: `Hotel | Avia | Train | Reviews`.
- Старый set `2850:225`, key `73774ecaded7ee9cddf51aea17c1b9f1020e4e19`, не выбирать для нового макета.

### Modal View — desktop

- Set node `8048:11776`
- assetKey `15ebc67def9a223c4d13d1eae87e75b774b4f692`
- Status `UNPUBLISHED` на 2026-08-27; set и его S-варианты не импортируются в другой файл как связанные instances.
- Фактические оси вариантов: `Type = Base | Onbording | Illustration | Icon`, `Size = S | M | L`, `State = Left | Center`, `Scroll = Off | On`.
- Размеры: S около `375×180`, M около `540×520`, L `540×700`, onboarding `720×500`.
- Анатомия: title, subtitle, close, content container, optional illustration, Button/Button Group.
- Допустимы 1–2 действия и вариант с back-navigation.
- Общий scroll предпочтительнее локального; локальный допустим, когда общий затруднён.

У set повреждена variant metadata. Ключи ниже нужны для идентификации вариантов и станут пригодны для импорта только после публикации master:

| Вариант | Component key |
|---|---|
| Base S Left | `f907cc615e517c511189ffeca768361f217b593a` |
| Base M Left | `f27165b45658300e893f21380ce131afe45cb1ff` |
| Base M Center | `010aa23e6f1097034038c48806f6b7663aead0c8` |
| Base L Left / Scroll Off | `1495ff4bd0c3ae777cf1057754953cc5736c702e` |
| Base L Left / Scroll On | `1e2ce45a867cb3d55d071320d2b230a70614ae3c` |
| Base L Center / Scroll On | `ca4cebd942e8ad88d0b608f6aa97ad66389709a8` |
| Base L Center | `55e9be9d6ca628597d725088915a2697fe6efc2d` |
| Onbording L | `d610ab1f66515bd9ee05c87db939988bf4e70ff4` |
| Illustration M | `da158b97fb4174f961b94ee7e9d876bbf71a3a9e` |
| Icon M | `df54521e80a2721330f939cd0248cfb936a5dd21` |

### Drawer — Extra/Desktop only

- Node `10099:18666`
- assetKey `a081812187ef13cfcc1d6329886d0ea25d99d4cd`
- `Property 1`: `L • 720 | M • 500`; `Subtitle` boolean.
- Анатомия: внешний Close/Back, H1, subtitle, content, нижний Button/Button Group с fade.
- 1–2 кнопки; общий scroll предпочтителен.
- Появление и скрытие: `350 ms`; численные координаты Bezier на канвасе не заданы.
- Фактическая ширина L-master — `720`, несмотря на пример текста «750 px».

### Modal View/Mobile — Bottom Sheet

- Node `8113:15028`
- assetKey `ee83050e8c07d52267288e3ccbc502589bd08177`
- Ширина `375` px, высота по контенту.
- Анатомия: `Navbar Sheet` → middle/content с padding `20` → `Bottom`.
- Для контента выше viewport предусмотрен scroll.
- В Экстранете для календаря возможен вариант без фонового overlay.
- Вложенный `Middle` (`6b1b0434289adbaa60d3e5789fe7b8b3162609d3`) — не замена целому sheet.

### Fullscreen Modal

- Node `17:1243`
- assetKey `59ac97a9b9b9a3730b2c059a23638854757355be`
- `Button bar`: `Yes | No`; `Background`: `Yes | No`.
- Все варианты `375×812`.
- Применение: короткая выразительная marketing-коммуникация с фото/видео.
- Title: желательно до `40`, максимум `60` символов; description — до `100`, максимум `120`.
- В background-версии допустимо больше текста; при переполнении появляются scroll и gradient.
- Если текст динамический или всё равно не помещается, использовать обычный Bottom Sheet.
- Не более трёх действий; закрытие close icon или swipe down.
- Изображение: до `3 MB`, минимум `1800×1200`, WebP/JPG, Fill; важные объекты держать вне crop-zone.

### Bottom

- Node `9221:110362`
- assetKey `a7539a7bfef3e504a92dcc23e034e9c583734818`
- `Type`: `Default | Sticky`.
- `View`: `Button Group | Button Group+Keyboard | Tags | Price+Buton | Clear`.
- Booleans: `Disclamer Top`, `Disclamer Bottom`.
- Поддерживает пустое состояние, 1–2 кнопки, вертикальную/горизонтальную группу, клавиатуру, цену с CTA, tags и disclaimers.
- Для спеки проверить skeleton и processing по смыслу задачи.

## Hero, поездки, карточки и баннеры

### Image block

- Node `637:16810`
- assetKey `27a91c700bd7446db85312618da4f9738ff25b24`
- `Type`: `One-city | Complex`; `Title`: `Default | Two-line`.
- Все варианты `375×368`.
- `Complex` добавляет subtitle и position indicator.
- Использовать целиком как верхний visual block; toolbar и indicator вручную не пересобирать.

### My trip

| Organism | assetKey | Основные properties | Роль |
|---|---|---|---|
| `MyTrip/Vidget-Reservation` | `e69de7b0f4f2f3e0e91304cf0f2f9c2d7ed150a8` | `Size=Full/Collapsed`, `Type=Hotel/Avia/Train/Bus`, 13 reservation states | Статус конкретного бронирования. |
| `MyTrip/Vidget` | `45329491adf55abd42a15cb3b018d628fc7bbef2` | amount, title lines, default/swipe | Контейнер одной или нескольких броней. |
| `MyTrip/Card` | `42958ee910a7335623f7dd73d017c08af004d4d9` | `State=Default/Status` | Общая карточка поездки. |

Отдельные длинные names конкретных variants (`MyTrip/.../Default`, `.../Canceled`) не импортировать, если доступен общий set.

### Основные Cards

| Organism | assetKey | Properties / назначение |
|---|---|---|
| `ContentCard` | `43fee3058c3139db3c5acb4f182f11a4ff6007e4` | `Size=220-Medium`, `Logo=Off/On`. |
| `Shortcut-Reservation` | `314d4f142957ab93e94af13d220b04f898f64c8b` | `Number=One/Two/Three/Max`, `Status=Off/On`. |
| `Forecast` | `22c464d9f1cb4dcc49e0e7e6eaa868f7b7cf5ec4` | `Days=Many/One`, `Accuracy=Accurate/Average`; status `CHANGED`. |
| `FlightCard` | `a6b23788e5c84ce8d24678fec66c6890b90bb52d` | `Towards=OneWay/TwoWays`, `Color=Light/Dark`. |
| `Hotel card` | `78b2c3531b306f8899010a3007f00e65fc82fea8` | `State=Defult/Add`, optional button. Фактическая опечатка `Defult`. |
| `Uchouten` | `293ee9a0463c036441057f661c1b7b8e959b1185` | `Big/Small/Card-Uchouten/Skeleton`. |
| `Recent Card` | `11a071291bd573fa426eb422aaaf2c77c18093c8` | Недавний объект. |
| `Collections Card` | `7564ade4ce6392b0efc06f60d9f3260c0660ebcd` | Карточка коллекции. |
| `Member` | `fd02823fb055acd8b80cb09e3a16da07049973da` | `Button/Image/No image`, optional owner; status `CHANGED`. |
| `Carousel card` | `9f3088b83b8008db3e5ac1652e42390e51fc9014` | `Default/Sale`. |

`CardBg` и отдельные экспортированные variants — основы/внутренние части, а не первый выбор для нового макета.

### Banners и связанные travel-композиции

| Organism | assetKey | Properties / роль |
|---|---|---|
| `Banner` | `1b6da028f0897399713dfad18089940794bb7105` | `Banner_main/Banner_artist/city/Promo/Flip`, optional badge и artists. |
| `Banner/Restaurant banner` | `e57df3aa8efcdac26e5fd18792e5291fedf004d5` | Ресторанный banner. |
| `Banner/Image block` | `0c6c22f33ce177bc462947cdf63b92916a1668df` | Banner-image composition. |
| `Banner new` | `4461a4c73acf66687f1a9a75e3847a3beb421b45` | Отдельное новое banner-решение; сверять контекст продукта. |
| `Card booking` | `20b580c3bf8bf7e224ef92fe3ea0ddcfc48f07d9` | Short/Long, One/More, Booking/Add, optional actions. |
| `Card Trip ` | `d665d04b11d997d3033aa2ce0b9a718921577c2c` | Long; One/More. В имени есть trailing space. |
| `Tabs navigation` | `e022b739e940e0440281cd7fb5c5c6a882db5f72` | Short/Long. |
| `Search` | `bc0ff1331b9561812f11f2738d76f0b8725a8099` | First/Default, Short/Long. |

`Text Block`, `Card_artist`, `Image`, `Header`, `Tab`, `Tabs`, `Tabbar Top` и дубли конкретной `Card booking/...` — внутренние части или технические композиции.

## Hotel snippets

Для нового решения предпочтительнее ветка `New`. При продолжении существующего сценария сохранять уже выбранное поколение, пока миграция не согласована.

| Organism | assetKey | Properties / статус |
|---|---|---|
| `Snippet Desktop New` | `399ae62f6fdd23c6f798c23c2141f5651a193c0e` | Default/Skeleton/State3 и offer-booleans; `CHANGED`. |
| `Snippet Mobile New` | `eb0c0dc83bdf27a02aef99a9ec213c1dd8db6b12` | Default/Skeleton, offer-booleans, button/badges; `CURRENT`. |
| `Object card` | `fb9b93c409e1d0f67d8e26d6e6e351b9ec1c61bc` | 10 технически названных types, Mobile/Desktop; `CHANGED`. |
| `Snippet shelf` | `7d367fb0a2b18a73c4c1a2ae4aed2300fab74fd7` | S/L, discount, skeleton; `CURRENT`. |
| `Offer` | `68abdc3127e8aeace273dee0af87f3f2afd8abad` | Apartments и offer-booleans; `CHANGED`. |
| `ServiceSnippet` | `d8d3f95141597ad8fa209868143d4b88091accf6` | `Event/Journal`; текущий set на странице процесса. |

Legacy sets: Desktop `35d8bea6b92fe8314d9e8c8700931bf03973bf46`, Mobile `144a7fcec32a12a884584fd7055fb4540f04bcfb`. Не смешивать old и new внутри одного сценария без явного решения.

## Maps

Для нового экрана начинать с составного организма:

- `Map Desktop` — node `5454:21842`, assetKey `ad41e8d28a5ee2d692726071bea34c57f227f5e8`.
- `Map Mobile` — node `5456:6192`, assetKey `4a5957ebe57d7465acf45d1ff06f6c98458666f7`.

Не собирать карту сначала из старых `Table list frame`, `Card object`, `Map-web` и старого `Pin`.

Публичные части актуального организма:

| Part | assetKey | Роль |
|---|---|---|
| `Hotel Pin` | `95fdee0cc6de05d2b331a47a1aec532f1951d656` | Близкий zoom; состояния viewed/booked/selected/default, base/premium. |
| `Hotel Dot` | `d1eee083d309175f040ff508137cde2ded348493` | Дальний zoom. |
| `Object Pin` | `ac76a66a820b1b671247253b04d085f211621c23` | Объектный pin. |
| `Hotel Map Snippet` | `1d077640c77896cdf13ff8479e78b1e86ff51ecc` | Карточка выбранного отеля на карте. |
| `RightControlBar` | `e8eb3a414137241db886e684f2bdacb07bafbbc7` | Desktop map controls, Light/Dark. |
| `PhotoPin` | `d516994e9c8123274b1d6b50aef4def2fc549501` | Pin с фото. |
| `ZoomButton` | `6159cbec02a129e2a807115a2a6373d9bf70a592` | Zoom-control. |
| `MyLocation` | `7acdcbe5f19fdb8e5b56a18b0f408e4ec6f5f82c` | Desktop location control. |
| `MyLocation Mobile` | `1ceb42a16786d501ffc8d4b31df13e942fbb921e` | Mobile location control. |

Если нужна только картографическая подложка: `Map` `4917902ac0826dfe0dbf586acb29ead8ab58afc4` и `Map Mobile` `f768528fe49aef22d1e53d311ae65b049deb3e64`, `Theme=Light/Dark`. В них нет готовых controls и карточек.

## Picker, upload и системные организмы

### Calendar — только For designers

- Node `9474:25994`
- assetKey `a6774dfeac2d832f1fe3418e93bbb2ab7fb59ec7`
- `Vertical`: `Hotel | Avia | Train | Bus | Tour`.
- `Where`: `SERP | Main page`.
- `Date`: `Two | One | Half | None`.
- Размер `540×432`.

Не использовать старые Calendar keys `c10a91086f6cf0336a1fe511dca920d1b807bffe` и `19b0dc434fdb8b218d098fe675fe23bfe4f9b893`. `Search/When` имеет ошибки set и `UNPUBLISHED`. Внутреннюю `Calendar cell` не размещать как самостоятельный организм.

### File upload + Attachments

- `File upload` — node `11198:26787`, assetKey `4cdbb32d0308bd5d8f27c434987f0f6f38978bdc`.
  - `Type=Button/Block`, `View=Solid/Outline`, `Size=M/S`, `Attachment=True/False`, `State=Default/Hover/Drag/Disabled`, caption boolean.
- `Attachments` — node `11254:643`, assetKey `47a5010c561f7c95a92c065cbf10cf61a4ed05a9`.
  - `Type=Attachment/Photo/Block`, `State=Default/Loading/Error`, optional file/image.

Использовать их как пару: первый отвечает за добавление, второй — за уже добавленные, загружаемые и ошибочные файлы.

- `Button`: загрузка второстепенна и стоит рядом с другими элементами.
- `Block M`: загрузка — единственный или важный элемент.
- `Block S`: второстепенная компактная загрузка.
- `Attachment=True`: добавление в уже существующий список.
- Drop-zone охватывает всю область хранения файлов.
- В error вся карточка кликабельна для повтора.
- Ограничения количества, формата и размера файла задаёт продукт, а не master.

### Live Activity

- Node `2252:1866`
- assetKey `f23999f825e196ceed317f13921992ca188e994f`
- `theme=dark | theme2`; не переименовывать `theme2` в `light` по догадке.
- Примеры `Minimal`, `Compact L`, `Expanded`, `Lock screen / Dark` — системный контекст iOS, не дополнительные variants master.

### Helper

- Целая строка `Subtitle`: node `8963:80845`, assetKey `1310a5c1f60948f2e6903509e33d1874b52bd21a`, `Type=Default/Danger/Error`.
- Внутренний индикатор `Helper`: key `680948561b630493e49d635a1703c7f2459af6d8`, `Count=Start/First/Second/Third`, `Type=Success/Danger/Error`.

Для обычной подсказки или validation использовать `Subtitle`; прямой `Helper` нужен только если текстовую строку формирует внешняя композиция.

### Island

- Node `15164:17284`
- assetKey `a80e003b972f996fe923450114c2ffc475291bcf`
- Status `CHANGED`.
- Booleans: `Title`, `Subtitle`, `Button`; `Instance` — content swap.
- Анатомия: title → content slot → button; gap `20`; padding `20/20/24/20`; radius `36`.
- Между соседними islands на странице — `8 px`.
- Если island упирается в край экрана, соответствующие углы можно не скруглять по показанному паттерну.

Импортировать wrapper `Island`; содержимое slot собирать из актуальных DS instances. Опубликованный `Container` и показанные `Map/List/Cards/List Items` — примеры anatomy, не замена wrapper.

### Error frame, не общий Empty

- Node `9332:149414`
- assetKey `c4d9b4411149057c3edd54fc405dcbb003c5e8fb`
- `335×172`, vertical gap `12`, padding `20`, radius `24`.

Это error-state. Универсального опубликованного Empty organism на странице нет.

### Attention Sticker

- Самостоятельный mobile sticker: `Component 1`, node `11943:46376`, assetKey `2610ad09a39566f3c2773ff3b4292618ef0b62a3`, `335×234`.
- Контекстная полноэкранная композиция: `Component 2`, key `512fa24627ca93055f739d651e1d5f16220bd439`, `375×694`.
- `Type`: `Горящее предложение | Осталось мало номеров | Цена только в приложении | Раннее бронирование`.

Из-за технических имён всегда сверять роль и размер, а не искать только по названию.

## Scale Animation

На странице нет опубликованного component set. Это правила motion, приоритетна master-секция `13625:10653`.

- S-scale: `0.97`, press `250 ms`, `cubic-bezier(0.2, 0, 0, 1)`.
- M-scale: `0.95`, те же duration/easing.
- L-scale: `0.94`, те же duration/easing.
- Release обычно возвращает `1.0` за `150 ms`.
- Карточки часто используют `0.96`; весь визуальный контент масштабируется вместе, layout footprint не меняется.
- Primary/secondary buttons меняют pressed-color.
- Icon buttons — M-scale; chips — S-scale и меняют checked/default после завершения.
- Stepper переиспользует Button/Chips motion.
- Avatar и Badge масштабируются целиком.
- Range knob использует отдельный scale `1.05`/`150 ms`; для части состояний используется spring.
- `AttentionSticker` двигается и масштабируется вместе с карточкой.

При расхождении со старым единичным примером ориентироваться на master-секцию, а не на случайный frame.

## Красные флаги

- Никогда не брать элементы со страницы `🛠️ Кандидаты в организмы от разработки`.
- Не выбирать опубликованный alias одного variant вместо общего set.
- Не использовать `CardBg`, `Container`, `Content`, `Image`, `Header`, `Middle`, `Helper`, map controls и аналогичные parts вместо целого организма без причины.
- Не смешивать legacy и new snippets.
- Не считать `Error frame` универсальным Empty.
- Не брать Calendar по совпадающему имени: правильный key только `a6774…`.
- Не трактовать `CHANGED` как совпадение опубликованного instance с master на холсте.
- Не переименовывать фактические variant values (`theme2`, `Defult`, `Onbording`, `Price+Buton`) во время автоматизированной настройки.
- Не копировать вручную Base 2.0 controls внутри организма: использовать связанные instances и tokens.

## Минимальный чек перед передачей макета

- Для каждого крупного блока проверен Organisms 2.0 до создания локального решения.
- Импортирован целый organism по правильному `assetKey`, а не визуальная копия или внутренний part.
- Выбраны фактические variant names и booleans.
- Для `CHANGED` сверена опубликованная версия с master на холсте.
- Внутри организма используются актуальные Base 2.0 instances, semantic color variables и text styles.
- Необоснованных detach нет.
- Legacy/new и platform-specific поколения не смешаны.
- Страница кандидатов не использована ни как источник, ни как визуальный референс.

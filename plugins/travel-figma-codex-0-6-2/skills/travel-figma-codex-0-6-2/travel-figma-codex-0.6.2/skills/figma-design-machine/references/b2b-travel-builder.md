# B2B Travel Interface Builder

## Источник

- Figma file key: `wDGeUOQKmETxzSGelLCTVr`
- Файл: `B2B Travel Interface Builder`
- Desktop baseframe: `17:2449`, 1440 px
- App baseframe: `17:7917`, 375 × 812

## Подключённые библиотеки

- `Travel.Styles`
- `Base 2.0`
- `🌐 Organisms 2.0`

## Проверенные компоненты

| Компонент | Key |
|---|---|
| Button | `e1353aa32102afbd0e8bc34deea0a1749ceac3d7` |
| Chips | `661f6a8f721223be80b07a367702164060cdbe31` |
| Dropdown | `28b4f8dfd6a6e18d0d96b5d81754ec07605a31ce` |
| PillBadge | `ca25c186239e6f8a399abbbc4745647d883f75f7` |
| Island | `a80e003b972f996fe923450114c2ffc475291bcf` |
| Desktop Sidebar | `29df4abc47dc7ddea40f625d2d74a2d0e86782db` |
| Desktop Header | `6344f870d539b77b69eeac230cab215759246023` |
| App Header | `bf07dd0119bff898433640e7eb29d8dec9668e95` |
| 24/Train | `a94a3ea09f7368c3b3fdf05a1261cec4ec64278f` |
| 96/Placeholder/Train | `388b13fe56f724d5ea42efaf981988fddd4c5525` |

## Проверенные токены

| Назначение | Key |
|---|---|
| background/primary | `943597f8aea8215dca069cf99f656c7f1fa31d89` |
| background/secondary | `f9fc4fe3e4d040b0314a29e97659a93abe090b50` |
| background/tertiary | `5a219d914082ec05aff74de6b3abab5f283a74ec` |
| background/line | `20c4bc3b5e713d7817ba84ada460a14b74d36b5a` |
| background/skeleton | `80db3bf8695de75231bf1b82ffd131911a3ce6c8` |
| text/primary | `dd157ad74d5d27c2d2af979ee2addea32e39c8e4` |
| text/secondary | `34ce7d6b3452e1a35589965ac79b8de240200e00` |
| radius/16 | `f6e3429da73675aa601b8c106c1b8d287dd0eb75` |
| padding/20 | `b747526bc9d1fc31be680ef8eca71ac0402c5c77` |
| padding/24 | `2995a068b60b7a6805a73fa78dda2888716bf269` |

## Типографика

- Desktop: `YS Text`, `YS Display`.
- App: `YS Text`; системный status bar приходит из готового компонента.
- Не пытаться загрузить `SF Pro Text`: доступная локальная семья может называться иначе. Не редактировать status bar без необходимости.

## Доставленные наборы

### Desktop · Поездки

- Основной экран: `24:3209`
- Empty: `31:529`
- Loading: `31:579`
- Error: `31:629`
- No results: `31:679`
- Partial data: `31:729`
- Object image fallback: `33:1524`
- Спека: `28:529`

### App · Ж/д выдача

- Сбалансированная: `49:1558`
- Цена сначала: `49:1567`
- Расписание сначала: `49:1576`
- Комфорт сначала: `49:1585`
- Error: `49:1594`
- Empty: `49:1603`
- Спека: `49:1612`

## Принятые решения

- Для desktop всегда создавать артборд шириной 1440 px.
- Для app наследовать 375 × 812 из baseframe.
- Сбалансированная ж/д карточка — рекомендуемая концепция первого запуска.
- Сортировка ж/д: «Подходящие» по умолчанию; вручную — дешевле, раньше отправление, раньше прибытие, меньше времени в пути.
- Фильтры: время отправления, класс, удобства, наличие мест.
- В карточке поезда обязательны номер, перевозчик, отправление, прибытие, вокзалы, время в пути, удобства, цены и места по плацкарту/купе/СВ, кнопка выбора.

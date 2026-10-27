---
name: yandex-calendar
version: v0.1
description: "Работает с корпоративным календарём Яндекса через Maya BFF API: показывает расписание, создаёт и обновляет встречи, ищет свободные слоты и переговорки, управляет задачами и праздниками."
---

# Календарь Яндекса

Работа с корпоративным календарём Яндекса через Maya BFF API.
20 инструментов: расписание, встречи, свободные слоты, пересечения,
переговорки, задачи, праздники, офисы.

## Когда использовать

- Посмотреть расписание на день/неделю (своё или чужое по логину)
- Создать одиночную встречу с участниками и переговоркой
- Найти свободные слоты для нескольких человек
- Найти пересечения расписаний (общие встречи и конфликты по времени)
- Поиск событий по тексту
- Управление задачами календаря (todos)
- Информация о праздниках и выходных
- Найти свободные переговорки

## Быстрые маршруты без лишних шагов

- Если пользователь просит **перенести всю регулярную серию** и одновременно
  поменять weekly-день/время и/или подобрать переговорки в офисах — первым
  вызовом используй `UpdateRecurringSeriesCompact`.
- В этом сценарии НЕ делай предварительные `GetEvent`, `GetEvents`, `SearchEvents`,
  `GetOffices`, `FindRooms` или `GetRoomsSchedule`: компактный helper сам читает
  мастер, выбирает первую свободную переговорку из `room_office_ids` и возвращает
  короткий summary или честную ошибку API.
- Если id тестовый/несуществующий, всё равно вызывай `UpdateRecurringSeriesCompact`
  с полным набором параметров и честно перескажи `event-not-found`; не заменяй
  это ручной диагностикой.

### Перенос серии «вперёд»: сохраняй прошлые исключения через `preserve_occurrence_dates`

Maya по умолчанию **удаляет все exception-вхождения**, если перезаписать
мастер с новым `start`/`repetition` (поведение задокументировано на
[wiki/calendar/public/kak-rabotajut-fichi/serii-sobytijj-v-kalendare](https://wiki.yandex-team.ru/calendar/public/kak-rabotajut-fichi/serii-sobytijj-v-kalendare),
проверено на реальном API: единственный exception на 2026-05-12 у одной
из живых серий пользователя был молча потерян).

Чтобы этого избежать, `UpdateRecurringSeriesCompact` поддерживает Maya-нативный
сплит серии через `applyToFuture=true` (тот же механизм, что CalDAV
"this and future"):

- передай `preserve_occurrence_dates: ["2026-05-12", ...]` — даты в MSK,
  которые должны остаться нетронутыми;
- helper находит первое вхождение **строго после** последней сохраняемой
  даты, читает его UTC `instanceStartTs` из `get-events-by-login`, и
  вызывает `do-update-event` с `applyToFuture=true` + `instanceStartTs=...`;
- Maya обрезает старую серию через `due_ts` ровно перед этой точкой и
  создаёт **новую** серию с переданным `start`/`end`/`repetition`. Все
  старые вхождения, включая exception, остаются в старой серии.

Если новый `start` позже текущего `start` мастера, helper **по умолчанию
отказывается** обновлять серию без `preserve_occurrence_dates`, чтобы
случайно не потерять старые вхождения. Чтобы явно принять старое поведение
master-rewrite (полное удаление старых вхождений), передай
`allow_drop_before_start: true`.

## Ограничения текущего Maya BFF

Проверено на реальном API:

- `CreateEvent` **всегда** использует route `create-event` в Maya BFF —
  это единственный route, который поддерживает `organizer`, `repetition`,
  `addZoomLink` и `conferenceUrl`. Старый `do-create-event` был строгим
  подмножеством и молча игнорировал `organizer`, поэтому заведение встреч
  от имени другого пользователя (например, через общий робо-токен) через
  него не работало
- Ответ Maya на `create-event` имеет форму
  `{"status":"ok","showEventId":<id>,"showDate":"...","endTs":"...",
  "externalIds":[...]}` — без полного объекта события; чтобы получить
  подробности, прочитай событие отдельно через `GetEvent(event_id=<showEventId>)`
- `UpdateEvent` умеет **менять организатора** существующей встречи:
  передай `organizer=<email>` — Maya перенесёт владение на указанный email
  (проверено на реальном API); специальной модели `change-organizer` у BFF нет
- `UpdateEvent` для серии: `recurring_scope:"occurrence"` — одно вхождение (часто exception);
  скилл распознаёт такие вхождения по `isRecurrence` / `mainEventId`, даже если
  `get-event` не вернул `repetition`; `recurring_scope:"series"` — **вся серия**
  (мастер): в BFF `do-update-event` **без** `instanceStartTs`, но с текущим
  `repetition` из мастера. Если отправить update мастера без `repetition`, Maya
  может заменить серию одиночным событием (проверено на реальном API)
- Для сложных правок серии (перенести weekly-день/время, подобрать переговорки
  в офисах и не тащить большой список событий в контекст) используй
  `UpdateRecurringSeriesCompact`: он читает мастер, опционально берёт первую
  свободную переговорку из каждого `room_office_ids`, вызывает безопасный
  series-update и возвращает краткий summary
- `DeleteEvent` для серии работает как **удаление всей серии**:
  нужен `recurring_scope:"series"`
- `CreateEvent` умеет автозаводить **Zoom** через route `create-event` с `add_zoom_link:true`
- Для удобства скилл также принимает алиас `zoom:true` и маппит его в `add_zoom_link:true`
- Подтверждено на реальном API для **одиночных** и **регулярных** встреч: после создания заполняется `conferenceUrl`
- `telemost` и `conferenceType` через текущий route Maya BFF пока не подтверждены и в скилле отключены
- Если нужна переговорка, используй `room` или добавляй ресурс-переговорку в участники

## Резолв логинов (ВАЖНО — ОБЯЗАТЕЛЬНО К ВЫПОЛНЕНИЮ)

Этот скилл **НЕ умеет искать людей по ФИО**. Все инструменты работают
только со staff-логинами (`login`, `logins`).

Если пользователь называет человека по ФИО — **сначала найди логин**
через скилл **"Yandex Staff"** (slug: `yandex-staff`).

**Алгоритм:**
1. Пользователь: «покажи расписание участника команды»
2. Найди логин через staff с узким PQL-фильтром, а не широким `query`, например:
   Используй доступный в текущем агенте инструмент поиска сотрудников и запроси только логин, имя и должность.
3. Используй найденный логин в Calendar: `GetPersonEvents --params '{"login":"laroleg"}'`

Если совпадений несколько:
- покажи короткий список кандидатов (`login`, имя, должность)
- попроси пользователя уточнить нужного человека
- не тащи полный профиль сотрудника, если достаточно краткого списка

**Инструменты, требующие staff-логин:**
`GetPersonEvents`, `FindFreeSlots`, `FindOverlaps`, `GetAvailabilities`, `CreateEvent` (attendees).

## Отображение свободных слотов (ВАЖНО)

При поиске свободных слотов (`FindFreeSlots`) **всегда** используй `work_days: 10`
(ближайшие 10 рабочих дней) если пользователь не указал другой период.

Главная цель ответа: он должен хорошо читаться как plain text в чате, CLI и
на мобильном экране. Группируй слоты по дням и объединяй смежные слоты в
непрерывные окна. Предпочтительный формат:

```
Свободные окна для: Участник А, Участник Б, Участник В.
Рабочие часы: 08:30-17:30. Слот: 30 мин.

Ср 11 мар: 08:30-12:00 (3.5ч)
Чт 12 мар: 08:30-13:30 (5ч); 15:00-17:00 (2ч)
Пт 13 мар: 08:30-11:00 (2.5ч); 13:00-13:30; 16:00-17:30 (1.5ч)
Сб 14 мар: выходной
Пн 16 мар: 08:30-11:00 (2.5ч); 14:00-15:00; 16:00-17:30 (1.5ч)
Вт 17 мар: 08:30-12:00 (3.5ч); 13:00-13:30; 14:30-15:00
 ...
```

Правила:
- Смежные 30-минутные слоты с одинаковой датой объединяй в одно окно
- Показывай длительность окна если >= 1 часа
- Дни с несколькими окнами разделяй `;` или коротким списком
- Выходные и праздники отмечай словами `выходной` или `праздник`
- Дни без свободных слотов отмечай как "нет окон"
- Не используй ASCII-таблицы, псевдографику, рамки и декоративные разделители
- Не используй code fences, если пользователь явно не попросил
- Не полагайся на Markdown-разметку для смысла ответа
- Если интерфейс поддерживает богатое форматирование, можно слегка улучшить
  читаемость, но базовый ответ всегда должен оставаться понятным как plain text

## Когда не использовать

- Для поиска сотрудников по ФИО — используй скилл **Yandex Staff** (slug: `yandex-staff`)
- Для работы с задачами трекера — используй yandex-tracker

## Авторизация

Скрипт читает OAuth-токен из env-переменной `YANDEX_CALENDAR_TOKEN`. При
отсутствии завершается с ненулевым exit code и печатает в stderr команды для
получения и установки — выполни одну из них (или покажи пользователю) и
повтори запрос.

## Запуск

```bash
python3 scripts/yandex_calendar_tool.py <ToolName> --params '{"key":"value"}'
python3 scripts/yandex_calendar_tool.py ListTools
```

## Инструменты

### Моё расписание
- `GetEvents` — Мои события за период (date, days, layer_id)
- `GetToday` — Моё расписание на сегодня
- `GetWeek` — Моё расписание на неделю (date)
- `GetEvent` — Детали события по ID (event_id)
- `SearchEvents` — Поиск событий по тексту (query)

### Чужое расписание
- `GetPersonEvents` — Расписание человека по staff-логину (login, date, days)

### Доступность и пересечения
- `GetAvailabilities` — Занятые интервалы людей (logins, date, days)
- `FindFreeSlots` — Свободные слоты для встречи (logins, date_from, date_to, duration_minutes). Также принимает: date/days для обратной совместимости, work_start, work_end. Автоматически: пропускает выходные/праздники, исключает прошедшее время, подтягивает рабочие часы из настроек
- `FindOverlaps` — Пересечения/общие встречи между людьми (logins, date_from, date_to). Также принимает: date/days для обратной совместимости

### Создание / Обновление / Удаление
- `CreateEvent` — Создать одиночную или регулярную встречу (name, start, end, attendees, organizer, room, description, location, notifications, repetition, add_zoom_link). Если передан `organizer`, встреча создаётся от его имени (route `create-event`)
- `UpdateEvent` — Обновить событие. Поддерживает `organizer=<email>` для передачи владения встречей. Для регулярной встречи: `recurring_scope:"occurrence"` — один инстанс (опционально `instance_start_ts`); `recurring_scope:"series"` — **вся серия** (участники, название, время и т.д. на мастере; `instance_start_ts` в запрос к BFF не передаётся). Дополнительно: `apply_to_future:true` + `instance_start_ts` (UTC) — Maya-нативный сплит серии (CalDAV THIS_AND_FUTURE): старая серия обрезается через `due_ts` ровно перед `instance_start_ts`, создаётся новая серия с переданным `repetition`
- `UpdateRecurringSeriesCompact` — Компактно обновить мастер регулярной серии: `event_id`, `start`, `end`, `weekly_days` или `repetition`, опционально `room_office_ids` и `room_capacity`; возвращает короткий summary вместо полного списка событий. Поддерживает `dry_run:true`. Для безопасного переноса серии вперёд с сохранением старых вхождений/исключений — `preserve_occurrence_dates:["YYYY-MM-DD"]` (helper переключается на Maya-нативный сплит через `applyToFuture`); чтобы оставить старое поведение «перезаписать мастер и потерять старые вхождения», передай `allow_drop_before_start:true`
- `DeleteEvent` — Удалить событие. Для регулярной встречи нужен `recurring_scope:"series"`; будет удалена вся серия

### Переговорки
- `FindRooms` — Свободные переговорки (start, end, capacity, office_id)
- `GetRoomsSchedule` — Расписание переговорок (resources, date)

### Прочее
- `GetLayers` — Слои (календари) пользователя
- `GetHolidays` — Праздники и выходные (date, days)
- `GetTodos` — Задачи из календаря
- `CreateTodo` — Создать задачу (title, due_date)
- `GetOffices` — Список офисов
- `GetSettings` — Настройки пользователя

## Офисы и алиасы

- Офис `Красная Роза` = `БЦ Морозов`, `office_id=1`
- Офис `БЦ Морозов` / `Морозов` = `office_id=1`
- Офис `М22` / `БЦ М22` = `office_id=2305`
- Если пользователь просит найти переговорку или встречу в офисе `Красная Роза`, используй офис `БЦ Морозов`
- Для известных офисов из этого списка НЕ вызывай `GetOffices`: сразу передавай
  соответствующий `office_id` / `room_office_ids`

## Поиск переговорок: семантика ответа FindRooms

- `FindRooms` возвращает структуру вида `{"resources": [...], "foundTotal": <int>, ...}`.
  **`resources` — это уже отфильтрованный сервером список свободных переговорок**
  в запрошенном слоте и офисе. `foundTotal` — общее число переговорок в офисе,
  подходящих по `capacity` (включая занятые). Это **не баг фильтра**.
- Если `resources` пуст, а `foundTotal > 0` — значит в запрошенном офисе на этот
  слот все переговорки заняты. Так и сообщай пользователю одним ответом и
  предложи альтернативу: соседний слот в том же офисе или соседний офис
  (например, Кампус). НЕ повторяй `FindRooms` без фильтра, НЕ грепай исходник
  скрипта, НЕ пытайся сам фильтровать выдачу — сервер уже это сделал.
- Типичный happy-path: ровно один `GetOffices` (если алиас офиса не известен
  заранее) плюс один `FindRooms`. Если нужно предложить соседний слот — ещё
  один-два `FindRooms`. Больше 3–4 вызовов на один пользовательский запрос —
  сигнал, что ты неверно трактуешь ответ API.

## Быстрые примеры

```bash
# Расписание на сегодня
python3 scripts/yandex_calendar_tool.py GetToday --params '{}'

# Расписание на неделю
python3 scripts/yandex_calendar_tool.py GetWeek --params '{}'

# События за 3 дня начиная с даты
python3 scripts/yandex_calendar_tool.py GetEvents --params '{"date":"2026-03-15","days":3}'

# Расписание другого человека (нужен staff-логин!)
python3 scripts/yandex_calendar_tool.py GetPersonEvents --params '{"login":"username","days":1}'

# Найти свободные слоты для 3 человек (60 мин, диапазон дат)
python3 scripts/yandex_calendar_tool.py FindFreeSlots --params '{
  "logins":["user1","user2","user3"],
  "date_from":"2026-03-10",
  "date_to":"2026-03-17",
  "duration_minutes":60
}'

# Пересечения расписаний двух людей (диапазон дат)
python3 scripts/yandex_calendar_tool.py FindOverlaps --params '{
  "logins":["user1","user2"],
  "date_from":"2026-03-10",
  "date_to":"2026-03-13"
}'

# Создать обычную встречу с участниками
python3 scripts/yandex_calendar_tool.py CreateEvent --params '{
  "name":"Синк по проекту",
  "start":"2026-03-11T14:00:00",
  "end":"2026-03-11T15:00:00",
  "attendees":["user1","user2"]
}'

# Создать встречу с переговоркой
python3 scripts/yandex_calendar_tool.py CreateEvent --params '{
  "name":"Синк в переговорке",
  "start":"2026-03-11T14:00:00",
  "end":"2026-03-11T15:00:00",
  "attendees":["user1","user2"],
  "room":"conf-room-42@yandex-team.ru"
}'

# Создать встречу с автозаведением Zoom
python3 scripts/yandex_calendar_tool.py CreateEvent --params '{
  "name":"Синк с Zoom",
  "start":"2026-03-11T14:00:00",
  "end":"2026-03-11T15:00:00",
  "attendees":["user1","user2"],
  "add_zoom_link":true
}'

# Создать еженедельную регулярную встречу
python3 scripts/yandex_calendar_tool.py CreateEvent --params '{
  "name":"Еженедельный синк",
  "start":"2026-03-16T14:00:00",
  "end":"2026-03-16T14:30:00",
  "attendees":["user1","user2"],
  "repetition":{
    "type":"weekly",
    "each":1,
    "weeklyDays":"mon"
  }
}'

# Создать регулярную встречу с Zoom
python3 scripts/yandex_calendar_tool.py CreateEvent --params '{
  "name":"Еженедельный синк с Zoom",
  "start":"2026-03-16T14:00:00",
  "end":"2026-03-16T14:30:00",
  "attendees":["user1","user2"],
  "add_zoom_link":true,
  "repetition":{
    "type":"weekly",
    "each":1,
    "weeklyDays":"mon"
  }
}'

# Изменить один инстанс регулярной встречи
python3 scripts/yandex_calendar_tool.py UpdateEvent --params '{
  "event_id":"12345",
  "name":"Разовый перенос названия",
  "recurring_scope":"occurrence"
}'

# Заменить участников у всей регулярной серии (без пересоздания встречи)
python3 scripts/yandex_calendar_tool.py UpdateEvent --params '{
  "event_id":"12345",
  "recurring_scope":"series",
  "attendees":["user1","user2"]
}'

# Компактно перенести weekly-серию и подобрать по одной переговорке в офисах
python3 scripts/yandex_calendar_tool.py UpdateRecurringSeriesCompact --params '{
  "event_id":"12345",
  "start":"2026-05-18T12:00:00",
  "end":"2026-05-18T12:55:00",
  "weekly_days":"mon",
  "room_office_ids":[1,2305],
  "room_capacity":2,
  "preserve_occurrence_dates":["2026-05-12"]
}'

# Перенести серию вперёд и явно разрешить потерю старых вхождений
# (legacy master-rewrite). Чаще нужен сплит выше через preserve_occurrence_dates.
python3 scripts/yandex_calendar_tool.py UpdateRecurringSeriesCompact --params '{
  "event_id":"12345",
  "start":"2026-05-18T12:00:00",
  "end":"2026-05-18T12:55:00",
  "weekly_days":"mon",
  "allow_drop_before_start":true
}'

# Перенести одно вхождение серии (указать дату/время начала этого инстанса)
python3 scripts/yandex_calendar_tool.py UpdateEvent --params '{
  "event_id":"12345",
  "recurring_scope":"occurrence",
  "instance_start_ts":"2026-04-06T12:00:00",
  "start":"2026-04-07T16:30:00",
  "end":"2026-04-07T17:30:00"
}'

# Удалить всю регулярную серию
python3 scripts/yandex_calendar_tool.py DeleteEvent --params '{
  "event_id":"12345",
  "recurring_scope":"series"
}'

# Найти свободные переговорки
python3 scripts/yandex_calendar_tool.py FindRooms --params '{
  "start":"2026-03-11T14:00:00",
  "end":"2026-03-11T15:00:00",
  "capacity":6
}'

# Поиск событий
python3 scripts/yandex_calendar_tool.py SearchEvents --params '{"query":"планирование"}'

# Праздники на 90 дней
python3 scripts/yandex_calendar_tool.py GetHolidays --params '{"days":90}'

# Создать задачу
python3 scripts/yandex_calendar_tool.py CreateTodo --params '{"title":"Подготовить презентацию","due_date":"2026-03-15"}'

# Удалить событие
python3 scripts/yandex_calendar_tool.py DeleteEvent --params '{"event_id":"12345"}'
```

## Формат вывода событий

Все инструменты возвращают события в унифицированном формате:
```json
{
  "id": 12345,
  "name": "Синк по проекту",
  "start": "2026-03-10T14:00:00",
  "end": "2026-03-10T15:00:00",
  "date": "2026-03-10",
  "time": "14:00-15:00",
  "is_all_day": false,
  "organizer": "Иванов Иван",
  "attendees_count": 3,
  "attendees": [{"email": "user@yandex-team.ru", "name": "...", "decision": "yes"}]
}
```

## Форматы данных

### Время
ISO 8601: `2026-03-10T14:00:00` (таймзона из настроек, по умолчанию Europe/Moscow)

### Участники
Staff-логины (автоматически дополняются до @yandex-team.ru) или полные email:
`["user1", "user2@yandex-team.ru"]`

### Переговорки
Email ресурса в параметре `room`: `"room":"conf-room-42@yandex-team.ru"`

### Повторяющиеся события
Создание серии поддерживается через `CreateEvent` с полем `repetition`.

- `CreateEvent` всегда использует route `create-event` (см. раздел
  «Ограничения текущего Maya BFF»); `do-create-event` в скилле больше
  не применяется
- Пример weekly:
  `{"type":"weekly","each":1,"weeklyDays":"mon"}`
- Можно передать `external_id`; если не передать, скилл сгенерирует уникальный сам
- `UpdateEvent` для серии: `recurring_scope:"occurrence"` — один инстанс (часто с исключением из серии);
  скилл считает регулярными и occurrence-объекты с `isRecurrence` / `mainEventId`,
  даже когда `repetition` отсутствует; `recurring_scope:"series"` — **вся серия**
  (в `do-update-event` не передаётся `instanceStartTs`, но обязательно
  сохраняется текущий `repetition`, иначе Maya может схлопнуть серию в одиночное событие)
- Для выбора **какого** инстанса править при `occurrence` передай `instance_start_ts` (начало вхождения в локальном ISO); иначе контекст берётся из `get-event` без него
- При `series` параметр `instance_start_ts` в скилле **игнорируется** при чтении события — всегда мастер серии
- `DeleteEvent` для серии поддержан только с `recurring_scope:"series"`:
  удаляется вся серия, а не один инстанс
- Если `recurring_scope` не передан, скилл намеренно завершится ошибкой, чтобы не сделать неожиданное действие

### Zoom / Telemost
Через `CreateEvent` поддержано автосоздание **Zoom-ссылки**.

- Передай `add_zoom_link:true`
- Для удобства можно передать `zoom:true` как алиас
- Поддержано для одиночных и регулярных встреч
- После создания ссылка появляется в `conferenceUrl`, а также дублируется в `description` / `descriptionHtml`
- `telemost` и `conferenceType` в скилле по-прежнему не поддерживаются
- `UpdateEvent` не умеет автодобавлять Zoom в уже существующее событие: это поддержано только в `CreateEvent`

## Переменные окружения

| Переменная | Описание | По умолчанию |
|-----------|----------|-------------|
| `YANDEX_CALENDAR_TOKEN` | OAuth-токен | — |
| `CALENDAR_BASE_URL` | Base URL Maya BFF | `https://calendar.yandex-team.ru` |
| `CALENDAR_TIMEZONE` | Таймзона | `Europe/Moscow` |
| `CALENDAR_LOCALE` | Локаль | `ru` |

## Installation

Этот скилл — директория с файлами `SKILL.md` и `scripts/`.
Для установки скопируй всю директорию в нужное место.

### Определи куда ставить

| Агент | Проверь существование | Куда ставить |
|-------|----------------------|-------------|
Распакуй пакет в папку скилов текущего агента. `SKILL.md` и `scripts/` должны остаться в одной директории `yandex-calendar/`.

### Шаги установки

1. Определи агента (проверь какие директории из таблицы выше существуют)
2. Скопируй директорию `yandex-calendar/` (содержащую этот SKILL.md + scripts/) в путь из таблицы
3. Из директории скилла проверь: `python3 scripts/yandex_calendar_tool.py ListTools`

### ВАЖНО: НЕ использовать

- `claude plugin install` — это другой механизм, скилл так НЕ ставится
- Не нужно создавать `plugin.json`, `package.json` или любые конфиг-файлы
- Установка = просто копирование директории в правильное место

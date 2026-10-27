# Fallback And Examples

## Fallback: Time And Dates

```bash
python3 - <<'PY'
from datetime import datetime, timedelta
now = datetime.now()
print(now.strftime('%H:%M'))
print(now.strftime('%Y-%m-%d'))
print((now + timedelta(days=1)).strftime('%Y-%m-%d'))
print(now.strftime('%A'))
PY
```

Сохрани результаты как:

- `NOW` - часы и минуты.
- `TODAY` - сегодняшняя дата.
- `TOMORROW` - завтрашняя дата.
- `DAYNAME` - день недели.

## Fallback: Tracker

Если startrek-client недоступен, используй CLI напрямую, подставив login и queues из профиля пользователя или короткого уточнения.

```bash
startrek-cli issues search "Queue: <queues> Assignee: <login> Status: Open, \"In Progress\"" --per-page 50 --json
startrek-cli issues search "Queue: <queues> Followers: <login> Updated: > now()-2d" --per-page 30 --json
startrek-cli issues search "Queue: <queues> Created By: <login> Updated: > now()-7d" --per-page 30 --json
```

## Fallback: Calendar

Используй yandex-calendar skill. Если нужно напрямую:

```bash
python3 <путь-к-скиллу-календаря>/scripts/yandex_calendar_tool.py GetToday --params '{}'
```

## Fallback: Mail

Используй mail-corp skill. Если нужно напрямую:

```bash
ya tool mcp connect "wss://mcp.yandex.net/ws?servers=mail_corp" \
  --tool get_v1_mail_folders_folder_id_envelopes \
  --arg 'path_parameters:{"folder_id":"1"}' \
  --arg 'query_parameters:{"limit":10,"offset":0}'
```

Текст письма запрашивай только если preview явно требует действия.

## Fallback: Wiki

Wiki не сканировать широко. Используй только ссылки, найденные в Tracker, письмах, сообщениях или локальном контексте.

## Morning Example

```md
# Daily - четверг 28 мая

## Что сделал

- Продвинул **[Правила согласования](https://st.yandex-team.ru/QUEUE-123)** - собрал последние договоренности и обновил сценарии для обсуждения.
- Разобрал входящие по тревел-политикам - выделил вопросы, которые требуют решения.

## Вопросы по сделанному

- По тревел-политикам нужно подтвердить, кто финально принимает решение по исключениям.
- По Ж/д остался открытый вопрос, где показываем ограничения: до выбора тарифа или после.

## Что делаю

- **[Ж/д билеты](https://st.yandex-team.ru/QUEUE-1830)** - собрать вопросы к прогону и проверить свежие комментарии.
- **[Правила согласования](https://st.yandex-team.ru/QUEUE-123)** - подготовить короткий вариант решения для синка.
- Ответить на входящие, где от меня ждут решения или подтверждения.

## Календарь на сегодня

- **10:30-11:00** [Daily](https://calendar.yandex-team.ru/event/101)
- **13:00-13:45** [Синк по Ж/д билетам](https://calendar.yandex-team.ru/event/102) - переговорка: Красная роза 3.12 - нужны вопросы по ограничениям и тарифам

## Письма и сообщения

- Mail: письмо по тревел-политикам касается текущей задачи и требует ответа.
- Tracker: новый комментарий в **[Правила согласования](https://st.yandex-team.ru/QUEUE-123)** от автора задачи.

## Задачи

- **[Ж/д билеты](https://st.yandex-team.ru/QUEUE-1830)**
  От меня ждут список вопросов к прогону. Контекст: спорный сценарий про ограничения и тарифы. Люди: продукт, команда Ж/д.
```

## Afternoon Example

```md
# Рабочая адженда - четверг 28 мая

## Календарь на сегодня

- **13:00-13:45** [Синк по Ж/д билетам](https://calendar.yandex-team.ru/event/202) - переговорка: Красная роза 3.12 - нужны вопросы по ограничениям и тарифам
- **16:00-16:30** [1:1](https://calendar.yandex-team.ru/event/203)

## Письма и сообщения

- Mail: письмо по тревел-политикам - вопрос касается текущей задачи.
- Tracker: комментарий в **[Правила согласования](https://st.yandex-team.ru/QUEUE-123)** требует ответа.

## Задачи

- **[Правила согласования](https://st.yandex-team.ru/QUEUE-123)**
  Я блокирую следующий шаг команды до подтверждения варианта решения. Контекст: сценарии нужно сверить с последними договоренностями. Люди: автор задачи, продукт.
```

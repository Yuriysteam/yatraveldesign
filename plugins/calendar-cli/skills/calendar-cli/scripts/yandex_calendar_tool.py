#!/usr/bin/env python3
"""Yandex Calendar Maya BFF tool — stdlib-only CLI.

Работа с корпоративным календарём Яндекса через Maya BFF API:
события, встречи, переговорки, свободные слоты, задачи, праздники.

No external Python dependencies required.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from datetime import timedelta
from datetime import timezone
from typing import Any
from urllib import error
from urllib import parse
from urllib import request

BASE_URL = os.getenv("CALENDAR_BASE_URL", "https://calendar.yandex-team.ru")
MAYA_ENDPOINT = "/api/models"
MAYA_TIMEZONE = os.getenv("CALENDAR_TIMEZONE", "Europe/Moscow")
MAYA_LOCALE = os.getenv("CALENDAR_LOCALE", "ru")
MSK = timezone(timedelta(hours=3))


class CalendarError(RuntimeError):
    pass


# OAuth-токен Maya BFF Calendar API. Скилл читает только из env (никаких
# файлов, ssh-grant, fetch-token внутри скилла — это всё делает пользователь
# по инструкциям из сообщения об ошибке ниже). Реализация stefania-style:
# самодостаточный скилл без зависимостей на общие папки.
TOKEN_ENV_VARS = ("YANDEX_CALENDAR_TOKEN",)


def resolve_token() -> str:
    """Резолв OAuth-токена из переменных окружения.

    Проверяет имена из :data:`TOKEN_ENV_VARS` по порядку, первое непустое
    значение возвращается. Если ни одна не задана, печатает в stderr
    краткую инструкцию по безопасной настройке окружения
    и завершает процесс с ненулевым exit code.
    """
    for name in TOKEN_ENV_VARS:
        value = os.environ.get(name, "").strip()
        if value:
            return value
    primary = TOKEN_ENV_VARS[0]
    sys.exit(f"""OAuth-токен Yandex Calendar не найден (нужен scope calendar:all,
иначе Maya BFF отвечает AUTH_UNKNOWN).

Получи токен с областью calendar:all через одобренный в компании способ
авторизации и передай его только в окружении текущего процесса:

  export {primary}=<вставь_токен_сюда>

Не записывай токен в Git, файлы скилла, журнал команд или чат.""")


# ══════════ Maya BFF HTTP client ══════════

class MayaHTTP:
    """HTTP-клиент для Maya BFF Calendar API."""

    def __init__(self, token: str, timeout: int = 30):
        self.token = token
        self.timeout = timeout

    def call(self, models: list[dict], model_query: str | None = None) -> list[dict]:
        url = f"{BASE_URL}{MAYA_ENDPOINT}"
        if model_query:
            url = f"{url}?_models={parse.quote(model_query)}"
        body = json.dumps({"models": models}).encode("utf-8")
        req = request.Request(url, data=body, method="POST", headers={
            "Authorization": f"OAuth {self.token}",
            "Content-Type": "application/json; charset=utf-8",
            "Accept": "application/json",
            "x-yandex-maya-timezone": MAYA_TIMEZONE,
            "x-yandex-maya-locale": MAYA_LOCALE,
        })
        try:
            with request.urlopen(req, timeout=self.timeout) as resp:
                raw = resp.read().decode("utf-8")
                if any(m in raw[:500] for m in ("<!DOCTYPE", "<html", "passport.yandex")):
                    raise CalendarError(
                        "OAuth токен невалиден — BFF вернул редирект на passport. "
                        "Обнови YANDEX_CALENDAR_TOKEN и повтори запрос."
                    )
                data = json.loads(raw) if raw.strip() else {}
        except error.HTTPError as e:
            body_text = e.read().decode("utf-8", errors="replace")
            raise CalendarError(f"HTTP {e.code}: {body_text[:500]}") from e

        result_models = data.get("models", [])
        for m in result_models:
            if m.get("status") == "error":
                err = m.get("error", {})
                if isinstance(err, str):
                    raise CalendarError(f"Maya: {err}")
                code = err.get("code", "UNKNOWN")
                msg = err.get("message", json.dumps(err, ensure_ascii=False))
                raise CalendarError(f"Maya [{code}]: {msg}")
        return result_models

    def call_one(self, name: str, params: dict | None = None,
                 model_query: str | None = None) -> Any:
        results = self.call([{"name": name, "params": params or {}}], model_query=model_query)
        return results[0].get("data", {}) if results else {}


# ══════════ Helpers ══════════

def _today() -> str:
    return datetime.now(MSK).strftime("%Y-%m-%d")


def _date_plus(date_str: str | None, days: int) -> str:
    base = datetime.strptime(date_str, "%Y-%m-%d") if date_str else datetime.now(MSK)
    return (base + timedelta(days=days)).strftime("%Y-%m-%d")


def _to_email(login: str) -> str:
    return login if "@" in login else f"{login}@yandex-team.ru"


def _norm_event(event: dict) -> dict:
    """Нормализовать событие в единый формат."""
    start = event.get("startTs") or event.get("start") or ""
    end = event.get("endTs") or event.get("end") or ""

    # attendees: dict (get-events) или list (get-events-by-login)
    att_raw = event.get("attendees", {})
    att = []
    if isinstance(att_raw, dict):
        for email, info in att_raw.items():
            att.append({"email": email, "name": info.get("name", ""), "decision": info.get("decision", "")})
    elif isinstance(att_raw, list):
        for info in att_raw:
            att.append({"email": info.get("email", ""), "name": info.get("name", ""), "decision": info.get("decision", "")})

    org = event.get("organizer", {})
    org_name = org.get("name", org.get("email", "")) if isinstance(org, dict) else str(org)

    result: dict[str, Any] = {
        "id": event.get("id"),
        "name": (event.get("name") or "").strip(),
        "start": start,
        "end": end,
        "date": start[:10] if start else "",
        "time": f"{start[11:16]}-{end[11:16]}" if start and end else "",
        "is_all_day": event.get("isAllDay", False),
        "organizer": org_name,
        "attendees_count": event.get("totalAttendees") or len(att),
    }

    if event.get("layerId") is not None:
        result["layer_id"] = event.get("layerId")

    loc = event.get("location", "")
    if loc:
        result["location"] = loc

    if att:
        result["attendees"] = att[:15]

    desc = (event.get("description") or "")[:300]
    if desc:
        result["description"] = desc

    if event.get("isRecurrence"):
        result["is_recurring"] = True

    return result


def _sort_events(events: list[dict]) -> list[dict]:
    return sorted(events, key=lambda e: e.get("startTs") or e.get("start") or "")


def _filter_dates(events: list[dict], date_from: str, date_to: str) -> list[dict]:
    filtered = []
    for e in events:
        start = e.get("startTs") or e.get("start") or ""
        if start and date_from <= start[:10] < date_to:
            filtered.append(e)
    return filtered


def _get_default_layer_id(http: MayaHTTP) -> int:
    data = http.call_one("get-user-layers")
    layers = data.get("layers", [])
    for l in layers:
        if l.get("isDefault"):
            return l["id"]
    return layers[0]["id"] if layers else 0


def _raise_user_settings_load_error(data: dict) -> None:
    email = (data.get("email") or "").strip()
    user_hint = f" для {email}" if email else ""
    raise CalendarError(
        "Календарь вернул неполные настройки пользователя"
        f"{user_hint} (`_failedToLoad: true`). "
        "Это похоже на временную ошибку Calendar API, а не на проблему с токеном. "
        "Повторите запрос позже."
    )


def _get_my_login(http: MayaHTTP) -> str:
    """Staff-login текущего пользователя (OAuth)."""
    data = http.call_one("get-user-settings")
    if data.get("_failedToLoad"):
        _raise_user_settings_load_error(data)
    login = (data.get("login") or "").strip()
    if not login:
        raise CalendarError("Не удалось получить login из get-user-settings")
    return login


# ══════════ Tools: My Events ══════════

def get_events(http: MayaHTTP, params: dict) -> Any:
    """Получить свои события за период.

    По умолчанию — все слои, как в UI занятости: get-events-by-login (включает
    «Личное», таймблоки и т.д.). Для одного слоя передайте layer_id (число).
    """
    date_from = params.get("date") or _today()
    days = int(params.get("days", 1))
    date_to = _date_plus(date_from, days)

    if "layer_id" in params and params.get("layer_id") is not None:
        layer_id = int(params["layer_id"])
        data = http.call_one("get-events", {
            "layerId": layer_id,
            "from": date_from,
            "to": date_to,
            "recurrenceAsOccurrence": True,
        })
    else:
        login = _get_my_login(http)
        data = http.call_one("get-events-by-login", {
            "login": login,
            "from": date_from,
            "to": date_to,
            "recurrenceAsOccurrence": True,
        })

    events = _filter_dates(data.get("events", []), date_from, date_to)
    return {
        "period": {"from": date_from, "to": date_to},
        "events_count": len(events),
        "events": [_norm_event(e) for e in _sort_events(events)],
    }


def get_today(http: MayaHTTP, params: dict) -> Any:
    """Расписание на сегодня."""
    return get_events(http, {"date": _today(), "days": 1, "layer_id": params.get("layer_id")})


def get_week(http: MayaHTTP, params: dict) -> Any:
    """Расписание на неделю."""
    return get_events(http, {"date": params.get("date") or _today(), "days": 7, "layer_id": params.get("layer_id")})


def get_event(http: MayaHTTP, params: dict) -> Any:
    """Детали события по ID."""
    event_id = params.get("event_id")
    if not event_id:
        raise CalendarError("Параметр 'event_id' обязателен")
    return http.call_one("get-event", {"eventId": event_id})


def search_events(http: MayaHTTP, params: dict) -> Any:
    """Поиск событий по тексту."""
    query = params.get("query", "").strip()
    if not query:
        raise CalendarError("Параметр 'query' обязателен")
    return http.call_one("search-events", {"search": query})


STAFF_HINT = (
    "Не знаете точный staff-логин? Используйте скилл «Yandex Staff» — "
    "он позволяет найти логин по ФИО сотрудника."
)


# ══════════ Tools: Other Person's Events ══════════

def get_person_events(http: MayaHTTP, params: dict) -> Any:
    """Расписание другого человека по staff-логину."""
    login = params.get("login", "").strip()
    if not login:
        raise CalendarError(f"Параметр 'login' обязателен (staff-логин). {STAFF_HINT}")

    date_from = params.get("date") or _today()
    days = int(params.get("days", 1))
    date_to = _date_plus(date_from, days)

    data = http.call_one("get-events-by-login", {
        "login": login,
        "from": date_from,
        "to": date_to,
    })

    events = _filter_dates(data.get("events", []), date_from, date_to)
    return {
        "login": login,
        "period": {"from": date_from, "to": date_to},
        "events_count": len(events),
        "events": [_norm_event(e) for e in _sort_events(events)],
    }


# ══════════ Tools: Availability & Free Slots ══════════

def get_availabilities(http: MayaHTTP, params: dict) -> Any:
    """Занятые интервалы пользователей (строится из событий).

    Если пользователь передаёт `date_to`, он считается **включительным** —
    события на сам date_to входят в результат (как в FindFreeSlots).
    """
    logins = params.get("logins", [])
    if not logins:
        raise CalendarError("Параметр 'logins' обязателен (массив логинов)")

    date_from = params.get("date") or _today()
    if params.get("date_to"):
        date_to_inclusive = params["date_to"]
        filter_to = _date_plus(date_to_inclusive, 1)
    else:
        filter_to = _date_plus(date_from, int(params.get("days", 1)))
        date_to_inclusive = _date_plus(filter_to, -1)
    date_to = filter_to

    result = []
    for login in logins:
        data = http.call_one("get-events-by-login", {
            "login": login, "from": date_from, "to": date_to,
        })
        events = _filter_dates(data.get("events", []), date_from, date_to)
        intervals = []
        for ev in events:
            if ev.get("isAllDay"):
                continue
            start_s = ev.get("startTs") or ev.get("start") or ""
            end_s = ev.get("endTs") or ev.get("end") or ""
            if start_s and end_s:
                intervals.append({
                    "start": start_s,
                    "end": end_s,
                    "time": f"{start_s[11:16]}-{end_s[11:16]}",
                    "name": ev.get("name", ""),
                })
        result.append({
            "login": login,
            "busy_count": len(intervals),
            "busy_intervals": sorted(intervals, key=lambda x: x["start"]),
        })

    return {
        "period": {"from": date_from, "to": date_to_inclusive},
        "persons": result,
    }


def _collect_busy_from_events(http: MayaHTTP, logins: list[str],
                              date_from: str, date_to: str) -> list[tuple[datetime, datetime]]:
    """Собрать занятые интервалы из событий каждого человека."""
    busy: list[tuple[datetime, datetime]] = []
    for login in logins:
        data = http.call_one("get-events-by-login", {
            "login": login, "from": date_from, "to": date_to,
        })
        for ev in _filter_dates(data.get("events", []), date_from, date_to):
            if ev.get("isAllDay"):
                continue
            start_s = ev.get("startTs") or ev.get("start") or ""
            end_s = ev.get("endTs") or ev.get("end") or ""
            if not start_s or not end_s:
                continue
            try:
                s = datetime.fromisoformat(start_s)
                e = datetime.fromisoformat(end_s)
                if s.tzinfo:
                    s = s.replace(tzinfo=None)
                if e.tzinfo:
                    e = e.replace(tzinfo=None)
                busy.append((s, e))
            except ValueError:
                continue
    busy.sort()
    return busy


def _get_my_work_hours(http: MayaHTTP) -> tuple[int, int, int, int]:
    """Получить рабочие часы из настроек пользователя. Возвращает (h_start, m_start, h_end, m_end)."""
    try:
        data = http.call_one("get-user-settings")
        ws = data.get("workHoursStart", "10:00")
        we = data.get("workHoursEnd", "19:00")
        hs, ms = int(ws.split(":")[0]), int(ws.split(":")[1])
        he, me = int(we.split(":")[0]), int(we.split(":")[1])
        return hs, ms, he, me
    except Exception:  # noqa: BLE001 - graceful fallback to defaults
        return 10, 0, 19, 0


def _get_non_working_dates(http: MayaHTTP, date_from: str, date_to: str) -> set[str]:
    """Получить множество нерабочих дат (выходные + праздники)."""
    data = http.call_one("get-holidays", {"from": date_from, "to": date_to})
    return {
        h["date"]
        for h in data.get("holidays", [])
        if h.get("date") and h.get("type") in {"holiday", "weekend"}
    }


def _collect_work_days(http: MayaHTTP, date_from: str, work_days: int = 0, date_to: str = "") -> list[str]:
    """Собрать рабочие дни, пропуская выходные/праздники.

    Режимы:
      - date_to задан: все рабочие дни в диапазоне [date_from, date_to] (оба конца
        включительно; date_from == date_to => один день).
      - иначе: N рабочих дней начиная с date_from.
    """
    if date_to:
        scan_to = _date_plus(date_to, 1)
    else:
        work_days = work_days or 1
        scan_to = _date_plus(date_from, work_days * 2)
    non_working = _get_non_working_dates(http, date_from, scan_to)
    result = []
    base = datetime.strptime(date_from, "%Y-%m-%d")
    end = datetime.strptime(scan_to, "%Y-%m-%d")
    offset = 0
    max_iter = (end - base).days if date_to else work_days * 3
    while offset < max_iter:
        d = (base + timedelta(days=offset)).strftime("%Y-%m-%d")
        if d not in non_working:
            result.append(d)
            if not date_to and len(result) >= work_days:
                break
        offset += 1
    return result


def find_free_slots(http: MayaHTTP, params: dict) -> Any:
    """Найти общие свободные слоты для нескольких человек."""
    logins = params.get("logins", [])
    if not logins:
        raise CalendarError("Параметр 'logins' обязателен (массив логинов)")

    date_from = params.get("date_from") or params.get("date") or _today()
    date_to = params.get("date_to", "")
    work_days_count = int(params.get("work_days", params.get("days", 5 if date_to else 1)))
    slot_min = int(params.get("duration_minutes", params.get("slot_minutes", 30)))

    # Рабочие часы: из параметров или из настроек календаря пользователя
    if "work_start" in params or "work_end" in params:
        wh_s = int(params.get("work_start", 10))
        wm_s = 0
        wh_e = int(params.get("work_end", 19))
        wm_e = 0
    else:
        wh_s, wm_s, wh_e, wm_e = _get_my_work_hours(http)

    # Собираем рабочие дни (пропуская выходные/праздники)
    work_dates = _collect_work_days(http, date_from, work_days_count, date_to)
    if not work_dates:
        return {"logins": logins, "free_slots_count": 0, "free_slots": []}

    date_to = _date_plus(work_dates[-1], 1)
    busy = _collect_busy_from_events(http, logins, date_from, date_to)

    # Текущее время (naive MSK) — слоты в прошлом не показываем
    now_naive = datetime.now(MSK).replace(tzinfo=None)

    free = []
    skipped_days: list[str] = []
    for d_str in work_dates:
        day = datetime.strptime(d_str, "%Y-%m-%d")
        ws = day.replace(hour=wh_s, minute=wm_s, second=0, tzinfo=None)
        we = day.replace(hour=wh_e, minute=wm_e, second=0, tzinfo=None)
        cursor = max(ws, now_naive) if day.date() == now_naive.date() else ws
        day_slots = []
        while cursor + timedelta(minutes=slot_min) <= we:
            slot_end = cursor + timedelta(minutes=slot_min)
            conflict = False
            for bs, be in busy:
                if cursor < be and slot_end > bs:
                    conflict = True
                    cursor = be
                    break
            if not conflict:
                day_slots.append({
                    "date": cursor.strftime("%Y-%m-%d"),
                    "start": cursor.strftime("%Y-%m-%dT%H:%M:%S"),
                    "end": slot_end.strftime("%Y-%m-%dT%H:%M:%S"),
                    "time": f"{cursor.strftime('%H:%M')}-{slot_end.strftime('%H:%M')}",
                })
                cursor = slot_end
        if day_slots:
            free.extend(day_slots)
        else:
            skipped_days.append(d_str)

    result: dict[str, Any] = {
        "logins": logins,
        "period": {"from": date_from, "to": date_to},
        "work_days": work_dates,
        "slot_minutes": slot_min,
        "work_hours": f"{wh_s:02d}:{wm_s:02d}-{wh_e:02d}:{wm_e:02d}",
        "free_slots_count": len(free),
        "free_slots": free[:50],
    }
    if skipped_days:
        result["no_free_slots_days"] = skipped_days
    return result


def find_overlaps(http: MayaHTTP, params: dict) -> Any:
    """Найти пересечения (общие встречи) между пользователями.

    Если пользователь передаёт `date_to`, он считается **включительным** —
    события на сам date_to входят в результат (как в FindFreeSlots).
    """
    logins = params.get("logins", [])
    if len(logins) < 2:
        raise CalendarError("Параметр 'logins' — минимум 2 логина")

    date_from = params.get("date_from") or params.get("date") or _today()
    if params.get("date_to"):
        date_to_inclusive = params["date_to"]
        date_to = _date_plus(date_to_inclusive, 1)
    else:
        date_to = _date_plus(date_from, int(params.get("days", 1)))
        date_to_inclusive = _date_plus(date_to, -1)

    # Загружаем события каждого человека
    all_events: dict[str, list[dict]] = {}
    for login in logins:
        data = http.call_one("get-events-by-login", {
            "login": login,
            "from": date_from,
            "to": date_to,
        })
        events = _filter_dates(data.get("events", []), date_from, date_to)
        all_events[login] = events

    # Ищем пересечения по event id
    event_ids_per_person: dict[str, set[int]] = {}
    event_by_id: dict[int, dict] = {}
    for login, events in all_events.items():
        ids = set()
        for e in events:
            eid = e.get("id")
            if eid:
                ids.add(eid)
                event_by_id[eid] = e
        event_ids_per_person[login] = ids

    # Находим id которые есть у всех
    common_ids = set.intersection(*event_ids_per_person.values()) if event_ids_per_person else set()

    # Также ищем пересечения по времени (разные id но overlapping intervals)
    time_overlaps = []
    person_list = list(all_events.keys())
    for i in range(len(person_list)):
        for j in range(i + 1, len(person_list)):
            p1, p2 = person_list[i], person_list[j]
            for e1 in all_events[p1]:
                s1 = e1.get("startTs") or e1.get("start") or ""
                e1_end = e1.get("endTs") or e1.get("end") or ""
                if not s1 or not e1_end:
                    continue
                for e2 in all_events[p2]:
                    if e1.get("id") and e1.get("id") == e2.get("id"):
                        continue  # уже в common_ids
                    s2 = e2.get("startTs") or e2.get("start") or ""
                    e2_end = e2.get("endTs") or e2.get("end") or ""
                    if not s2 or not e2_end:
                        continue
                    if s1 < e2_end and s2 < e1_end:
                        time_overlaps.append({
                            "persons": [p1, p2],
                            "event_1": {"id": e1.get("id"), "name": e1.get("name", ""), "time": f"{s1[11:16]}-{e1_end[11:16]}"},
                            "event_2": {"id": e2.get("id"), "name": e2.get("name", ""), "time": f"{s2[11:16]}-{e2_end[11:16]}"},
                            "overlap_start": max(s1, s2),
                            "overlap_end": min(e1_end, e2_end),
                        })

    shared = [_norm_event(event_by_id[eid]) for eid in sorted(common_ids) if eid in event_by_id]

    return {
        "logins": logins,
        "period": {"from": date_from, "to": date_to_inclusive},
        "events_per_person": {l: len(evts) for l, evts in all_events.items()},
        "shared_events_count": len(shared),
        "shared_events": shared,
        "time_overlaps_count": len(time_overlaps),
        "time_overlaps": time_overlaps[:20],
    }


# ══════════ Tools: Create / Update / Delete ══════════

def _ensure_supported_event_features(params: dict, action: str) -> None:
    """Fail fast for fields that current Maya BFF route does not support."""
    repetition_update_allowed = action == "UpdateEvent" and _get_recurring_scope(params) == "series"
    if (
        action != "CreateEvent"
        and params.get("repetition") not in (None, False)
        and not repetition_update_allowed
    ):
        raise CalendarError(
            f"{action}: поле `repetition` можно менять только через "
            "`UpdateEvent` с `recurring_scope=series`."
        )
    if action != "CreateEvent" and _wants_zoom_link(params):
        raise CalendarError(
            f"{action}: автосоздание Zoom-ссылки поддержано только в CreateEvent "
            "через route 'create-event'."
        )
    if params.get("telemost", False):
        raise CalendarError(
            f"{action}: создание Telemost-ссылки через текущий Maya BFF route не подтверждено. "
            "Поддержан только Zoom через `add_zoom_link:true`."
        )
    if params.get("conferenceType"):
        raise CalendarError(
            f"{action}: поле 'conferenceType' отключено в этом скилле, "
            "используйте `add_zoom_link:true`, если нужна Zoom-ссылка."
        )


def _wants_zoom_link(params: dict) -> bool:
    return bool(params.get("add_zoom_link", False) or params.get("zoom", False))


def _get_recurring_scope(params: dict) -> str:
    return str(params.get("recurring_scope", "")).strip().lower()


def _is_recurring_event_context(event: dict) -> bool:
    return bool(
        event.get("repetition")
        or event.get("isRecurrence")
        or event.get("mainEventId")
        or event.get("recurrenceId")
    )


def _attendee_emails(raw_attendees: Any) -> list[str]:
    emails: list[str] = []
    if isinstance(raw_attendees, dict):
        raw_iter = raw_attendees.keys()
    elif isinstance(raw_attendees, list):
        raw_iter = raw_attendees
    else:
        return emails

    for attendee in raw_iter:
        if isinstance(attendee, str):
            emails.append(_to_email(attendee))
        elif isinstance(attendee, dict):
            email = attendee.get("email")
            if email:
                emails.append(_to_email(email))
    return emails


def _as_list(value: Any) -> list[Any]:
    # Identity checks so that integer 0 is not treated as False (0 == False in
    # Python). `room_office_ids` is allowed to be a scalar like `1` or `2305`;
    # a hypothetical office_id=0 would otherwise be silently dropped.
    if value is None or value is False:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _event_resource_summaries(event: dict) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for item in event.get("resources") or []:
        resource = item.get("resource") if isinstance(item, dict) else None
        if not isinstance(resource, dict):
            continue
        email = resource.get("email")
        if not email:
            continue
        result.append({
            "name": resource.get("name", ""),
            "email": email,
            "office_id": item.get("officeId") or resource.get("officeId"),
        })
    return result


def _compact_event_for_update(event: dict) -> dict[str, Any]:
    start = event.get("startTs") or event.get("start") or ""
    end = event.get("endTs") or event.get("end") or ""
    result: dict[str, Any] = {
        "id": event.get("id"),
        "name": event.get("name", ""),
        "start": start,
        "end": end,
        "time": f"{start[11:16]}-{end[11:16]}" if start and end else "",
        "is_recurring": _is_recurring_event_context(event),
    }
    if event.get("mainEventId") is not None:
        result["main_event_id"] = event.get("mainEventId")
    if event.get("repetition"):
        result["repetition"] = event.get("repetition")
    if event.get("layerId") is not None:
        result["layer_id"] = event.get("layerId")
    resources = _event_resource_summaries(event)
    if resources:
        result["rooms"] = resources
    return result


def _compact_resource(resource: dict) -> dict[str, Any]:
    return {
        "name": resource.get("name", ""),
        "email": resource.get("email", ""),
        "office_id": resource.get("officeId"),
    }


def _compact_update_result(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {"raw_type": type(raw).__name__}
    result: dict[str, Any] = {}
    for key in ("status", "showEventId", "showDate", "endTs"):
        if key in raw:
            result[key] = raw[key]
    events = raw.get("events")
    if isinstance(events, list):
        result["events_count"] = len(events)
        result["event_ids"] = [e.get("id") for e in events[:10] if isinstance(e, dict) and e.get("id")]
    external_ids = raw.get("externalIds")
    if isinstance(external_ids, list):
        result["external_ids_count"] = len(external_ids)
    return result or {"keys": sorted(raw.keys())[:10]}


def _event_organizer_login(event: dict) -> str:
    organizer = event.get("organizer")
    if isinstance(organizer, dict):
        login = str(organizer.get("login") or "").strip()
        if login:
            return login
        email = str(organizer.get("email") or "").strip()
        if "@" in email:
            return email.split("@", 1)[0]
    return ""


def _event_attendee_set(event: dict) -> set[str]:
    return set(_attendee_emails(event.get("attendees")))


def _looks_like_same_series(reference: dict, candidate: dict) -> bool:
    if (reference.get("name") or "").strip() != (candidate.get("name") or "").strip():
        return False
    reference_attendees = _event_attendee_set(reference)
    candidate_attendees = _event_attendee_set(candidate)
    if reference_attendees and candidate_attendees:
        return bool(reference_attendees & candidate_attendees)
    return True


def _try_get_event(http: MayaHTTP, event_id: Any) -> tuple[dict | None, str | None]:
    try:
        return http.call_one("get-event", {"eventId": event_id}), None
    except CalendarError as exc:
        return None, str(exc)


def _resolve_updateable_series_master(
    http: MayaHTTP,
    *,
    input_event_id: Any,
    current: dict,
    params: dict,
) -> tuple[Any, dict, dict[str, Any]]:
    if current.get("repetition"):
        return input_event_id, current, {
            "strategy": "input_event_is_master",
            "input_event_id": input_event_id,
            "resolved_event_id": input_event_id,
        }

    if params.get("resolve_from_occurrence", True) is False:
        raise CalendarError(
            "UpdateRecurringSeriesCompact: нужен id мастера серии с полем "
            "`repetition`. Переданный id выглядит как одно вхождение."
        )

    attempts: list[dict[str, Any]] = []
    main_event_id = current.get("mainEventId")
    if main_event_id and str(main_event_id) != str(input_event_id):
        candidate, error_text = _try_get_event(http, main_event_id)
        attempts.append({
            "strategy": "mainEventId",
            "event_id": main_event_id,
            "ok": bool(candidate and candidate.get("repetition")),
            "error": error_text,
        })
        if candidate and candidate.get("repetition"):
            return main_event_id, candidate, {
                "strategy": "mainEventId",
                "input_event_id": input_event_id,
                "resolved_event_id": main_event_id,
                "attempts": attempts,
            }

    login = str(params.get("login") or "").strip() or _event_organizer_login(current)
    if not login:
        login = _get_my_login(http)
    current_start = current.get("startTs") or current.get("start") or _today()
    date_from = str(params.get("resolve_date") or current_start[:10])
    days = int(params.get("resolve_days", 60))
    data = http.call_one("get-events-by-login", {
        "login": login,
        "from": date_from,
        "to": _date_plus(date_from, days),
        "recurrenceAsOccurrence": True,
    })
    resolved: list[tuple[Any, dict]] = []
    seen_ids: set[str] = set()
    for event in data.get("events", []):
        if not isinstance(event, dict):
            continue
        candidate_id = event.get("id")
        if not candidate_id or str(candidate_id) == str(input_event_id) or str(candidate_id) in seen_ids:
            continue
        if not _looks_like_same_series(current, event):
            continue
        seen_ids.add(str(candidate_id))
        candidate, error_text = _try_get_event(http, candidate_id)
        attempts.append({
            "strategy": "same_name_attendees_scan",
            "event_id": candidate_id,
            "ok": bool(candidate and candidate.get("repetition")),
            "error": error_text,
        })
        if candidate and candidate.get("repetition"):
            resolved.append((candidate_id, candidate))

    if len(resolved) == 1:
        resolved_id, resolved_event = resolved[0]
        return resolved_id, resolved_event, {
            "strategy": "same_name_attendees_scan",
            "input_event_id": input_event_id,
            "resolved_event_id": resolved_id,
            "login": login,
            "date_from": date_from,
            "days": days,
            "attempts": attempts,
        }
    if len(resolved) > 1:
        raise CalendarError(
            "UpdateRecurringSeriesCompact: найдено несколько похожих мастеров серии: "
            + ", ".join(str(item[0]) for item in resolved)
        )
    raise CalendarError(
        "UpdateRecurringSeriesCompact: не удалось найти updateable master для "
        f"event_id={input_event_id}. Попытки: {json.dumps(attempts, ensure_ascii=False)}"
    )


def create_event(http: MayaHTTP, params: dict) -> Any:
    """Создать встречу.

    Всегда использует route `create-event`: это единственный route,
    который поддерживает `organizer`, `repetition`, `addZoomLink` и
    `conferenceUrl`. Старый `do-create-event` был строгим подмножеством
    и молча игнорировал `organizer`, поэтому заведение встреч от имени
    другого пользователя (например, через общий робо-токен) не работало.

    Формат ответа — как у `create-event` в Maya BFF:
        {"status": "ok", "showEventId": <id>, "showDate": "...",
         "endTs": "...", "externalIds": [...]}
    """
    name = params.get("name", "").strip()
    if not name:
        raise CalendarError("Параметр 'name' обязателен")
    start = params.get("start", "")
    end = params.get("end", "")
    if not start or not end:
        raise CalendarError("Параметры 'start' и 'end' обязательны (ISO 8601)")

    _ensure_supported_event_features(params, "CreateEvent")

    layer_id = params.get("layer_id") or _get_default_layer_id(http)
    attendees = [_to_email(a) if isinstance(a, str) else a.get("email", a) for a in params.get("attendees", [])]
    room = params.get("room")
    room_indexes = []
    if room:
        room_indexes.append(len(attendees))
        attendees.append(_to_email(room))

    organizer = params.get("organizer") or _to_email(_get_my_login(http))
    external_id = params.get("external_id")
    if not external_id:
        stamp = datetime.now(MSK).strftime("%Y%m%dT%H%M%S")
        external_id = f"calendar-skill-create-event-{stamp}@yandex-team.ru"

    create_event_payload: dict[str, Any] = {
        "name": name,
        "eventType": params.get("event_type", "user"),
        "description": params.get("description", ""),
        "descriptionHtml": params.get("description_html", ""),
        "locationHtml": params.get("location_html", ""),
        "attendees": attendees,
        "optionalAttendees": [
            _to_email(a) if isinstance(a, str) else a.get("email", a)
            for a in params.get("optional_attendees", [])
        ],
        "attachments": params.get("attachments", []),
        "availability": params.get("availability", "busy"),
        "participantsCanInvite": params.get("participants_can_invite", True),
        "isAllDay": params.get("is_all_day", False),
        "organizer": _to_email(organizer),
        "participantsCanEdit": params.get("participants_can_edit", True),
        "visibility": params.get("visibility", "everyone"),
        "layerId": layer_id,
        "start": start,
        "end": end,
        "tz": params.get("tz", MAYA_TIMEZONE),
        "externalId": external_id,
        "isAutofitOn": params.get("is_autofit_on", False),
        "_meta": {
            "instanceStartTs": params.get("instance_start_ts")
            or datetime.now(MSK).replace(tzinfo=None).isoformat(timespec="seconds"),
            "attendeesCount": len(attendees),
            "addedResourceIndexes": params.get("added_resource_indexes", room_indexes),
        },
        "eventData": params.get(
            "event_data",
            {
                "enableSummarization": False,
                "disallowSummarizationLearning": True,
                "hasAutoBooking": False,
            },
        ),
        "conferenceUrl": params.get("conference_url", ""),
        "addZoomLink": _wants_zoom_link(params),
        "marks": params.get("marks", {}),
        "notifications": params.get("notifications", []),
    }
    if params.get("repetition") not in (None, False):
        create_event_payload["repetition"] = params["repetition"]
    if params.get("location"):
        create_event_payload["location"] = params["location"]
    return http.call_one("create-event", create_event_payload, model_query="create-event")


def update_event(http: MayaHTTP, params: dict) -> Any:
    """Обновить событие.

    Сценарии:
    - `recurring_scope="occurrence"` — правка одного вхождения серии (создаст
      исключение); по умолчанию `instanceStartTs` берётся из `get-event`.
    - `recurring_scope="series"` — правка мастера серии; `instanceStartTs` в BFF
      не передаётся.
    - `apply_to_future=True` — Maya-native «правка от текущего вхождения и в
      будущее» (этот же флаг использует CalDAV/THIS_AND_FUTURE): старая серия
      обрезается через `due_ts` ровно перед `instance_start_ts`, а из тех же
      параметров создаётся НОВАЯ серия с переданным `repetition`. Все более
      ранние вхождения и их exception-исключения остаются в старой серии.
      Требует явного `instance_start_ts` в UTC (как Maya хранит — например
      `2026-09-15T12:00:00` для встречи 15:00 MSK).
    """
    event_id = params.get("event_id")
    if not event_id:
        raise CalendarError("Параметр 'event_id' обязателен")

    apply_to_future = bool(params.get("apply_to_future", False))
    _ensure_supported_event_features(params, "UpdateEvent")

    recurring_scope_param = _get_recurring_scope(params)
    raw_instance_start_ts = str(params.get("instance_start_ts", "")).strip()

    if apply_to_future:
        if not raw_instance_start_ts:
            raise CalendarError(
                "UpdateEvent: `apply_to_future=true` требует `instance_start_ts` "
                "в UTC (как Maya хранит instanceStartTs, например "
                "'2026-09-15T12:00:00' для встречи 15:00 MSK)."
            )

    # get-event: для правки всей серии (`recurring_scope=series`) всегда читаем мастер —
    # не передаём instanceStartTs в запрос, иначе BFF вернёт контекст вхождения.
    # Для одного вхождения (`occurrence`) или для apply_to_future-сплита можно
    # передать instance_start_ts, чтобы выбрать дату (как в списке событий / get-event).
    get_ev: dict[str, Any] = {"eventId": event_id}
    if raw_instance_start_ts and (recurring_scope_param != "series" or apply_to_future):
        get_ev["instanceStartTs"] = raw_instance_start_ts

    current = http.call_one("get-event", get_ev)
    ist = current.get("instanceStartTs", "")
    cur_start = current.get("startTs", "")
    cur_end = current.get("endTs", "")
    is_recurring_context = _is_recurring_event_context(current)

    if is_recurring_context:
        if not recurring_scope_param:
            raise CalendarError(
                "UpdateEvent: для регулярной встречи нужно явно указать "
                "`recurring_scope`: `occurrence` (одно вхождение, часто с исключением) "
                "или `series` (вся серия — правка мастера через do-update-event)."
            )
        if recurring_scope_param not in ("occurrence", "series"):
            raise CalendarError(
                f"UpdateEvent: неизвестный recurring_scope `{recurring_scope_param}`. "
                "Допустимы: occurrence, series."
            )
        if recurring_scope_param == "series" and not apply_to_future and not current.get("repetition"):
            raise CalendarError(
                "UpdateEvent: `recurring_scope=series` требует id мастера серии "
                "с полем `repetition`; текущий id выглядит как отдельное вхождение. "
                "Для изменения этого вхождения используйте `recurring_scope=occurrence`."
            )
    elif recurring_scope_param:
        raise CalendarError(
            "UpdateEvent: `recurring_scope` имеет смысл только для регулярного события."
        )

    if apply_to_future and recurring_scope_param != "series":
        raise CalendarError(
            "UpdateEvent: `apply_to_future=true` поддержано только при "
            "`recurring_scope=series` (Maya сплитит серию из мастера + "
            "instance_start_ts)."
        )

    ep: dict[str, Any] = {"id": event_id}
    # Maya BFF do-update-event: если не передавать instanceStartTs — обновляется мастер
    # серии (подтверждено: смена attendees на рекуррентном событии без instanceStartTs).
    # Для apply_to_future=true instanceStartTs обязателен (точка сплита).
    if apply_to_future:
        ep["instanceStartTs"] = raw_instance_start_ts or ist
        ep["applyToFuture"] = True
    elif recurring_scope_param != "series" and ist:
        ep["instanceStartTs"] = ist
    if recurring_scope_param == "series":
        # Maya treats a master update without the recurrence payload as a
        # replacement with a non-recurring event. Preserve the current rule
        # unless the caller explicitly asks to replace it. For apply_to_future
        # the new repetition belongs to the new series.
        ep["repetition"] = params.get("repetition") or current.get("repetition")
        if not ep["repetition"]:
            raise CalendarError(
                "UpdateEvent: для `recurring_scope=series` нужно либо передать "
                "`repetition`, либо id мастера с уже установленным правилом."
            )

    # start/end обязательны для BFF-модели
    ep["start"] = params.get("start", cur_start)
    ep["end"] = params.get("end", cur_end)

    for key in ("name", "description", "location", "availability",
                "notifications", "isAllDay"):
        if key in params:
            ep[key] = params[key]
    # Maya BFF `do-update-event` honors `organizer` on the master event and
    # transfers ownership to the given email (verified on live API). This is
    # the only way to re-assign organizer on an existing event through the
    # robot token — there is no dedicated `change-organizer` model.
    if params.get("organizer"):
        ep["organizer"] = _to_email(params["organizer"])
    if "attendees" in params or params.get("room"):
        attendees = params.get("attendees")
        if attendees is None:
            attendees = _attendee_emails(current.get("attendees"))
        emails = [_to_email(a) if isinstance(a, str) else a.get("email", a) for a in attendees]
        if params.get("room"):
            room_email = _to_email(params["room"])
            if room_email not in emails:
                emails.append(room_email)
        ep["attendees"] = emails
        optional_emails = _attendee_emails(current.get("optionalAttendees"))
        if optional_emails:
            ep["optionalAttendees"] = optional_emails

    # getParams — обязательный для do-update-event (используется для get-events после обновления)
    date_str = ep["start"][:10]
    ep["getParams"] = {"from": date_str, "to": _date_plus(date_str, 1)}

    return http.call_one("do-update-event", ep)


def update_recurring_series_compact(http: MayaHTTP, params: dict) -> Any:
    """Update a recurring master and return a compact, agent-friendly summary.

    This wraps the safe `UpdateEvent(recurring_scope=series)` path and performs
    common recurring-meeting chores in one tool call: optional recurrence-rule
    replacement, first-free-room selection per office, and small structured
    output instead of the full Maya event payload.

    Optional `preserve_occurrence_dates` switches the helper to a Maya-native
    series split via `applyToFuture=true`: the old series is truncated by
    `due_ts` just before the cutoff, and the new schedule is applied to a
    fresh series. Past occurrences (including exception-instances) survive
    untouched in the old series. Dates are accepted as `YYYY-MM-DD` (MSK).

    Optional `allow_drop_before_start=True` is required to silently move the
    series forward when the caller has *not* listed dates to preserve and the
    new `start` is later than the current master start. Without it the helper
    refuses, because that classic master-rewrite path drops every old
    occurrence/exception that no longer matches the new rule.
    """
    event_id = params.get("event_id")
    if not event_id:
        raise CalendarError("Параметр 'event_id' обязателен")

    current = http.call_one("get-event", {"eventId": event_id})
    resolved_event_id, current, resolution = _resolve_updateable_series_master(
        http,
        input_event_id=event_id,
        current=current,
        params=params,
    )

    start = params.get("start") or current.get("startTs")
    end = params.get("end") or current.get("endTs")
    if not start or not end:
        raise CalendarError("Параметры 'start' и 'end' не удалось определить")

    repetition = params.get("repetition")
    if not repetition and params.get("weekly_days"):
        repetition = dict(current.get("repetition") or {})
        repetition["weeklyDays"] = str(params["weekly_days"]).strip().lower()

    preserve_dates = _normalize_preserve_dates(params.get("preserve_occurrence_dates"))
    split_mode = bool(preserve_dates)
    cur_start_date = (current.get("startTs") or "")[:10]
    new_start_date = str(start)[:10]
    moves_later = bool(cur_start_date and new_start_date > cur_start_date)

    if not split_mode and moves_later and not params.get("allow_drop_before_start", False):
        raise CalendarError(
            "UpdateRecurringSeriesCompact: новый `start` "
            f"({new_start_date}) позже текущего ({cur_start_date}). Прямой "
            "перезапись мастера серии в Maya удаляет все ранее существовавшие "
            "вхождения (включая исключения). Передайте "
            "`preserve_occurrence_dates: [\"YYYY-MM-DD\", ...]`, чтобы Maya "
            "сделала нативный сплит (старая серия обрезается, новая стартует "
            "от первого вхождения после последней сохранённой даты), либо "
            "`allow_drop_before_start: true`, если потеря старых вхождений — "
            "это явное намерение."
        )

    explicit_rooms = [_to_email(str(room)) for room in _as_list(params.get("room") or params.get("rooms"))]
    selected_rooms: list[dict[str, Any]] = [
        {"email": email, "source": "explicit"}
        for email in explicit_rooms
    ]
    room_emails = list(explicit_rooms)

    for office_id in _as_list(params.get("room_office_ids") or params.get("office_ids")):
        room_params: dict[str, Any] = {"start": start, "end": end, "office_id": office_id}
        if params.get("room_capacity"):
            room_params["capacity"] = params["room_capacity"]
        rooms_data = find_rooms(http, room_params)
        resources = rooms_data.get("resources", []) if isinstance(rooms_data, dict) else []
        if not resources:
            raise CalendarError(
                "UpdateRecurringSeriesCompact: нет свободных переговорок "
                f"в офисе {office_id} на {start[0:10]} {start[11:16]}-{end[11:16]}"
            )
        chosen = resources[0]
        email = _to_email(chosen["email"])
        if email not in room_emails:
            room_emails.append(email)
        room_summary = _compact_resource(chosen)
        room_summary["source"] = "first_free_in_office"
        selected_rooms.append(room_summary)

    update_params: dict[str, Any] = {
        "event_id": resolved_event_id,
        "recurring_scope": "series",
        "start": start,
        "end": end,
    }
    if repetition:
        update_params["repetition"] = repetition
    for key in ("name", "description", "location", "availability", "notifications", "organizer"):
        if key in params:
            update_params[key] = params[key]

    if room_emails or "attendees" in params:
        if "attendees" in params:
            attendee_emails = [
                _to_email(a) if isinstance(a, str) else _to_email(a.get("email", a))
                for a in params.get("attendees", [])
            ]
        else:
            current_room_emails = {r["email"] for r in _event_resource_summaries(current)}
            attendee_emails = [
                email for email in _attendee_emails(current.get("attendees"))
                if email not in current_room_emails
            ]
        for email in room_emails:
            if email not in attendee_emails:
                attendee_emails.append(email)
        update_params["attendees"] = attendee_emails

    split_info: dict[str, Any] | None = None
    if split_mode:
        cutoff_date = _date_plus(max(preserve_dates), 1)
        cutoff = _find_first_occurrence_after(
            http,
            master_event=current,
            master_event_id=resolved_event_id,
            cutoff_date=cutoff_date,
            login=str(params.get("login") or "").strip()
            or _event_organizer_login(current),
        )
        update_params["apply_to_future"] = True
        update_params["instance_start_ts"] = cutoff["instance_start_ts_utc"]
        if not repetition:
            # apply_to_future writes a NEW series; without explicit repetition
            # the new series would inherit the master's old rule. Make this
            # explicit so callers always know what schedule the new series has.
            update_params["repetition"] = current.get("repetition") or {}
        split_info = {
            "preserve_dates": preserve_dates,
            "cutoff_date": cutoff_date,
            "cutoff_instance_start_ts_utc": cutoff["instance_start_ts_utc"],
            "first_preserved_in_old": cutoff.get("previous_occurrence"),
        }

    changed_fields = sorted(
        key for key in update_params
        if key not in {
            "event_id",
            "recurring_scope",
            "apply_to_future",
            "instance_start_ts",
        }
    )
    summary: dict[str, Any] = {
        "dry_run": bool(params.get("dry_run", False)),
        "resolution": resolution,
        "event": _compact_event_for_update(current),
        "update": {
            "event_id": resolved_event_id,
            "input_event_id": event_id,
            "scope": "series",
            "mode": "split" if split_mode else "master_rewrite",
            "start": start,
            "end": end,
            "repetition": update_params.get("repetition", current.get("repetition")),
            "changed_fields": changed_fields,
        },
    }
    if split_info is not None:
        summary["update"]["split"] = split_info
    if selected_rooms:
        summary["update"]["rooms"] = selected_rooms
    if update_params.get("attendees"):
        summary["update"]["attendees_count"] = len(update_params["attendees"])

    if params.get("dry_run", False):
        summary["updated"] = False
        return summary

    raw_result = update_event(http, update_params)
    summary["updated"] = True
    summary["result"] = _compact_update_result(raw_result)
    return summary


def _normalize_preserve_dates(raw: Any) -> list[str]:
    """Normalize ``preserve_occurrence_dates`` into a sorted unique list."""
    if not raw:
        return []
    items = raw if isinstance(raw, list) else [raw]
    out: list[str] = []
    for item in items:
        text = str(item).strip()
        if not text:
            continue
        date_part = text[:10]
        if len(date_part) != 10 or date_part[4] != "-" or date_part[7] != "-":
            raise CalendarError(
                "preserve_occurrence_dates: ожидаются даты YYYY-MM-DD (MSK), "
                f"получено: {item!r}"
            )
        if date_part not in out:
            out.append(date_part)
    out.sort()
    return out


def _find_first_occurrence_after(
    http: MayaHTTP,
    *,
    master_event: dict,
    master_event_id: Any,
    cutoff_date: str,
    login: str,
) -> dict[str, Any]:
    """Return the first occurrence of *master_event* on or after *cutoff_date*.

    Uses ``get-events-by-login`` so Maya expands the recurrence rule for us;
    that response provides ``instanceStartTs`` already in UTC. Filtering is by
    matching event id (occurrences share the master id when expanded) plus a
    safety check on name + attendees.
    """
    if not login:
        login = _get_my_login(http)
    date_to = _date_plus(cutoff_date, 60)
    data = http.call_one("get-events-by-login", {
        "login": login,
        "from": cutoff_date,
        "to": date_to,
        "recurrenceAsOccurrence": True,
    })
    events = data.get("events", []) if isinstance(data, dict) else []

    candidates: list[dict] = []
    for event in events:
        if not isinstance(event, dict):
            continue
        if str(event.get("id")) != str(master_event_id):
            if not _looks_like_same_series(master_event, event):
                continue
        start_iso = (event.get("start") or event.get("startTs") or "")[:10]
        if not start_iso or start_iso < cutoff_date:
            continue
        candidates.append(event)

    if not candidates:
        raise CalendarError(
            f"UpdateRecurringSeriesCompact: не найдено вхождение серии "
            f"{master_event_id} на дату >= {cutoff_date} в окне {cutoff_date}..{date_to}. "
            "Возможно, ни одна из preserve_occurrence_dates не сохраняется — "
            "проверьте, что они входят в текущее правило повторения."
        )

    candidates.sort(key=lambda e: (e.get("start") or e.get("startTs") or ""))
    cutoff = candidates[0]
    instance_start_ts = (
        cutoff.get("instanceStartTs")
        or cutoff.get("instanceStart")
        or ""
    )
    # `instanceStartTs` arrives as ``2026-09-15T12:00:00.000Z``; Maya BFF expects
    # the canonical naive UTC form ``2026-09-15T12:00:00`` for `do-update-event`.
    instance_start_ts_utc = instance_start_ts.replace("Z", "")
    if "." in instance_start_ts_utc:
        instance_start_ts_utc = instance_start_ts_utc.split(".", 1)[0]
    if not instance_start_ts_utc:
        raise CalendarError(
            "UpdateRecurringSeriesCompact: Maya вернула вхождение без "
            "`instanceStartTs`/`instanceStart`; невозможно определить точку сплита."
        )

    previous = None
    for event in events:
        start_iso = (event.get("start") or event.get("startTs") or "")[:10]
        if start_iso and start_iso < cutoff_date:
            if previous is None or start_iso > (previous.get("start") or previous.get("startTs") or "")[:10]:
                previous = event

    return {
        "instance_start_ts_utc": instance_start_ts_utc,
        "occurrence_id": cutoff.get("id"),
        "start": cutoff.get("start") or cutoff.get("startTs"),
        "previous_occurrence": (
            {
                "id": previous.get("id"),
                "start": previous.get("start") or previous.get("startTs"),
            }
            if previous
            else None
        ),
    }


def delete_event(http: MayaHTTP, params: dict) -> Any:
    """Удалить событие."""
    event_id = params.get("event_id")
    if not event_id:
        raise CalendarError("Параметр 'event_id' обязателен")
    current = http.call_one("get-event", {"eventId": event_id})
    if current.get("repetition"):
        recurring_scope = _get_recurring_scope(params)
        if not recurring_scope:
            raise CalendarError(
                "DeleteEvent: для регулярной встречи нужно явно указать "
                "`recurring_scope`. Поддержано только `series`: это удалит всю серию."
            )
        if recurring_scope != "series":
            raise CalendarError(
                "DeleteEvent: поддержан только `recurring_scope=series`. "
                "Удаление одного инстанса серии через API пока не подтверждено."
            )
    http.call_one("do-delete-event", {"id": event_id})
    return {"deleted": True, "event_id": event_id}


# ══════════ Tools: Rooms ══════════

def find_rooms(http: MayaHTTP, params: dict) -> Any:
    """Найти свободные переговорки."""
    start = params.get("start", "")
    end = params.get("end", "")
    if not start or not end:
        raise CalendarError("Параметры 'start' и 'end' обязательны")
    rp: dict[str, Any] = {"start": start, "end": end}
    if params.get("capacity"):
        rp["capacity"] = int(params["capacity"])
    if params.get("office_id"):
        rp["officeId"] = params["office_id"]
    return http.call_one("find-available-resources", rp)


def get_rooms_schedule(http: MayaHTTP, params: dict) -> Any:
    """Расписание переговорок."""
    resources = params.get("resources", [])
    if not resources:
        raise CalendarError("Параметр 'resources' обязателен")
    date_from = params.get("date") or _today()
    date_to = params.get("date_to") or _date_plus(date_from, 1)
    return http.call_one("get-resources-schedule", {
        "resources": resources, "from": date_from, "to": date_to,
    })


# ══════════ Tools: Layers, Holidays, Todos, Offices, People, Settings ══════════

def get_layers(http: MayaHTTP, params: dict) -> Any:
    """Слои (календари) пользователя."""
    data = http.call_one("get-user-layers")
    return {
        "layers": [{
            "id": l["id"], "name": l.get("name", ""), "type": l.get("type", ""),
            "color": l.get("color", ""), "is_default": l.get("isDefault", False),
            "perm": l.get("perm", ""),
            "owner": l.get("owner", {}).get("name", "(свой)") if l.get("owner") else "(свой)",
        } for l in data.get("layers", [])],
    }


def get_holidays(http: MayaHTTP, params: dict) -> Any:
    """Праздники и выходные."""
    date_from = params.get("date") or _today()
    date_to = params.get("date_to") or _date_plus(date_from, int(params.get("days", 90)))
    return http.call_one("get-holidays", {"from": date_from, "to": date_to})


def get_todos(http: MayaHTTP, params: dict) -> Any:
    """Задачи из календаря."""
    return http.call_one("get-todo-sidebar")


def create_todo(http: MayaHTTP, params: dict) -> Any:
    """Создать задачу."""
    title = params.get("title", "").strip()
    if not title:
        raise CalendarError("Параметр 'title' обязателен")
    tp: dict[str, Any] = {"title": title}
    if params.get("due_date"):
        tp["dueDate"] = params["due_date"]
    return http.call_one("do-create-todo-item", tp)


def get_offices(http: MayaHTTP, params: dict) -> Any:
    """Список офисов."""
    return http.call_one("get-offices")


def get_settings(http: MayaHTTP, params: dict) -> Any:
    """Настройки пользователя."""
    data = http.call_one("get-user-settings")
    if data.get("_failedToLoad"):
        _raise_user_settings_load_error(data)
    return data


# ══════════ Registry ══════════

TOOLS: dict[str, tuple[Any, str]] = {
    # My events
    "GetEvents": (get_events, "Мои события за период (date, days, layer_id)"),
    "GetToday": (get_today, "Моё расписание на сегодня"),
    "GetWeek": (get_week, "Моё расписание на неделю (date)"),
    "GetEvent": (get_event, "Детали события (event_id)"),
    "SearchEvents": (search_events, "Поиск событий (query)"),
    # Other person
    "GetPersonEvents": (get_person_events, "Расписание человека по логину (login, date, days)"),
    # Availability
    "GetAvailabilities": (get_availabilities, "Занятые интервалы людей (logins, date, days)"),
    "FindFreeSlots": (find_free_slots, "Свободные слоты для встречи (logins, date_from, date_to, duration_minutes)"),
    "FindOverlaps": (find_overlaps, "Пересечения/общие встречи между людьми (logins, date_from, date_to)"),
    # CRUD
    "CreateEvent": (create_event, "Создать встречу или серию (name, start, end, attendees, room, repetition)"),
    "UpdateEvent": (
        update_event,
        "Обновить событие; для серии: recurring_scope=occurrence (один инстанс, "
        "опционально instance_start_ts — ISO начала вхождения) или "
        "recurring_scope=series (вся серия; instanceStartTs не уходит в BFF).",
    ),
    "UpdateRecurringSeriesCompact": (
        update_recurring_series_compact,
        "Компактно обновить мастер регулярной серии: время, repetition, переговорки "
        "через первый свободный room_office_ids; возвращает краткий summary.",
    ),
    "DeleteEvent": (delete_event, "Удалить событие; для серии нужен recurring_scope=series"),
    # Rooms
    "FindRooms": (find_rooms, "Свободные переговорки (start, end, capacity, office_id)"),
    "GetRoomsSchedule": (get_rooms_schedule, "Расписание переговорок (resources, date)"),
    # Other
    "GetLayers": (get_layers, "Слои (календари) пользователя"),
    "GetHolidays": (get_holidays, "Праздники и выходные (date, days)"),
    "GetTodos": (get_todos, "Задачи из календаря"),
    "CreateTodo": (create_todo, "Создать задачу (title, due_date)"),
    "GetOffices": (get_offices, "Список офисов"),
    "GetSettings": (get_settings, "Настройки пользователя"),
}


def list_tools() -> dict:
    return {"tools": [{"name": n, "description": d} for n, (_, d) in TOOLS.items()]}


# ══════════ Main ══════════

def main() -> None:
    parser = argparse.ArgumentParser(description="Yandex Calendar Maya BFF CLI")
    parser.add_argument("tool", help="Tool name (e.g. GetToday, ListTools)")
    parser.add_argument("--params", default="{}", help="JSON params string")
    parser.add_argument("--params-file", help="Path to JSON params file")
    args = parser.parse_args()

    if args.tool == "ListTools":
        print(json.dumps(list_tools(), ensure_ascii=False, indent=2))
        return

    if args.tool not in TOOLS:
        print(json.dumps(
            {"error": f"Unknown tool: {args.tool}", "available": list(TOOLS.keys())},
            ensure_ascii=False, indent=2,
        ), file=sys.stderr)
        sys.exit(1)

    if args.params_file:
        with open(args.params_file, encoding="utf-8") as f:
            params = json.load(f)
    else:
        params = json.loads(args.params)

    # resolve_token() сам делает sys.exit с инструкцией при отсутствии токена,
    # дополнительный try/except не нужен.
    token = resolve_token()

    http = MayaHTTP(token)
    func, _ = TOOLS[args.tool]
    try:
        result = func(http, params)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except CalendarError as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

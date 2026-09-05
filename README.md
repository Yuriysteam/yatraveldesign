# YA Travel Design

Telegram-бот `@yatraveldesign_bot` публикует ZIP-прототипы в этот репозиторий и выдаёт команде каталог versioned skills. GitHub Pages публикует корень ветки `main`.

## Что делает меню

- **Опубликовать прототип** — принимает ZIP со статическим HTML, проверяет архив, добавляет его в каталог и публикует по пути `prototypes/<telegram-id>/<имя-архива>/`.
- **Skills** — показывает каталог с описанием, датой и кнопкой скачивания. Точка перед названием означает, что skill менялся после прошлого просмотра.
- **Загрузить skill** — доступна Telegram ID из `ALLOWED_USER_IDS`; принимает ZIP или `SKILL.md`. Одинаковое поле `name` обновляет существующий skill, а не создаёт дубликат.

## Первый запуск

1. В GitHub: **Settings → Pages → Build and deployment → GitHub Actions**.
2. На домашнем Mac бот использует существующий SSH-доступ этого Mac к GitHub. Отдельный GitHub token не нужен; deploy key можно добавить позднее, если доступ нужно ограничить одним репозиторием.
3. Telegram token хранится в macOS Keychain под service name `yatraveldesign-bot-token`, вне Git. Шаблон `launchd/com.yuriysteam.yatraveldesign-bot.plist` запускает бота при входе в macOS.
4. Укажите `PUBLIC_BASE_URL`: URL GitHub Pages или собственный домен.

## Границы

- Максимальный ZIP — 20 МБ, после распаковки — 100 МБ и до 2 000 файлов.
- Бот хранит локально только служебную SQLite-базу с обработанными Telegram updates и незавершёнными загрузками; skills и прототипы остаются в GitHub.
- Skills не выводятся на странице прототипов, но ZIP каждого skill публично доступен по прямой ссылке GitHub. Git хранит историю обновлений.

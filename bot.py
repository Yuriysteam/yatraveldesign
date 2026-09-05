#!/usr/bin/env python3
"""Telegram front end for publishing static prototypes and sharing versioned skills.

The bot keeps no library checkout. It writes authorised uploads straight into the
configured GitHub repository through the Git Database REST API; GitHub Pages
publishes the `public/` directory after each prototype commit.
"""
import io
import json
import os
import re
import sqlite3
import subprocess
import time
import urllib.error
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import PurePosixPath

MAX_UPLOAD_BYTES = 20 * 1024 * 1024
MAX_UNPACKED_BYTES = 100 * 1024 * 1024
MAX_ARCHIVE_FILES = 2_000
MAIN_KEYBOARD = {"keyboard": [[{"text": "Опубликовать прототип"}, {"text": "Skills"}]], "resize_keyboard": True}


class UserError(Exception):
    pass


class GithubError(Exception):
    pass


def config(name, default=None):
    value = os.environ.get(name, default)
    if value in (None, ""):
        raise RuntimeError(f"Не задана переменная окружения {name}.")
    return value


def slugify(value):
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")[:80]


def safe_zip_members(raw):
    try:
        archive = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile as exc:
        raise UserError("Нужен корректный ZIP-архив.") from exc
    members = []
    names = set()
    total = 0
    with archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            path = PurePosixPath(info.filename)
            if path.is_absolute() or ".." in path.parts or not path.parts or any(part in ("", ".") for part in path.parts):
                raise UserError("В ZIP есть небезопасный путь.")
            if (info.external_attr >> 16) & 0o170000 == 0o120000:
                raise UserError("ZIP со ссылками не поддерживается.")
            if str(path).casefold() in names:
                raise UserError("В ZIP есть повторяющиеся пути.")
            if len(members) >= MAX_ARCHIVE_FILES:
                raise UserError("В ZIP слишком много файлов.")
            total += info.file_size
            if total > MAX_UNPACKED_BYTES:
                raise UserError("После распаковки прототип не должен превышать 100 МБ.")
            members.append((str(path), archive.read(info)))
            names.add(str(path).casefold())
    if not any(name.lower().endswith((".html", ".htm")) for name, _ in members):
        raise UserError("В ZIP не найдена HTML-страница.")
    return members


def installation_prompt(client, name, version, url):
    targets = {
        "codex": "Codex",
        "opencode": "OpenCode",
        "claude": "Claude",
    }
    return (
        f"Установи skill {name} версии {version} для {targets[client]}. "
        f"Скачай ZIP по ссылке {url}, распакуй его в папку skills, которую использует текущая установка, "
        "и не меняй другие skills. После установки покажи точный путь и версию."
    )


@dataclass
class Settings:
    telegram_token: str
    git_worktree: str
    repository: str
    branch: str
    public_base_url: str
    allowed_user_ids: set
    state_path: str

    @classmethod
    def from_env(cls):
        allowed = {int(item) for item in config("ALLOWED_USER_IDS").split(",") if item.strip()}
        return cls(
            config("TELEGRAM_BOT_TOKEN"), config("GIT_WORKTREE"), config("GITHUB_REPOSITORY"),
            config("GITHUB_BRANCH", "main"), config("PUBLIC_BASE_URL").rstrip("/"), allowed,
            config("BOT_STATE_PATH", "state.sqlite3"),
        )


class GitRepository:
    def __init__(self, settings):
        self.settings = settings
        self.root = os.path.realpath(settings.git_worktree)
        if not os.path.isdir(os.path.join(self.root, ".git")):
            raise RuntimeError("GIT_WORKTREE должен указывать на Git-репозиторий.")

    def git(self, *args, check=True):
        try:
            return subprocess.run(["git", "-C", self.root, *args], check=check, capture_output=True, text=True)
        except subprocess.CalledProcessError as exc:
            raise GithubError(exc.stderr.strip() or exc.stdout.strip() or "Git operation failed") from exc

    def sync(self):
        self.git("pull", "--ff-only", "origin", self.settings.branch)

    def resolve(self, relative):
        target = os.path.realpath(os.path.join(self.root, relative))
        if os.path.commonpath((self.root, target)) != self.root:
            raise UserError("Небезопасный путь в репозитории.")
        return target

    def read_json(self, path, fallback):
        target = self.resolve(path)
        if not os.path.exists(target):
            return fallback
        with open(target, encoding="utf-8") as file:
            return json.load(file)

    def commit_files(self, files, removals, message):
        self.sync()
        for path, content in files.items():
            target = self.resolve(path)
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, "wb") as file:
                file.write(content)
        for path in removals:
            target = self.resolve(path)
            if os.path.isfile(target):
                os.unlink(target)
        affected = sorted(set(files) | set(removals))
        self.git("add", "--", *affected)
        changed = self.git("diff", "--cached", "--quiet", check=False)
        if changed.returncode == 0:
            return None
        if changed.returncode != 1:
            raise GithubError(changed.stderr.strip() or "Не удалось проверить Git diff.")
        self.git("-c", "user.name=YA Travel Design Bot", "-c", "user.email=yatraveldesign-bot@users.noreply.github.com", "commit", "-m", message)
        self.git("push", "origin", self.settings.branch)
        return self.git("rev-parse", "HEAD").stdout.strip()

    def files_below(self, prefix):
        directory = self.resolve(prefix)
        if not os.path.isdir(directory):
            return []
        return [os.path.relpath(os.path.join(root, file), self.root) for root, _, files in os.walk(directory) for file in files]


class Bot:
    def __init__(self, settings):
        self.settings = settings
        self.github = GitRepository(settings)
        os.makedirs(os.path.dirname(settings.state_path) or ".", exist_ok=True)
        self.db = sqlite3.connect(settings.state_path)
        self.db.execute("create table if not exists seen_updates (id integer primary key)")
        self.db.execute("create table if not exists pending (user_id integer primary key, action text not null, name text, version text)")
        self.db.execute("create table if not exists bot_state (key text primary key, value text not null)")
        self.db.commit()
        self.api_base = f"https://api.telegram.org/bot{settings.telegram_token}"

    def telegram(self, method, payload=None):
        data = json.dumps(payload).encode() if payload is not None else None
        request = urllib.request.Request(self.api_base + "/" + method, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=65) as response:
            result = json.load(response)
        if not result.get("ok"):
            raise RuntimeError(result.get("description", "Telegram API error"))
        return result["result"]

    def send(self, chat_id, text, **extra):
        self.telegram("sendMessage", {"chat_id": chat_id, "text": text, **extra})

    def is_publisher(self, user_id):
        return user_id in self.settings.allowed_user_ids

    def start(self, message):
        self.send(message["chat"]["id"], "Выберите действие.", reply_markup=MAIN_KEYBOARD)

    def catalog(self, chat_id):
        catalog = self.github.read_json("skills/catalog.json", [])
        if not catalog:
            self.send(chat_id, "Skills пока не опубликованы.")
            return
        buttons = [[{"text": f"{item['name']} · {item['latest']}", "callback_data": f"skill:{item['name']}"}] for item in catalog]
        self.send(chat_id, "Skills:", reply_markup={"inline_keyboard": buttons})

    def begin_prototype(self, message):
        if not self.is_publisher(message["from"]["id"]):
            self.send(message["chat"]["id"], "Публикация доступна только участникам списка авторов.")
            return
        self.db.execute("insert or replace into pending values (?, ?, null, null)", (message["from"]["id"], "prototype"))
        self.db.commit()
        self.send(message["chat"]["id"], "Пришлите ZIP с HTML-прототипом. Имя ZIP станет частью ссылки.")

    def begin_skill(self, message, name, version):
        if not self.is_publisher(message["from"]["id"]):
            self.send(message["chat"]["id"], "Публикация доступна только участникам списка авторов.")
            return
        if not slugify(name) or not re.fullmatch(r"[0-9A-Za-z][0-9A-Za-z._-]{0,31}", version):
            self.send(message["chat"]["id"], "Формат: /publish_skill название 1.0.0")
            return
        self.db.execute("insert or replace into pending values (?, ?, ?, ?)", (message["from"]["id"], "skill", slugify(name), version))
        self.db.commit()
        self.send(message["chat"]["id"], f"Пришлите ZIP для skill {slugify(name)} версии {version}.")

    def download_document(self, document):
        info = self.telegram("getFile", {"file_id": document["file_id"]})
        request = urllib.request.Request(f"https://api.telegram.org/file/bot{self.settings.telegram_token}/{info['file_path']}")
        with urllib.request.urlopen(request, timeout=90) as response:
            return response.read()

    def publish_document(self, message):
        user_id = message["from"]["id"]
        pending = self.db.execute("select action, name, version from pending where user_id=?", (user_id,)).fetchone()
        if not pending:
            self.send(message["chat"]["id"], "Сначала выберите действие в меню.")
            return
        document = message["document"]
        if not document.get("file_name", "").lower().endswith(".zip") or document.get("file_size", 0) > MAX_UPLOAD_BYTES:
            raise UserError("Нужен ZIP до 20 МБ.")
        raw = self.download_document(document)
        action, name, version = pending
        if action == "prototype":
            self.publish_prototype(user_id, document["file_name"], raw, message["from"])
        else:
            self.publish_skill(user_id, name, version, raw, message["from"])
        self.db.execute("delete from pending where user_id=?", (user_id,))
        self.db.commit()

    def publish_prototype(self, user_id, filename, raw, author):
        slug = slugify(filename.rsplit(".", 1)[0])
        if not slug:
            raise UserError("Не удалось составить ссылку из имени ZIP.")
        prefix = f"public/prototypes/{user_id}/{slug}/"
        files = {prefix + name: content for name, content in safe_zip_members(raw)}
        removed = [path for path in self.github.files_below(prefix) if path not in files]
        self.github.commit_files(files, removed, f"Publish prototype {slug} by {author.get('username') or author.get('first_name')}")
        self.send(author_chat(author), f"Прототип опубликован: {self.settings.public_base_url}/prototypes/{user_id}/{slug}/")

    def publish_skill(self, user_id, name, version, raw, author):
        prefix = f"skills/{name}/{version}/"
        files = {prefix + "skill.zip": raw, prefix + "metadata.json": json.dumps({
            "name": name, "version": version, "author_id": user_id, "author": author.get("username") or author.get("first_name"),
            "published_at": int(time.time()),
        }, ensure_ascii=False, indent=2).encode()}
        catalog = [item for item in self.github.read_json("skills/catalog.json", []) if item["name"] != name]
        catalog.append({"name": name, "latest": version, "author": author.get("username") or author.get("first_name"), "updated_at": int(time.time())})
        files["skills/catalog.json"] = json.dumps(sorted(catalog, key=lambda item: item["name"]), ensure_ascii=False, indent=2).encode()
        self.github.commit_files(files, [], f"Publish skill {name} {version}")
        self.send(author_chat(author), f"Skill {name} версии {version} опубликован.")

    def callback(self, query):
        data = query.get("data", "")
        chat_id = query["message"]["chat"]["id"]
        if data.startswith("skill:"):
            name = data.split(":", 1)[1]
            item = next((item for item in self.github.read_json("skills/catalog.json", []) if item["name"] == name), None)
            if not item:
                self.send(chat_id, "Skill больше недоступен.")
            else:
                buttons = [[{"text": label, "callback_data": f"prompt:{client}:{name}:{item['latest']}"}] for client, label in (("codex", "Prompt для Codex"), ("opencode", "Prompt для OpenCode"), ("claude", "Prompt для Claude"))]
                self.send(chat_id, f"{name} · версия {item['latest']} · автор {item.get('author', '—')}", reply_markup={"inline_keyboard": buttons})
        elif data.startswith("prompt:"):
            _, client, name, version = data.split(":", 3)
            url = f"https://raw.githubusercontent.com/{self.settings.repository}/{self.settings.branch}/skills/{name}/{version}/skill.zip"
            self.send(chat_id, installation_prompt(client, name, version, url))
        self.telegram("answerCallbackQuery", {"callback_query_id": query["id"]})

    def handle(self, update):
        if "callback_query" in update:
            self.callback(update["callback_query"])
            return
        message = update.get("message")
        if not message:
            return
        text = message.get("text", "")
        if text == "/start" or text == "Меню":
            self.start(message)
        elif text == "Опубликовать прототип":
            self.begin_prototype(message)
        elif text == "Skills":
            self.catalog(message["chat"]["id"])
        elif text.startswith("/publish_skill"):
            parts = text.split(maxsplit=2)
            if len(parts) != 3:
                self.send(message["chat"]["id"], "Формат: /publish_skill название 1.0.0")
            else:
                self.begin_skill(message, parts[1], parts[2])
        elif "document" in message:
            self.publish_document(message)
        else:
            self.send(message["chat"]["id"], "Выберите действие в меню.", reply_markup=MAIN_KEYBOARD)

    def run(self):
        saved = self.db.execute("select value from bot_state where key='offset'").fetchone()
        if saved:
            offset = int(saved[0])
        else:
            # Confirm the old bot queue without processing historic messages.
            latest = self.telegram("getUpdates", {"offset": -1, "timeout": 0, "allowed_updates": ["message", "callback_query"]})
            offset = latest[-1]["update_id"] + 1 if latest else 0
            self.db.execute("insert into bot_state values ('offset', ?)", (str(offset),))
            self.db.commit()
        while True:
            try:
                updates = self.telegram("getUpdates", {"offset": offset, "timeout": 50, "allowed_updates": ["message", "callback_query"]})
                for update in updates:
                    offset = update["update_id"] + 1
                    self.db.execute("insert or replace into bot_state values ('offset', ?)", (str(offset),))
                    if self.db.execute("select 1 from seen_updates where id=?", (update["update_id"],)).fetchone():
                        self.db.commit()
                        continue
                    self.handle(update)
                    self.db.execute("insert into seen_updates values (?)", (update["update_id"],))
                    self.db.commit()
            except Exception as exc:
                print(exc, flush=True)
                time.sleep(5)


def author_chat(author):
    # The caller passes the Telegram user object; a direct conversation has the same ID.
    return author["id"]


if __name__ == "__main__":
    Bot(Settings.from_env()).run()

#!/usr/bin/env python3
"""Telegram front end for publishing static prototypes and sharing team skills.

The bot keeps no library checkout. It writes authorised uploads straight into the
configured GitHub repository through the Git Database REST API; GitHub Pages
publishes prototypes from the repository root after each prototype commit.
"""
import hashlib
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
MAX_SKILL_UNPACKED_BYTES = 20 * 1024 * 1024
MAIN_KEYBOARD = {"keyboard": [[{"text": "Опубликовать прототип"}, {"text": "Skills"}]], "resize_keyboard": True}
PEOPLE = {
    1223378011: ("Дмитрий Сурженко", "dima.jpeg"), 419853934: ("Elena Gavrikova", "lena.jpeg"),
    224840424: ("Ivan Borisov", "vanya.jpeg"), 606648153: ("Artem Tregubenko", "artem.jpeg"),
    1566798030: ("Ilya Skopin", "ilya.jpeg"), 125395264: ("Katerina Suchkova", "katya.jpeg"),
    5484890739: ("Bogdan Lipchenko", "bogdan.jpeg"), 65329179: ("Igor Maymusov", "igor.jpeg"),
    136071392: ("Alex L", "alex.jpeg"), 112174798: ("Liubov", "liyba.jpeg"),
    335833483: ("Yuriy Shiryaev", "yuriy.jpeg"),
}


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
    members = safe_archive_members(raw, MAX_UNPACKED_BYTES)
    if not any(name.lower().endswith((".html", ".htm")) for name, _ in members):
        raise UserError("В ZIP не найдена HTML-страница.")
    return [(name, add_noindex(name, content)) for name, content in members]


def safe_archive_members(raw, max_bytes):
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
            if total > max_bytes:
                raise UserError("После распаковки архив слишком большой.")
            members.append((str(path), archive.read(info)))
            names.add(str(path).casefold())
    return members


def add_noindex(name, content):
    """Inject a crawler directive into a text HTML document uploaded to the bot."""
    if not name.lower().endswith((".html", ".htm")):
        return content
    try:
        source = content.decode("utf-8")
    except UnicodeDecodeError:
        return content
    if re.search(r'<meta\\s+[^>]*name=["\\\']robots["\\\']', source, re.I):
        return content
    directive = '<meta name="robots" content="noindex, nofollow, noarchive">'
    match = re.search(r"</head\\s*>", source, re.I)
    if match:
        source = source[:match.start()] + "  " + directive + "\\n" + source[match.start():]
    else:
        source = directive + "\\n" + source
    return source.encode("utf-8")


def skill_package(filename, raw):
    """Return canonical skill metadata and files from a SKILL.md or ZIP upload."""
    if filename.lower().endswith(".zip"):
        members = safe_archive_members(raw, MAX_SKILL_UNPACKED_BYTES)
    elif filename.lower() == "skill.md":
        members = [("SKILL.md", raw)]
    else:
        raise UserError("Пришлите ZIP со skill или отдельный файл SKILL.md.")
    candidates = [(name, content) for name, content in members if PurePosixPath(name).name.casefold() == "skill.md"]
    if len(candidates) != 1:
        raise UserError("В skill должен быть ровно один файл SKILL.md.")
    entry, skill_md = candidates[0]
    root = PurePosixPath(entry).parent
    files = {}
    for name, content in members:
        path = PurePosixPath(name)
        try:
            relative = path.relative_to(root)
        except ValueError:
            continue
        files[str(relative)] = content
    try:
        source = skill_md.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise UserError("SKILL.md должен быть в UTF-8.") from exc
    frontmatter = re.match(r"^---\s*\n(.*?)\n---", source, re.S)
    fields = frontmatter.group(1) if frontmatter else source
    name_match = re.search(r"^name:\s*[\"']?([^\"'\n]+)", fields, re.M)
    if not name_match or not name_match.group(1).strip():
        raise UserError("Добавьте непустое поле name в SKILL.md.")
    description_match = re.search(r"^description:\s*[\"']?([^\"'\n]+)", fields, re.M)
    name = name_match.group(1).strip()
    description = description_match.group(1).strip() if description_match else "Без описания"
    identifier = slugify(name) or "skill-" + hashlib.sha256(name.encode()).hexdigest()[:10]
    return identifier, name, description, files


def make_zip(files):
    result = io.BytesIO()
    with zipfile.ZipFile(result, "w", zipfile.ZIP_DEFLATED) as archive:
        for path, content in sorted(files.items()):
            archive.writestr(path, content)
    return result.getvalue()


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
        commit = self.git("rev-parse", "HEAD").stdout.strip()
        remote = self.git("ls-remote", "origin", f"refs/heads/{self.settings.branch}").stdout.split()
        if not remote or remote[0] != commit:
            raise GithubError("GitHub не подтвердил commit в main.")
        return commit

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
        self.db.execute("create table if not exists skills_seen (user_id integer primary key, seen_at integer not null)")
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

    def catalog(self, message):
        chat_id = message["chat"]["id"]
        user_id = message["from"]["id"]
        catalog = self.github.read_json("skills/catalog.json", [])
        seen = self.db.execute("select seen_at from skills_seen where user_id=?", (user_id,)).fetchone()
        seen_at = seen[0] if seen else 0
        buttons = [[{"text": ("• " if item["updated_at"] > seen_at else "") + item["name"], "callback_data": f"skill:{item['id']}"}] for item in sorted(catalog, key=lambda item: item["name"].casefold())]
        if self.is_publisher(user_id):
            buttons.append([{"text": "Загрузить skill", "callback_data": "skills:upload"}])
        self.db.execute("insert or replace into skills_seen values (?, ?)", (user_id, int(time.time())))
        self.db.commit()
        self.send(chat_id, "Skills:" if catalog else "Skills пока не опубликованы.", reply_markup={"inline_keyboard": buttons})

    def begin_prototype(self, message):
        if not self.is_publisher(message["from"]["id"]):
            self.send(message["chat"]["id"], "Публикация доступна только участникам списка авторов.")
            return
        self.db.execute("insert or replace into pending values (?, ?, null, null)", (message["from"]["id"], "prototype"))
        self.db.commit()
        self.send(message["chat"]["id"], "Пришлите ZIP с HTML-прототипом. Имя ZIP станет частью ссылки.")

    def begin_skill_upload(self, chat_id, user_id):
        if not self.is_publisher(user_id):
            self.send(chat_id, "Публикация доступна только участникам списка авторов.")
            return
        self.db.execute("insert or replace into pending values (?, ?, null, null)", (user_id, "skill"))
        self.db.commit()
        self.send(chat_id, "Пришлите ZIP со skill или отдельный SKILL.md. Имя берётся из поля name в SKILL.md.")

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
        filename = document.get("file_name", "")
        action, _, _ = pending
        allowed = filename.lower().endswith(".zip") if action == "prototype" else (filename.lower().endswith(".zip") or filename.lower() == "skill.md")
        if not allowed or document.get("file_size", 0) > MAX_UPLOAD_BYTES:
            raise UserError("Для прототипа нужен ZIP до 20 МБ." if action == "prototype" else "Пришлите ZIP или SKILL.md до 20 МБ.")
        raw = self.download_document(document)
        if action == "prototype":
            self.publish_prototype(user_id, filename, raw, message["from"])
        else:
            self.publish_skill(user_id, filename, raw, message["from"])
        self.db.execute("delete from pending where user_id=?", (user_id,))
        self.db.commit()

    def publish_prototype(self, user_id, filename, raw, author):
        slug = slugify(filename.rsplit(".", 1)[0])
        if not slug:
            raise UserError("Не удалось составить ссылку из имени ZIP.")
        prefix = f"prototypes/{user_id}/{slug}/"
        files = {prefix + name: content for name, content in safe_zip_members(raw)}
        removed = [path for path in self.github.files_below(prefix) if path not in files]
        profile = PEOPLE.get(user_id, (author.get("first_name", "Автор"), None))
        catalog = [item for item in self.github.read_json("prototypes.json", []) if item["url"] != prefix]
        catalog.append({
            "title": filename.rsplit(".", 1)[0], "author": profile[0],
            "avatar": f"assets/avatars/{profile[1]}" if profile[1] else None,
            "updated_at": int(time.time()), "url": prefix,
        })
        files["prototypes.json"] = json.dumps(catalog, ensure_ascii=False, indent=2).encode()
        self.github.commit_files(files, removed, f"Publish prototype {slug} by {author.get('username') or author.get('first_name')}")
        url = f"{self.settings.public_base_url}/{prefix}"
        if self.wait_for_publication(url):
            self.send(author_chat(author), f"Прототип опубликован: {url}")
        else:
            self.send(author_chat(author), f"GitHub принял прототип, но Pages ещё собирает страницу. Проверьте через минуту: {url}")

    @staticmethod
    def wait_for_publication(url):
        """Avoid declaring success before GitHub Pages serves the uploaded page."""
        for attempt in range(6):
            try:
                request = urllib.request.Request(f"{url}?published={int(time.time())}", method="HEAD", headers={"Cache-Control": "no-cache"})
                with urllib.request.urlopen(request, timeout=12) as response:
                    if response.status == 200:
                        return True
            except urllib.error.URLError:
                pass
            if attempt < 5:
                time.sleep(10)
        return False

    def publish_skill(self, user_id, filename, raw, author):
        identifier, name, description, package = skill_package(filename, raw)
        catalog = self.github.read_json("skills/catalog.json", [])
        existing = next((item for item in catalog if item["name"].casefold() == name.casefold()), None)
        if existing:
            identifier = existing["id"]
        prefix = f"skills/{identifier}/"
        files = {prefix + "skill.zip": make_zip(package), prefix + "metadata.json": json.dumps({
            "id": identifier, "name": name, "description": description,
            "updated_by": author.get("username") or author.get("first_name"), "updated_at": int(time.time()),
        }, ensure_ascii=False, indent=2).encode()}
        removals = [path for path in self.github.files_below(prefix) if path not in files]
        catalog = [item for item in catalog if item["name"].casefold() != name.casefold()]
        catalog.append({"id": identifier, "name": name, "description": description, "updated_by": author.get("username") or author.get("first_name"), "updated_at": int(time.time())})
        files["skills/catalog.json"] = json.dumps(sorted(catalog, key=lambda item: item["name"]), ensure_ascii=False, indent=2).encode()
        self.github.commit_files(files, removals, f"Update skill {name}")
        self.send(author_chat(author), f"Skill {name} загружен в GitHub.")

    def callback(self, query):
        data = query.get("data", "")
        chat_id = query["message"]["chat"]["id"]
        if data == "skills:upload":
            self.begin_skill_upload(chat_id, query["from"]["id"])
        elif data.startswith("skill:"):
            identifier = data.split(":", 1)[1]
            item = next((item for item in self.github.read_json("skills/catalog.json", []) if item["id"] == identifier), None)
            if not item:
                self.send(chat_id, "Skill больше недоступен.")
            else:
                url = f"https://raw.githubusercontent.com/{self.settings.repository}/{self.settings.branch}/skills/{identifier}/skill.zip"
                updated = time.strftime("%d.%m.%Y", time.localtime(item["updated_at"]))
                self.send(chat_id, f"{item['name']}\n{item['description']}\nОбновлено: {updated} · {item['updated_by']}", reply_markup={"inline_keyboard": [[{"text": "Скачать", "url": url}]]})
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
            self.catalog(message)
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

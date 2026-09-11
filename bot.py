#!/usr/bin/env python3
"""Telegram front end for publishing static prototypes and sharing team skills.

The bot keeps no library checkout. It writes authorised uploads straight into the
configured GitHub repository through the Git Database REST API; GitHub Pages
publishes prototypes from the repository root after each prototype commit.
"""
import hashlib
import html
import io
import json
import os
import re
import sqlite3
import subprocess
import time
import urllib.error
import urllib.request
import urllib.parse
import zipfile
from dataclasses import dataclass
from pathlib import PurePosixPath

MAX_UPLOAD_BYTES = 20 * 1024 * 1024
MAX_UNPACKED_BYTES = 100 * 1024 * 1024
MAX_ARCHIVE_FILES = 2_000
MAX_SKILL_UNPACKED_BYTES = 20 * 1024 * 1024
OLLAMA_DEFAULT_MODEL = "qwen3:8b"
SKILL_ID_ALIASES = {
    "yandex-calendar": "calendar-cli",
    "local-memory": "shared-durable-memory",
}
SHORT_RU_MONTHS = ("янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек")
PEOPLE = {
    1223378011: ("Дмитрий Сурженко", "dima.jpeg"), 419853934: ("Елена Гаврикова", "lena.jpeg"),
    224840424: ("Иван Борисов", "vanya.jpeg"), 606648153: ("Артём Трегубенко", "artem.jpeg"),
    1566798030: ("Илья Скопин", "ilya.jpeg"), 125395264: ("Екатерина Сучкова", "katya.jpeg"),
    5484890739: ("Богдан Липченко", "bogdan.jpeg"), 65329179: ("Игорь Маймусов", "igor.jpeg"),
    136071392: ("Алекс", "alex.jpeg"), 112174798: ("Люба", "liyba.jpeg"),
    335833483: ("Юрий Ширяев", "yuriy.jpeg"),
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


def is_technical_label(value):
    """Identify package-like labels that are safe to replace in the catalogue."""
    value = value.strip()
    return bool(
        re.fullmatch(r"[a-z0-9]+(?:[-_][a-z0-9]+)+", value)
        or re.search(r"(?:^|[-_])(?:cli|client|service|tool|skill|prototype|v?\d+)(?:$|[-_])", value, re.I)
    )


def frontmatter_value(fields, key):
    """Read a scalar or folded YAML-style frontmatter value without a YAML dependency."""
    match = re.search(rf"^{re.escape(key)}:\s*(.*)$", fields, re.M)
    if not match:
        return ""
    value = match.group(1).strip()
    if value not in {">", ">-", ">+", "|", "|-", "|+"}:
        return value.strip("\"'").strip()

    lines = fields[match.end():].splitlines()
    content = []
    for line in lines:
        if not line.strip():
            content.append("")
        elif line[0].isspace():
            content.append(line.strip())
        else:
            break
    return " ".join(part for part in content if part).strip()


def skill_version(fields):
    """Read and normalize the required semantic version from SKILL.md metadata."""
    value = frontmatter_value(fields, "version")
    normalized = value[1:] if value.startswith("v") else value
    if not re.fullmatch(r"(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){1,2}(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?", normalized):
        raise UserError("Добавьте версию скила в SKILL.md: version: v0.1")
    return "v" + normalized


def enrich_metadata(kind, name, description=""):
    """Ask local Ollama for display text; keep the upload usable on AI failure."""
    base_url = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    model = os.environ.get("OLLAMA_MODEL", OLLAMA_DEFAULT_MODEL)
    if kind == "prototype":
        source = f"Имя архива: {name}"
    else:
        source = f"Название скила: {name}\nОписание скила: {description}"
    prompt = (
        "Ты редактор каталога команды Travel. Верни только JSON без markdown: "
        '{"name":"...","description":"..."}. '
        "Сохрани уже понятное название без изменений. Если оно техническое, "
        "сделай короткое человеческое название; название может быть на английском. "
        "Описание всегда пиши по-русски: одно ясное предложение о результате для пользователя, до 140 символов. "
        "Не выдумывай функции. Для прототипа используй только имя архива и не описывай детали, которых там нет.\n\n"
        + source
    )
    payload = json.dumps({"model": model, "prompt": prompt, "stream": False, "think": False,
                          "format": "json", "options": {"num_predict": 120}}).encode()
    request = urllib.request.Request(base_url + "/api/generate", data=payload,
                                     headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            result = json.loads(response.read().decode("utf-8"))
        value = json.loads(result.get("response", ""))
        display_name = str(value.get("name", "")).strip()
        display_description = str(value.get("description", "")).strip()
        if not display_name or not display_description or len(display_name) > 100 or len(display_description) > 240:
            raise ValueError("неполный ответ")
        return display_name, display_description
    except (OSError, ValueError, TypeError, json.JSONDecodeError, urllib.error.URLError):
        return name, description or "Без описания"


def safe_zip_members(raw):
    members = strip_archive_root(safe_archive_members(raw, MAX_UNPACKED_BYTES))
    if not any(name.lower().endswith((".html", ".htm")) for name, _ in members):
        raise UserError("В ZIP не найдена HTML-страница.")
    validate_prototype_references(members)
    return [(name, add_noindex(name, content)) for name, content in members]


def strip_archive_root(members):
    """Unwrap a single enclosing directory when it contains the entry page.

    GUI archivers commonly put every file into a directory named after the ZIP.
    Published prototypes must keep index.html at the catalog URL root.
    """
    if not members:
        return members
    paths = [PurePosixPath(name) for name, _ in members]
    roots = {path.parts[0] for path in paths if len(path.parts) > 1}
    if len(roots) != 1 or any(len(path.parts) == 1 for path in paths):
        return members
    root = roots.pop()
    if not any(str(path).casefold() in {f"{root}/index.html".casefold(), f"{root}/index.htm".casefold()} for path in paths):
        return members
    return [(str(PurePosixPath(*PurePosixPath(name).parts[1:])), content) for name, content in members]


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


def validate_prototype_references(members):
    """Reject prototype archives whose static local references cannot be served."""
    available = {name.casefold() for name, _ in members}
    broken = []
    for name, content in members:
        suffix = PurePosixPath(name).suffix.casefold()
        if suffix not in (".html", ".htm", ".css"):
            continue
        try:
            source = content.decode("utf-8")
        except UnicodeDecodeError:
            continue
        references = re.findall(r'''\b(?:href|src)\s*=\s*["']([^"']+)["']''', source, re.I)
        references += re.findall(r'''\burl\(\s*["']?([^"')\s]+)["']?\s*\)''', source, re.I)
        for reference in references:
            target = local_reference_target(name, reference, available)
            if target:
                broken.append(f"{name} → {reference}")
    if broken:
        shown = broken[:10]
        tail = f"\n… и ещё {len(broken) - len(shown)}." if len(broken) > len(shown) else ""
        raise UserError("В прототипе найдены битые ссылки или пути:\n• " + "\n• ".join(shown) + tail + "\nИсправьте ссылки или добавьте файлы в ZIP.")


def local_reference_target(source_name, reference, available):
    """Return a missing local reference, otherwise an empty string."""
    parsed = urllib.parse.urlsplit(reference.strip())
    if not parsed.path or parsed.scheme or parsed.netloc or reference.startswith("//"):
        return ""
    if parsed.path.startswith("/"):
        return parsed.path
    target = str(PurePosixPath(source_name).parent.joinpath(urllib.parse.unquote(parsed.path)))
    candidates = [target]
    if parsed.path.endswith("/"):
        candidates.append(str(PurePosixPath(target) / "index.html"))
    return "" if any(candidate.casefold() in available for candidate in candidates) else target


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
    """Return package metadata and its complete, validated skill archive."""
    if filename.lower().endswith(".zip"):
        members = safe_archive_members(raw, MAX_SKILL_UNPACKED_BYTES)
    elif filename.lower() == "skill.md":
        members = [("SKILL.md", raw)]
    else:
        raise UserError("Пришлите ZIP со скилом или отдельный файл SKILL.md.")
    candidates = [(name, content) for name, content in members if PurePosixPath(name).name.casefold() == "skill.md"]
    if not candidates:
        raise UserError("В скиле должен быть хотя бы один файл SKILL.md.")
    entry, skill_md = min(candidates, key=lambda item: (len(PurePosixPath(item[0]).parts), item[0].casefold()))
    # A ZIP can be a bundle of related skills.  Keep its original directory
    # structure so unpacking the published file installs every skill in it.
    files = {name: content for name, content in members}
    try:
        source = skill_md.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise UserError("SKILL.md должен быть в UTF-8.") from exc
    frontmatter = re.match(r"^---\s*\n(.*?)\n---", source, re.S)
    fields = frontmatter.group(1) if frontmatter else source
    name_match = re.search(r"^name:\s*[\"']?([^\"'\n]+)", fields, re.M)
    if not name_match or not name_match.group(1).strip():
        raise UserError("Добавьте непустое поле name в SKILL.md.")
    name = name_match.group(1).strip()
    version = skill_version(fields)
    description = frontmatter_value(fields, "description") or "Без описания"
    bundle = len(candidates) > 1
    if bundle:
        package_name = filename.rsplit(".", 1)[0].strip()
        if not package_name:
            raise UserError("Не удалось определить название пакета из имени ZIP.")
        name = package_name
    identifier = slugify(name) or "skill-" + hashlib.sha256(name.encode()).hexdigest()[:10]
    identifier = SKILL_ID_ALIASES.get(identifier, identifier)
    dependency_match = re.search(r"^[ \t]+dependencies:\s*\[([^\]]*)\]\s*$", fields, re.M)
    if not dependency_match and re.search(r"^\s*dependencies\s*:", fields, re.M):
        raise UserError("Зависимости укажите в metadata одной строкой: dependencies: [skill-one, skill-two].")
    dependencies = []
    if dependency_match:
        for value in dependency_match.group(1).split(","):
            raw_dependency = value.strip().strip("\"'")
            if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", raw_dependency):
                raise UserError("В dependencies найден пустой или некорректный идентификатор.")
            dependency = SKILL_ID_ALIASES.get(raw_dependency, raw_dependency)
            if dependency == identifier:
                raise UserError("Скил не может зависеть сам от себя.")
            if dependency not in dependencies:
                dependencies.append(dependency)
    if bundle:
        local_ids = set()
        for _, manifest in candidates:
            try:
                manifest_source = manifest.decode("utf-8")
            except UnicodeDecodeError as exc:
                raise UserError("SKILL.md должен быть в UTF-8.") from exc
            manifest_frontmatter = re.match(r"^---\s*\n(.*?)\n---", manifest_source, re.S)
            manifest_fields = manifest_frontmatter.group(1) if manifest_frontmatter else manifest_source
            manifest_name = re.search(r"^name:\s*[\"']?([^\"'\n]+)", manifest_fields, re.M)
            if manifest_name and manifest_name.group(1).strip():
                local_id = slugify(manifest_name.group(1).strip())
                local_ids.add(SKILL_ID_ALIASES.get(local_id, local_id))
        # Dependencies already present in this archive must not be resolved
        # through the public catalogue as separate packages.
        dependencies = [dependency for dependency in dependencies if dependency not in local_ids]
    display_name, display_description = enrich_metadata("skill", name, description)
    return identifier, name, version, description, display_name, display_description, dependencies, files


def make_zip(files):
    result = io.BytesIO()
    with zipfile.ZipFile(result, "w", zipfile.ZIP_DEFLATED) as archive:
        for path, content in sorted(files.items()):
            archive.writestr(path, content)
    return result.getvalue()


def bundle_installer(files):
    """Return the root of a self-installing skill bundle, when present."""
    paths = {PurePosixPath(path) for path in files}
    for path in sorted(paths):
        if path.name != "install.py":
            continue
        root = path.parent
        if root / "README.md" not in paths:
            continue
        skills_root = root / "Skills"
        if any(candidate.name.casefold() == "skill.md" and skills_root in candidate.parents for candidate in paths):
            return str(root)
    return None


def detect_upload(filename, raw):
    """Classify an unsolicited upload without trusting its filename alone."""
    if filename.lower() == "skill.md":
        return "skill"
    if not filename.lower().endswith(".zip"):
        raise UserError("Пришлите ZIP с HTML-прототипом или ZIP/SKILL.md для скила.")
    members = safe_archive_members(raw, MAX_UNPACKED_BYTES)
    if any(PurePosixPath(name).name.casefold() == "skill.md" for name, _ in members):
        return "skill"
    if any(name.lower().endswith((".html", ".htm")) for name, _ in members):
        return "prototype"
    raise UserError("Не удалось определить архив: нужен SKILL.md или HTML-страница.")


def installation_prompt(name, url, identifier=None, catalog_url=None, dependencies=None, installer=None):
    if installer:
        prompt = (f"Установи комплект «{name}» из {url}: распакуй во временную папку и в корне выполни "
                  "python3 install.py --check, затем python3 install.py. При конфликте не заменяй skills.")
        if len(prompt) <= 256:
            return prompt
        return f"Установи комплект из {url}: следуй README.md, выполни install.py --check, затем install.py; не заменяй конфликты."
    if dependencies and identifier and catalog_url:
        prompt = (f"Установи скил «{name}» ({identifier}) и зависимости из {catalog_url}. "
                  f"Пакет skills/{identifier}/skill.zip распакуй целиком в папку skills, остальные скилы не меняй.")
        if len(prompt) <= 256:
            return prompt
        return f"Установи пакет {identifier} и зависимости из {catalog_url}. Распакуй его ZIP целиком в папку skills."
    prompt = f"Установи пакет «{name}»: скачай {url} и распакуй всё его содержимое в папку skills текущего инструмента, не меняя остальные скилы."
    if len(prompt) > 256:
        prompt = f"Установи пакет: {url}. Распакуй всё содержимое в текущую папку skills, остальные скилы не меняй."
    return prompt


def short_russian_date(timestamp):
    value = time.localtime(timestamp)
    return f"{value.tm_mday} {SHORT_RU_MONTHS[value.tm_mon - 1]}"


def contributor_from_author(author):
    """Return stable public contributor data for a Telegram author."""
    user_id = author.get("id")
    person = PEOPLE.get(user_id)
    if person:
        name, avatar = person
    else:
        name = author.get("first_name") or author.get("username") or "Участник команды"
        avatar = None
    return {"id": user_id, "name": name, "avatar": avatar}


def recent_contributors(existing, author, limit=3):
    """Put the latest unique contributor first and keep at most three people."""
    latest = contributor_from_author(author)
    previous = existing.get("contributors", []) if existing else []
    if not previous and existing and existing.get("updated_by") not in (None, "", "team"):
        previous = [{"id": None, "name": existing["updated_by"], "avatar": None}]
    for contributor in previous:
        if not isinstance(contributor, dict):
            continue
        same_id = latest.get("id") is not None and contributor.get("id") == latest["id"]
        same_name = contributor.get("name", "").casefold() == latest.get("name", "").casefold()
        if (same_id or same_name) and not latest.get("avatar") and contributor.get("avatar"):
            latest["avatar"] = contributor["avatar"]
            break
    result = [latest]
    for contributor in previous:
        if not isinstance(contributor, dict) or not contributor.get("name"):
            continue
        same_id = latest.get("id") is not None and contributor.get("id") == latest["id"]
        same_name = contributor["name"].casefold() == latest["name"].casefold()
        if not same_id and not same_name:
            result.append(contributor)
        if len(result) == limit:
            break
    return result


def existing_catalog_item(catalog, identifier, name):
    """Match an update by stable package id first, then by display name."""
    return next((item for item in catalog if item.get("id") == identifier or item.get("name", "").casefold() == name.casefold()), None)


def dependency_closure(catalog, identifier):
    """Return dependencies before the selected skill; reject missing ids and cycles."""
    by_id = {item.get("id"): item for item in catalog if item.get("id")}
    result = []
    visiting = set()
    visited = set()

    def visit(skill_id):
        if skill_id in visiting:
            raise UserError(f"Циклическая зависимость скилов: {skill_id}.")
        if skill_id in visited:
            return
        item = by_id.get(skill_id)
        if not item:
            raise UserError(f"Не найдена зависимость скила: {skill_id}.")
        visiting.add(skill_id)
        dependencies = item.get("dependencies", [])
        if not isinstance(dependencies, list) or any(not isinstance(value, str) for value in dependencies):
            raise UserError(f"Некорректный список зависимостей скила: {skill_id}.")
        for dependency in dependencies:
            visit(dependency)
        visiting.remove(skill_id)
        visited.add(skill_id)
        result.append(item)

    visit(identifier)
    return result


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

    def read_bytes(self, path):
        with open(self.resolve(path), "rb") as file:
            return file.read()

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
        self.send(message["chat"]["id"], "Пришли ZIP-архив с прототипом или со скилом.", reply_markup={"remove_keyboard": True})

    def web_app_url(self):
        revision = self.github.git("rev-parse", "HEAD").stdout.strip()
        return f"{self.settings.public_base_url}/skills/?v={urllib.parse.quote(revision)}"

    def configure_menu(self):
        self.telegram("setChatMenuButton", {"menu_button": {"type": "web_app", "text": "Скилы", "web_app": {"url": self.web_app_url()}}})

    def configure_commands(self):
        self.telegram("setMyCommands", {"commands": [
            {"command": "start", "description": "Как загрузить прототип или скил"},
            {"command": "prototypes", "description": "10 последних прототипов"},
        ]})

    def prototypes(self, message):
        catalog = self.github.read_json("prototypes.json", [])
        if not catalog:
            self.send(message["chat"]["id"], "Свежих прототипов пока нет.")
            return
        self.send(message["chat"]["id"], prototype_list_text(catalog, self.settings.public_base_url), parse_mode="HTML", disable_web_page_preview=True)

    def catalog(self, message):
        chat_id = message["chat"]["id"]
        user_id = message["from"]["id"]
        catalog = self.github.read_json("skills/catalog.json", [])
        seen = self.db.execute("select seen_at from skills_seen where user_id=?", (user_id,)).fetchone()
        seen_at = seen[0] if seen else 0
        catalog = sorted(catalog, key=lambda item: item["name"].casefold())
        lines = []
        for item in catalog:
            marker = "• " if item["updated_at"] > seen_at else ""
            updated = short_russian_date(item["updated_at"])
            lines.append(f"{marker}{item['name']}\n{item['description']}\nОбновлено: {updated} · {item['updated_by']}")
        buttons = [[{"text": item["name"], "callback_data": f"skill:{item['id']}"}] for item in catalog]
        if self.is_publisher(user_id):
            buttons.append([{"text": "Загрузить скил", "callback_data": "skills:upload"}])
        self.db.execute("insert or replace into skills_seen values (?, ?)", (user_id, int(time.time())))
        self.db.commit()
        if not catalog:
            self.send(chat_id, "Скилы пока не опубликованы.", reply_markup={"inline_keyboard": buttons})
            return
        text = "Скилы\n\n" + "\n\n".join(lines)
        for chunk in split_message(text):
            self.send(chat_id, chunk)
        self.send(chat_id, "Действия:", reply_markup={"inline_keyboard": buttons})

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
        self.send(chat_id, "Пришлите ZIP со скилом или отдельный SKILL.md. Имя берётся из поля name в SKILL.md.")

    def download_document(self, document):
        info = self.telegram("getFile", {"file_id": document["file_id"]})
        request = urllib.request.Request(f"https://api.telegram.org/file/bot{self.settings.telegram_token}/{info['file_path']}")
        with urllib.request.urlopen(request, timeout=90) as response:
            return response.read()

    def publish_document(self, message):
        user_id = message["from"]["id"]
        pending = self.db.execute("select action, name, version from pending where user_id=?", (user_id,)).fetchone()
        document = message["document"]
        filename = document.get("file_name", "")
        if not self.is_publisher(user_id):
            self.send(message["chat"]["id"], "Публикация доступна только участникам списка авторов.")
            return
        if document.get("file_size", 0) > MAX_UPLOAD_BYTES:
            raise UserError("Файл не должен превышать 20 МБ.")
        self.send(message["chat"]["id"], "Загружаю…")
        raw = self.download_document(document)
        if pending:
            action = pending[0]
            allowed = filename.lower().endswith(".zip") if action == "prototype" else (filename.lower().endswith(".zip") or filename.lower() == "skill.md")
            if not allowed:
                raise UserError("Для прототипа нужен ZIP." if action == "prototype" else "Пришлите ZIP или SKILL.md.")
        else:
            action = detect_upload(filename, raw)
        if action == "prototype":
            self.publish_prototype(user_id, filename, raw, message["from"])
        else:
            self.publish_skill(user_id, filename, raw, message["from"])
        if pending:
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
        display_name, display_description = enrich_metadata("prototype", filename.rsplit(".", 1)[0])
        catalog = [item for item in self.github.read_json("prototypes.json", []) if item["url"] != prefix]
        catalog.append({
            "title": display_name, "description": display_description, "author": profile[0],
            "avatar": f"assets/avatars/{profile[1]}" if profile[1] else None,
            "updated_at": int(time.time()), "url": prefix,
        })
        files["prototypes.json"] = json.dumps(catalog, ensure_ascii=False, indent=2).encode()
        self.github.commit_files(files, removed, f"Publish prototype {slug} by {author.get('username') or author.get('first_name')}")
        url = f"{self.settings.public_base_url}/{prefix}"
        if self.wait_for_publication(url):
            self.send(author_chat(author), f"Готово — {url}\nВсе прототипы по команде /prototypes")
        else:
            self.send(author_chat(author), f"Получил прототип, но нужно еще немного времени — собираю страницу.\nСкоро всё будет опубликовано: {url}")

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
        identifier, name, version, description, display_name, display_description, dependencies, package = skill_package(filename, raw)
        updated_at = int(time.time())
        # Read the catalog only after synchronizing. commit_files() also syncs
        # before writing, but reading first could build a new catalog from a
        # stale checkout and silently drop contributors added remotely.
        self.github.sync()
        catalog = self.github.read_json("skills/catalog.json", [])
        existing = existing_catalog_item(catalog, identifier, name)
        if existing:
            identifier = existing["id"]
            if not is_technical_label(existing["name"]):
                display_name = existing["name"]
        contributors = recent_contributors(existing, author)
        updated_by = author.get("username") or author.get("first_name")
        prefix = f"skills/{identifier}/"
        item = {
            "id": identifier, "name": display_name, "version": version, "description": display_description,
            "updated_by": updated_by, "updated_at": updated_at, "contributors": contributors,
        }
        installer = bundle_installer(package)
        if installer:
            item["installation"] = {"type": "script", "root": installer}
        if dependencies:
            item["dependencies"] = dependencies
        files = {prefix + "skill.zip": make_zip(package), prefix + "metadata.json": json.dumps(
            item, ensure_ascii=False, indent=2).encode()}
        removals = [path for path in self.github.files_below(prefix) if path not in files]
        catalog = [item for item in catalog if item.get("id") != identifier and item.get("name", "").casefold() != name.casefold()]
        catalog.append(item)
        dependency_closure(catalog, identifier)
        files["skills/catalog.json"] = json.dumps(sorted(catalog, key=lambda item: item["name"]), ensure_ascii=False, indent=2).encode()
        self.github.commit_files(files, removals, f"Update skill {display_name}")
        self.configure_menu()
        if self.wait_for_skill_publication(identifier, updated_at):
            self.send(author_chat(author), "Скил появится в Skill store в течении 2 минут.")
        else:
            self.send(author_chat(author), "Скилл добавлен, но каталог ещё обновляется. Откройте Скилы через минуту.")

    def wait_for_skill_publication(self, identifier, updated_at):
        raw_root = f"https://raw.githubusercontent.com/{self.settings.repository}/{self.settings.branch}"
        catalog_url = f"{raw_root}/skills/catalog.json?updated={updated_at}"
        package_url = f"{raw_root}/skills/{identifier}/skill.zip?updated={updated_at}"
        for attempt in range(6):
            try:
                request = urllib.request.Request(catalog_url, headers={"Cache-Control": "no-cache"})
                with urllib.request.urlopen(request, timeout=12) as response:
                    catalog = json.load(response)
                has_current_skill = any(item.get("id") == identifier and item.get("updated_at") == updated_at for item in catalog)
                package = urllib.request.Request(package_url, method="HEAD", headers={"Cache-Control": "no-cache"})
                with urllib.request.urlopen(package, timeout=12) as response:
                    if has_current_skill and response.status == 200:
                        return True
            except (urllib.error.URLError, ValueError, json.JSONDecodeError):
                pass
            if attempt < 5:
                time.sleep(2)
        return False

    def callback(self, query):
        data = query.get("data", "")
        chat_id = query["message"]["chat"]["id"]
        if data == "skills:upload":
            self.begin_skill_upload(chat_id, query["from"]["id"])
        elif data.startswith("skill:"):
            identifier = data.split(":", 1)[1]
            item = next((item for item in self.github.read_json("skills/catalog.json", []) if item["id"] == identifier), None)
            if not item:
                self.send(chat_id, "Скил больше недоступен.")
            else:
                raw_root = f"https://raw.githubusercontent.com/{self.settings.repository}/{self.settings.branch}"
                url = f"{raw_root}/skills/{identifier}/skill.zip"
                updated = short_russian_date(item["updated_at"])
                try:
                    required = dependency_closure(self.github.read_json("skills/catalog.json", []), identifier)
                except UserError as error:
                    self.send(chat_id, str(error))
                    self.telegram("answerCallbackQuery", {"callback_query_id": query["id"]})
                    return
                try:
                    archive = self.github.read_bytes(f"skills/{identifier}/skill.zip")
                    installer = bundle_installer(dict(safe_archive_members(archive, MAX_SKILL_UNPACKED_BYTES)))
                except (OSError, UserError):
                    installer = None
                prompt = installation_prompt(item["name"], url, identifier, f"{raw_root}/skills/catalog.json", required[:-1], installer)
                self.send(chat_id, f"{item['name']}\n{item['description']}\nОбновлено: {updated} · {item['updated_by']}", reply_markup={"inline_keyboard": [[{"text": "Скопировать промпт", "copy_text": {"text": prompt}}]]})
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
        elif text == "/prototypes":
            self.prototypes(message)
        elif "document" in message:
            try:
                self.publish_document(message)
            except UserError as exc:
                self.send(message["chat"]["id"], str(exc))
            except Exception as exc:
                print(exc, flush=True)
                self.send(message["chat"]["id"], "Не удалось загрузить файл. Попробуйте ещё раз.")
        else:
            self.send(message["chat"]["id"], "Пришли ZIP-архив с прототипом или со скилом. Все скилы доступны в меню бота.")

    def run(self):
        self.configure_menu()
        self.configure_commands()
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


def split_message(text, limit=4000):
    """Split a catalogue on paragraph boundaries before Telegram's message limit."""
    chunks, current = [], ""
    for paragraph in text.split("\n\n"):
        candidate = paragraph if not current else current + "\n\n" + paragraph
        if len(candidate) <= limit:
            current = candidate
        else:
            if current:
                chunks.append(current)
            while len(paragraph) > limit:
                chunks.append(paragraph[:limit])
                paragraph = paragraph[limit:]
            current = paragraph
    if current:
        chunks.append(current)
    return chunks


def prototype_list_text(catalog, public_base_url):
    rows = ["Свежие прототипы"]
    for item in sorted(catalog, key=lambda value: value["updated_at"], reverse=True)[:10]:
        url = f"{public_base_url}/{item['url']}"
        title = html.escape(item["title"])
        author = html.escape(item["author"])
        updated = short_russian_date(item["updated_at"])
        rows.append(f'<a href="{html.escape(url, quote=True)}">{title}</a>\n{author} · {updated}')
    return "\n\n".join(rows)


if __name__ == "__main__":
    Bot(Settings.from_env()).run()

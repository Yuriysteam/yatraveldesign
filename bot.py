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
GIT_TIMEOUT_SECONDS = 60
GITHUB_ACTIONS_POLL_SECONDS = 3.5
GITHUB_ACTIONS_TIMEOUT_SECONDS = 600
PUBLIC_ARTIFACT_POLL_SECONDS = 5
PUBLIC_ARTIFACT_TIMEOUT_SECONDS = 180
PUBLICATION_REPAIR_ATTEMPTS = 2
YURIYOS_NOTIFY_SCRIPT = "/Users/Yuriy/Yuriy OS/Tools/yuriyos-local-runtime/scripts/notify.sh"
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


class PublicationProgress:
    """Keep publication stages and the final result in one Telegram message."""
    def __init__(self, bot, message):
        self.bot = bot
        self.chat_id = message["chat"]["id"]
        self.message_id = message["message_id"]
        self.text = None

    def update(self, text):
        if text == self.text:
            return
        self.bot.edit_message(self.chat_id, self.message_id, text)
        self.text = text


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
    members = add_catalog_entrypoint(members)
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
    if not any(path.suffix.casefold() in {".html", ".htm"} for path in paths):
        return members
    return [(str(PurePosixPath(*PurePosixPath(name).parts[1:])), content) for name, content in members]


def add_catalog_entrypoint(members):
    """Expose an uploaded main page at the stable catalog directory URL."""
    root_html = [
        (name, content) for name, content in members
        if len(PurePosixPath(name).parts) == 1
        and PurePosixPath(name).suffix.casefold() in {".html", ".htm"}
    ]
    index = next(((name, content) for name, content in root_html if name.casefold() == "index.html"), None)
    if index:
        return members
    index_htm = next(((name, content) for name, content in root_html if name.casefold() == "index.htm"), None)
    if index_htm:
        return members + [("index.html", index_htm[1])]
    if len(root_html) == 1:
        return members + [("index.html", root_html[0][1])]
    if not root_html:
        raise UserError("Главная HTML-страница должна лежать в корне ZIP.")
    raise UserError("В ZIP несколько HTML-страниц в корне. Назовите главную index.html.")


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
    if re.search(r'<meta\s+[^>]*name=["\']robots["\']', source, re.I):
        return content
    directive = '<meta name="robots" content="noindex, nofollow, noarchive">'
    match = re.search(r"</head\s*>", source, re.I)
    if match:
        source = source[:match.start()] + "  " + directive + "\n" + source[match.start():]
    else:
        html = re.search(r"<html\b[^>]*>", source, re.I)
        if html:
            source = source[:html.end()] + "\n<head>" + directive + "</head>" + source[html.end():]
        else:
            source = "<head>" + directive + "</head>\n" + source
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



MARKETPLACE_PATH = ".agents/plugins/marketplace.json"
MARKETPLACE_NAME = "travel-design"


def marketplace_catalog(repository):
    catalog = repository.read_json(MARKETPLACE_PATH, {
        "name": MARKETPLACE_NAME,
        "interface": {"displayName": "Travel Design"},
        "plugins": [],
    })
    if not isinstance(catalog, dict) or not isinstance(catalog.get("plugins"), list):
        raise UserError("Некорректный каталог плагинов ChatGPT. Публикация остановлена до изменения файлов.")
    return catalog


def codex_plugin_files(item, packages):
    """Mirror complete archives without executing installers or rewriting skills."""
    identifier = item["id"]
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", identifier):
        raise UserError("Некорректный идентификатор плагина ChatGPT.")
    prefix = f"plugins/{identifier}/"
    files = {}
    for package_id, package in packages:
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", package_id):
            raise UserError("Некорректный идентификатор зависимости плагина ChatGPT.")
        if not any(PurePosixPath(name).name.casefold() == "skill.md" for name in package):
            raise UserError("В зависимости плагина ChatGPT отсутствует SKILL.md.")
        for name, content in package.items():
            path = PurePosixPath(name)
            if path.is_absolute() or ".." in path.parts or not path.parts:
                raise UserError("Небезопасный путь в плагине ChatGPT.")
            if path.name.casefold() == "skill.md":
                path = path.with_name("SKILL.md")
            files[f"{prefix}skills/{package_id}/{path}"] = content
    digest = hashlib.sha256()
    for name, content in sorted(files.items()):
        digest.update(name.encode() + b"\0" + hashlib.sha256(content).digest())
    version = item["version"].lstrip("v").split("+", 1)[0]
    core, dash, prerelease = version.partition("-")
    if len(core.split(".")) == 2:
        core += ".0"
    version = core + (dash + prerelease if dash else "") + "+" + digest.hexdigest()[:12]
    manifest = {
        "name": identifier, "version": version,
        "description": item.get("description") or item["name"],
        "author": {"name": "Travel Design"},
        "skills": "./skills/",
        "interface": {"displayName": item["name"],
                      "shortDescription": (item.get("description") or item["name"])[:200],
                      "longDescription": item.get("description") or item["name"],
                      "developerName": "Travel Design", "category": "Productivity"},
    }
    files[prefix + ".codex-plugin/plugin.json"] = json.dumps(manifest, ensure_ascii=False, indent=2).encode()
    return files


def marketplace_entry(identifier):
    return {"name": identifier, "source": {"source": "local", "path": f"./plugins/{identifier}"},
            "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},
            "category": "Productivity"}


def skill_marketplace_changes(repository, catalog, identifier, package):
    """Update the new package and any already-exported dependent in one commit."""
    marketplace = marketplace_catalog(repository)
    by_id = {item["id"]: item for item in catalog}
    exported = {entry["name"] for entry in marketplace["plugins"]
                if entry.get("source") == {"source": "local", "path": f"./plugins/{entry.get('name')}"}}
    targets = {identifier}
    for candidate in exported & by_id.keys():
        if identifier in {item["id"] for item in dependency_closure(catalog, candidate)}:
            targets.add(candidate)
    packages = {identifier: package}
    files, removals = {}, []
    for target in sorted(targets):
        conflicting = [entry for entry in marketplace["plugins"] if entry.get("name") == target
                       and entry.get("source") != {"source": "local", "path": f"./plugins/{target}"}]
        if conflicting:
            raise UserError("Имя плагина ChatGPT уже занято другим источником.")
        required = dependency_closure(catalog, target)
        for item in required:
            if item["id"] not in packages:
                raw = repository.read_bytes(f"skills/{item['id']}/skill.zip")
                packages[item["id"]] = dict(safe_archive_members(raw, MAX_SKILL_UNPACKED_BYTES))
        generated = codex_plugin_files(by_id[target], [(item["id"], packages[item["id"]]) for item in required])
        prefix = f"plugins/{target}/"
        removals.extend(path for path in repository.files_below(prefix) if path not in generated)
        files.update(generated)
        marketplace["plugins"] = [entry for entry in marketplace["plugins"] if entry.get("name") != target]
        marketplace["plugins"].append(marketplace_entry(target))
    marketplace["plugins"].sort(key=lambda entry: entry["name"])
    files[MARKETPLACE_PATH] = json.dumps(marketplace, ensure_ascii=False, indent=2).encode()
    return files, removals


def skill_marketplace_removal(repository, identifier):
    marketplace = marketplace_catalog(repository)
    matching = [entry for entry in marketplace["plugins"] if entry.get("name") == identifier]
    if not matching:
        return {}, []
    if any(entry.get("source") != {"source": "local", "path": f"./plugins/{identifier}"} for entry in matching):
        raise UserError("Плагин ChatGPT использует другой источник. Удаление остановлено.")
    marketplace["plugins"] = [entry for entry in marketplace["plugins"] if entry.get("name") != identifier]
    return {MARKETPLACE_PATH: json.dumps(marketplace, ensure_ascii=False, indent=2).encode()}, repository.files_below(f"plugins/{identifier}/")


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


def codex_installation_prompt(identifier, repository="Yuriysteam/yatraveldesign", branch="main"):
    """First-time setup uses the supported CLI, never a made-up source deep link."""
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", identifier):
        raise UserError("Некорректный идентификатор плагина.")
    return (
        f"Если travel-design ещё не подключён в ChatGPT, выполни: "
        f"codex plugin marketplace add {repository} --ref {branch} --sparse .agents/plugins --sparse plugins. "
        f"Обнови каталог: codex plugin marketplace upgrade travel-design. "
        f"Затем установи: codex plugin add {identifier}@travel-design --json"
    )


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
            return subprocess.run(["git", "-C", self.root, *args], check=check, capture_output=True, text=True, timeout=GIT_TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired as exc:
            raise GithubError("Git не ответил за 60 секунд.") from exc
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

    def retry_pages_deployment(self, subject):
        """Change a watched marker so a verified repair retry starts Pages again."""
        self.sync()
        marker = self.resolve("pages-retry.txt")
        with open(marker, "w", encoding="utf-8") as file:
            file.write(f"Last Pages retry: {int(time.time())}\n")
        message = f"Retry Pages publication: {subject}"[:160]
        self.git("add", "--", "pages-retry.txt")
        self.git("-c", "user.name=YA Travel Design Bot", "-c", "user.email=yatraveldesign-bot@users.noreply.github.com", "commit", "-m", message)
        self.git("push", "origin", self.settings.branch)
        commit = self.git("rev-parse", "HEAD").stdout.strip()
        remote = self.git("ls-remote", "origin", f"refs/heads/{self.settings.branch}").stdout.split()
        if not remote or remote[0] != commit:
            raise GithubError("GitHub не подтвердил retry commit в main.")
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
        self._migrate_pending()
        self.db.execute("create table if not exists bot_state (key text primary key, value text not null)")
        self.db.execute("create table if not exists skills_seen (user_id integer primary key, seen_at integer not null)")
        self.db.commit()
        self.api_base = f"https://api.telegram.org/bot{settings.telegram_token}"

    def _migrate_pending(self):
        """Keep in-progress skill reviews across bot restarts."""
        columns = {row[1] for row in self.db.execute("pragma table_info(pending)")}
        for column, kind in (("filename", "text"), ("raw", "blob"), ("author", "text"), ("identifier", "text")):
            if column not in columns:
                self.db.execute(f"alter table pending add column {column} {kind}")

    def telegram(self, method, payload=None):
        data = json.dumps(payload).encode() if payload is not None else None
        request = urllib.request.Request(self.api_base + "/" + method, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=65) as response:
                result = json.load(response)
        except urllib.error.HTTPError as exc:
            try:
                description = json.load(exc).get("description", f"HTTP {exc.code}")
            except (ValueError, OSError):
                description = f"HTTP {exc.code}"
            raise RuntimeError(f"Telegram {method}: {description}") from None
        if not result.get("ok"):
            raise RuntimeError(result.get("description", "Telegram API error"))
        return result["result"]

    def send(self, chat_id, text, **extra):
        return self.telegram("sendMessage", {"chat_id": chat_id, "text": text, **extra})

    def edit_message(self, chat_id, message_id, text):
        return self.telegram("editMessageText", {"chat_id": chat_id, "message_id": message_id, "text": text})

    def typing(self, chat_id):
        return self.telegram("sendChatAction", {"chat_id": chat_id, "action": "typing"})

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
            {"command": "prototypes", "description": "15 последних прототипов"},
            {"command": "delete_prototype", "description": "Удалить прототип"},
            {"command": "delete_skill", "description": "Удалить скилл"},
        ]})

    def prototypes(self, message):
        catalog = self.github.read_json("prototypes.json", [])
        if not catalog:
            self.send(message["chat"]["id"], "Свежих прототипов пока нет.")
            return
        self.send(message["chat"]["id"], prototype_list_text(catalog, self.settings.public_base_url), parse_mode="HTML", disable_web_page_preview=True)

    @staticmethod
    def prototype_delete_key(item):
        return hashlib.sha256(item["url"].encode()).hexdigest()[:24]

    def delete_prototype_menu(self, message, page=0):
        chat_id = message["chat"]["id"]
        if not self.is_publisher(message["from"]["id"]):
            self.send(chat_id, "Удаление доступно только участникам списка авторов.")
            return
        self.github.sync()
        catalog = sorted(self.github.read_json("prototypes.json", []), key=lambda item: item.get("updated_at", 0), reverse=True)
        if not catalog:
            self.send(chat_id, "Прототипов для удаления нет.")
            return
        page = max(0, min(page, (len(catalog) - 1) // 15))
        buttons = [[{"text": f"{item['title']} · {item.get('author', '')}"[:100],
                     "callback_data": f"proto:select:{self.prototype_delete_key(item)}"}]
                   for item in catalog[page * 15:(page + 1) * 15]]
        navigation = []
        if page:
            navigation.append({"text": "Назад", "callback_data": f"proto:page:{page - 1}"})
        if (page + 1) * 15 < len(catalog):
            navigation.append({"text": "Далее", "callback_data": f"proto:page:{page + 1}"})
        if navigation:
            buttons.append(navigation)
        self.send(chat_id, "Выберите прототип для удаления:", reply_markup={"inline_keyboard": buttons})

    def prototype_delete_callback(self, query):
        chat_id = query["message"]["chat"]["id"]
        message_id = query["message"]["message_id"]
        if not self.is_publisher(query["from"]["id"]):
            self.send(chat_id, "Удаление доступно только участникам списка авторов.")
            return
        action, key = query["data"].split(":", 2)[1:]
        if action == "page":
            if key.isdecimal():
                self.delete_prototype_menu({"chat": {"id": chat_id}, "from": query["from"]}, int(key))
            return
        if action == "cancel":
            self.edit_message(chat_id, message_id, "Удаление отменено.")
            return
        self.github.sync()
        catalog = self.github.read_json("prototypes.json", [])
        item = next((item for item in catalog if self.prototype_delete_key(item) == key), None)
        if not item:
            self.send(chat_id, "Прототип уже удалён или больше недоступен.")
            return
        prefix = item["url"]
        if not re.fullmatch(r"prototypes/[0-9]+/[a-z0-9]+(?:-[a-z0-9]+)*/", prefix):
            raise UserError("Некорректный путь прототипа. Удаление остановлено.")
        if action == "select":
            self.send(chat_id, f"Удалить прототип «{item['title']}»?\n{self.settings.public_base_url}/{prefix}",
                      reply_markup={"inline_keyboard": [[
                          {"text": "Удалить", "callback_data": f"proto:confirm:{key}"},
                          {"text": "Отмена", "callback_data": "proto:cancel:0"},
                      ]]})
        elif action == "confirm":
            progress = PublicationProgress(self, query["message"])
            try:
                progress.update("Удаляю прототип…")
                removals = self.github.files_below(prefix)
                remaining = [entry for entry in catalog if entry["url"] != prefix]
                commit = self.github.commit_files(
                    {"prototypes.json": json.dumps(remaining, ensure_ascii=False, indent=2).encode()},
                    removals, f"Delete prototype {prefix}")
                progress.update("Жду удаления страницы…")
                url = f"{self.settings.public_base_url}/{prefix}"
                removed, reason = self.monitor_publication(
                    f"delete {prefix}", commit, lambda: self.wait_for_prototype_removal(url),
                    lambda: "GitHub Pages не подтвердил удаление страницы")
                progress.update("Прототип удалён ✓" if removed else f"Ошибка удаления: {reason}")
            except Exception as exc:
                progress.update(f"Ошибка удаления: {exc}")

    @staticmethod
    def wait_for_prototype_removal(url):
        deadline = time.monotonic() + PUBLIC_ARTIFACT_TIMEOUT_SECONDS
        while True:
            try:
                request = urllib.request.Request(f"{url}?deleted={int(time.time())}", method="HEAD", headers={"Cache-Control": "no-cache"})
                with urllib.request.urlopen(request, timeout=12):
                    pass
            except urllib.error.HTTPError as exc:
                if exc.code == 404:
                    return True
            except urllib.error.URLError:
                pass
            if time.monotonic() >= deadline:
                return False
            time.sleep(PUBLIC_ARTIFACT_POLL_SECONDS)

    @staticmethod
    def skill_delete_key(item):
        return hashlib.sha256(item["id"].encode()).hexdigest()[:24]

    def delete_skill_menu(self, message, page=0):
        chat_id = message["chat"]["id"]
        if not self.is_publisher(message["from"]["id"]):
            self.send(chat_id, "Удаление доступно только участникам списка авторов.")
            return
        self.github.sync()
        catalog = sorted(self.github.read_json("skills/catalog.json", []), key=lambda item: item["name"].casefold())
        if not catalog:
            self.send(chat_id, "Скиллов для удаления нет.")
            return
        page = max(0, min(page, (len(catalog) - 1) // 15))
        buttons = [[{"text": item["name"][:100], "callback_data": f"skdelete:select:{self.skill_delete_key(item)}"}]
                   for item in catalog[page * 15:(page + 1) * 15]]
        navigation = []
        if page:
            navigation.append({"text": "Назад", "callback_data": f"skdelete:page:{page - 1}"})
        if (page + 1) * 15 < len(catalog):
            navigation.append({"text": "Далее", "callback_data": f"skdelete:page:{page + 1}"})
        if navigation:
            buttons.append(navigation)
        self.send(chat_id, "Выберите скилл для удаления:", reply_markup={"inline_keyboard": buttons})

    def skill_delete_callback(self, query):
        chat_id = query["message"]["chat"]["id"]
        if not self.is_publisher(query["from"]["id"]):
            self.send(chat_id, "Удаление доступно только участникам списка авторов.")
            return
        action, key = query["data"].split(":", 2)[1:]
        if action == "page":
            if key.isdecimal():
                self.delete_skill_menu({"chat": {"id": chat_id}, "from": query["from"]}, int(key))
            return
        if action == "cancel":
            self.edit_message(chat_id, query["message"]["message_id"], "Удаление отменено.")
            return
        self.github.sync()
        catalog = self.github.read_json("skills/catalog.json", [])
        item = next((item for item in catalog if self.skill_delete_key(item) == key), None)
        if not item:
            self.send(chat_id, "Скилл уже удалён или больше недоступен.")
            return
        identifier = item["id"]
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", identifier):
            raise UserError("Некорректный путь скилла. Удаление остановлено.")
        dependents = [entry["name"] for entry in catalog if identifier in entry.get("dependencies", []) and entry["id"] != identifier]
        if dependents:
            raise UserError("Скилл нужен другим скиллам: " + ", ".join(dependents) + ". Сначала удалите или обновите их зависимости.")
        if action == "select":
            self.send(chat_id, f"Удалить скилл «{item['name']}» из Skill store?", reply_markup={"inline_keyboard": [[
                {"text": "Удалить", "callback_data": f"skdelete:confirm:{key}"},
                {"text": "Отмена", "callback_data": "skdelete:cancel:0"},
            ]]})
        elif action == "confirm":
            progress = PublicationProgress(self, query["message"])
            try:
                progress.update("Удаляю скилл…")
                prefix = f"skills/{identifier}/"
                remaining = [entry for entry in catalog if entry["id"] != identifier]
                files = {"skills/catalog.json": json.dumps(remaining, ensure_ascii=False, indent=2).encode()}
                marketplace_files, marketplace_removals = skill_marketplace_removal(self.github, identifier)
                files.update(marketplace_files)
                commit = self.github.commit_files(
                    files, self.github.files_below(prefix) + marketplace_removals, f"Delete skill {identifier}")
                progress.update("Жду обновления Skill store…")
                removed, reason = self.monitor_publication(
                    f"delete skill {identifier}", commit, lambda: self.wait_for_skill_removal(identifier),
                    lambda: "Skill store не подтвердил удаление скилла")
                progress.update("Скилл удалён ✓" if removed else f"Ошибка удаления: {reason}")
            except Exception as exc:
                progress.update(f"Ошибка удаления: {exc}")

    def wait_for_skill_removal(self, identifier):
        deadline = time.monotonic() + PUBLIC_ARTIFACT_TIMEOUT_SECONDS
        root = f"{self.settings.public_base_url}/skills"
        while True:
            try:
                stamp = int(time.time())
                request = urllib.request.Request(f"{root}/catalog.json?deleted={stamp}", headers={"Cache-Control": "no-cache"})
                with urllib.request.urlopen(request, timeout=12) as response:
                    catalog = json.load(response)
                    absent = response.status == 200 and isinstance(catalog, list) and all(item["id"] != identifier for item in catalog)
                if absent:
                    request = urllib.request.Request(f"{root}/{identifier}/skill.zip?deleted={stamp}", method="HEAD", headers={"Cache-Control": "no-cache"})
                    try:
                        with urllib.request.urlopen(request, timeout=12):
                            pass
                    except urllib.error.HTTPError as exc:
                        if exc.code == 404:
                            return True
            except (urllib.error.URLError, ValueError, KeyError, TypeError):
                pass
            if time.monotonic() >= deadline:
                return False
            time.sleep(PUBLIC_ARTIFACT_POLL_SECONDS)

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
        initial = "Загружаю скилл…" if pending and pending[0] == "skill" or filename.lower() == "skill.md" else "Загружаю прототип…"
        progress = PublicationProgress(self, self.send(message["chat"]["id"], initial))
        try:
            raw = self.download_document(document)
            progress.update("Проверяю архив…" if filename.lower().endswith(".zip") else "Проверяю скилл…")
            if pending:
                action = pending[0]
                allowed = filename.lower().endswith(".zip") if action == "prototype" else (filename.lower().endswith(".zip") or filename.lower() == "skill.md")
                if not allowed:
                    raise UserError("Для прототипа нужен ZIP." if action == "prototype" else "Пришлите ZIP или SKILL.md.")
            else:
                action = detect_upload(filename, raw)
            if action == "prototype":
                self.publish_prototype(user_id, filename, raw, message["from"], progress)
            else:
                self.review_skill(user_id, filename, raw, message["from"])
                progress.update("Скилл проверен. Ожидает подтверждения публикации.")
                return
            if pending:
                self.db.execute("delete from pending where user_id=?", (user_id,))
                self.db.commit()
        except Exception as exc:
            progress.update(f"Ошибка публикации: {exc}")
            if not isinstance(exc, UserError):
                raise
            self.notify_publication_result(
                f"@yatraveldesign_bot: ошибка загрузки файла {filename} от {message['from'].get('username') or message['from'].get('first_name')}. Причина: {exc}"
            )

    def review_skill(self, user_id, filename, raw, author):
        """Validate a skill before asking whether to publish or customize it."""
        identifier, name, _, _, display_name, _, dependencies, package = skill_package(filename, raw)
        self.github.sync()
        catalog = self.github.read_json("skills/catalog.json", [])
        existing = existing_catalog_item(catalog, identifier, name)
        if existing and not is_technical_label(existing["name"]):
            display_name = existing["name"]
        if dependencies:
            candidate = [item for item in catalog if item.get("id") != identifier]
            candidate.append({"id": identifier, "dependencies": dependencies})
            dependency_closure(candidate, identifier)
        default_prompt = codex_installation_prompt(identifier, self.settings.repository, self.settings.branch)
        self.db.execute(
            "insert or replace into pending (user_id, action, name, version, filename, raw, author, identifier) values (?, ?, ?, ?, ?, ?, ?, ?)",
            (user_id, "skill:review", display_name, default_prompt, filename, raw, json.dumps(author, ensure_ascii=False), identifier),
        )
        self.db.commit()
        self.send(author_chat(author),
                  f"Скилл проверен.\nИмя в Skill store: «{display_name}»\nПромпт для установки подготовлен автоматически.",
                  reply_markup={"inline_keyboard": [[
                      {"text": "Опубликовать как есть", "callback_data": "skill:publish"},
                      {"text": "Настроить", "callback_data": "skill:configure"},
                  ]]})

    def pending_skill(self, user_id):
        return self.db.execute(
            "select action, name, version, filename, raw, author, identifier from pending where user_id=?", (user_id,)
        ).fetchone()

    def publish_pending_skill(self, user_id):
        pending = self.pending_skill(user_id)
        if not pending or pending[0] not in {"skill:review", "skill:publish"}:
            raise UserError("Нет скила, ожидающего публикации.")
        _, display_name, custom_prompt, filename, raw, author_json, _ = pending
        author = json.loads(author_json)
        self.db.execute("update pending set action='skill:publish' where user_id=?", (user_id,))
        self.db.commit()
        progress = PublicationProgress(self, self.send(author_chat(author), "Загружаю скилл…"))
        try:
            self.publish_skill(user_id, filename, raw, author, progress, display_name, custom_prompt)
        except Exception as exc:
            progress.update(f"Ошибка публикации скилла: {exc}")
            raise
        self.db.execute("delete from pending where user_id=?", (user_id,))
        self.db.commit()

    def publish_prototype(self, user_id, filename, raw, author, progress):
        progress.update("Проверяю архив…")
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
        progress.update("Загружаю на сервер…")
        commit = self.github.commit_files(files, removed, f"Publish prototype {slug} by {author.get('username') or author.get('first_name')}")
        url = f"{self.settings.public_base_url}/{prefix}"
        progress.update("Жду публикацию страницы…")
        published, reason = self.monitor_publication(
            f"prototype {slug}", commit, lambda: self.wait_for_publication(url),
            lambda: self.prototype_publication_reason(url),
        )
        if published:
            progress.update(f"Загружено ✓\n\n{url}")
            self.notify_publication_result(
                f"@yatraveldesign_bot: прототип {slug} опубликован. Автор: {author.get('username') or author.get('first_name')}. {url}"
            )
        else:
            progress.update(f"Ошибка публикации: {reason}")
            self.notify_publication_result(f"@yatraveldesign_bot: прототип {slug} не опубликован. Причина: {reason}")

    @staticmethod
    def wait_for_publication(url):
        """Avoid declaring success before GitHub Pages serves the uploaded page."""
        deadline = time.monotonic() + PUBLIC_ARTIFACT_TIMEOUT_SECONDS
        while True:
            try:
                request = urllib.request.Request(f"{url}?published={int(time.time())}", method="HEAD", headers={"Cache-Control": "no-cache"})
                with urllib.request.urlopen(request, timeout=12) as response:
                    if response.status == 200:
                        return True
            except urllib.error.URLError:
                pass
            if time.monotonic() >= deadline:
                return False
            time.sleep(PUBLIC_ARTIFACT_POLL_SECONDS)

    @staticmethod
    def prototype_publication_reason(url):
        try:
            request = urllib.request.Request(f"{url}?published={int(time.time())}", method="HEAD", headers={"Cache-Control": "no-cache"})
            with urllib.request.urlopen(request, timeout=12) as response:
                return f"GitHub Pages вернул HTTP {response.status}, но не подтвердил страницу"
        except urllib.error.HTTPError as exc:
            return f"GitHub Pages вернул HTTP {exc.code}"
        except urllib.error.URLError as exc:
            return f"GitHub Pages недоступен: {exc.reason}"

    def publish_skill(self, user_id, filename, raw, author, progress, storefront_name=None, custom_prompt=None):
        if progress:
            progress.update("Проверяю скилл…")
        identifier, name, version, description, display_name, display_description, dependencies, package = skill_package(filename, raw)
        updated_at = int(time.time())
        # Read the catalog only after synchronizing. commit_files() also syncs
        # before writing, but reading first could build a new catalog from a
        # stale checkout and silently drop contributors added remotely.
        self.github.sync()
        catalog = self.github.read_json("skills/catalog.json", [])
        existing = existing_catalog_item(catalog, identifier, name)
        is_update = existing is not None
        if existing:
            identifier = existing["id"]
            if not is_technical_label(existing["name"]):
                display_name = existing["name"]
        if storefront_name:
            display_name = storefront_name
        contributors = recent_contributors(existing, author)
        updated_by = author.get("username") or author.get("first_name")
        prefix = f"skills/{identifier}/"
        item = {
            "id": identifier, "name": display_name, "version": version, "description": display_description,
            "updated_by": updated_by, "updated_at": updated_at, "contributors": contributors,
        }
        if custom_prompt:
            item["prompt"] = custom_prompt
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
        marketplace_files, marketplace_removals = skill_marketplace_changes(self.github, catalog, identifier, package)
        files.update(marketplace_files)
        removals.extend(marketplace_removals)
        if progress:
            progress.update("Загружаю на сервер…")
        commit = self.github.commit_files(files, removals, f"Update skill {display_name}")
        self.configure_menu()
        if progress:
            progress.update("Жду публикацию скилла…")
        published, reason = self.monitor_publication(
            f"skill {identifier}", commit, lambda: self.wait_for_skill_publication(identifier, updated_at, commit),
            lambda: self.skill_publication_reason(identifier, updated_at, commit),
        )
        if published:
            prompt = codex_installation_prompt(identifier, self.settings.repository, self.settings.branch)
            team_text = f"Обновился скилл {display_name}" if is_update else f"Новый скил {display_name}\n\n{display_description}"
            self.notify_team_publication(team_text, prompt, identifier)
            if progress:
                progress.update("Загружено ✓\n\nСкилл опубликован в Skill store.")
            else:
                self.send(author_chat(author), "Скилл опубликован в Skill store.")
            self.notify_publication_result(
                f"@yatraveldesign_bot: скил {identifier} опубликован в Skill store. Автор: {author.get('username') or author.get('first_name')}"
            )
        else:
            if progress:
                progress.update(f"Ошибка публикации скилла: {reason}")
            else:
                self.send(author_chat(author), f"Скил не опубликован. Причина: {reason}")
            self.notify_publication_result(f"@yatraveldesign_bot: скил {identifier} не опубликован. Причина: {reason}")

    def wait_for_skill_publication(self, identifier, updated_at, commit):
        raw_root = f"https://raw.githubusercontent.com/{self.settings.repository}/{commit}"
        catalog_url = f"{raw_root}/skills/catalog.json?updated={updated_at}"
        package_url = f"{raw_root}/skills/{identifier}/skill.zip?updated={updated_at}"
        for attempt in range(3):
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
            if attempt < 2:
                time.sleep(2)
        return False

    def skill_publication_reason(self, identifier, updated_at, commit):
        raw_root = f"https://raw.githubusercontent.com/{self.settings.repository}/{commit}"
        catalog_url = f"{raw_root}/skills/catalog.json?updated={updated_at}"
        package_url = f"{raw_root}/skills/{identifier}/skill.zip?updated={updated_at}"
        try:
            with urllib.request.urlopen(urllib.request.Request(catalog_url, headers={"Cache-Control": "no-cache"}), timeout=12) as response:
                catalog = json.load(response)
            if not any(item.get("id") == identifier and item.get("updated_at") == updated_at for item in catalog):
                return "GitHub отдал каталог без новой версии скила"
            with urllib.request.urlopen(urllib.request.Request(package_url, method="HEAD", headers={"Cache-Control": "no-cache"}), timeout=12) as response:
                return f"GitHub вернул HTTP {response.status} для архива скила, но не подтвердил публикацию"
        except urllib.error.HTTPError as exc:
            return f"GitHub вернул HTTP {exc.code} для каталога или архива скила"
        except (urllib.error.URLError, ValueError, json.JSONDecodeError) as exc:
            return f"GitHub не подтвердил каталог скила: {exc}"

    def github_actions_status(self, commit):
        url = f"https://api.github.com/repos/{self.settings.repository}/actions/runs?head_sha={urllib.parse.quote(commit)}&event=push&per_page=20"
        request = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "yatraveldesign-bot"})
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                runs = json.load(response).get("workflow_runs", [])
        except urllib.error.HTTPError as exc:
            if exc.code in (403, 429):
                return "unavailable", f"GitHub Actions пока недоступен: {exc}"
            return "waiting", f"GitHub Actions пока недоступен: {exc}"
        except (urllib.error.URLError, ValueError, json.JSONDecodeError) as exc:
            return "waiting", f"GitHub Actions пока недоступен: {exc}"
        pages_runs = [
            run for run in runs
            if run.get("name") == "Publish prototypes" and run.get("head_sha") == commit
        ]
        if not pages_runs:
            return "waiting", "GitHub Actions ещё не создал Pages workflow для commit"
        run = max(pages_runs, key=lambda item: item.get("created_at", ""))
        if run.get("status") != "completed":
            return "waiting", "GitHub Pages ещё собирает публикацию"
        if run.get("conclusion") == "success":
            return "success", None
        return "failed", f"GitHub Pages завершился со статусом {run.get('conclusion') or 'unknown'}"

    def wait_for_github_actions(self, commit, on_wait=None):
        deadline = time.monotonic() + GITHUB_ACTIONS_TIMEOUT_SECONDS
        last_reason = "GitHub Actions не дал статус"
        while True:
            status, detail = self.github_actions_status(commit)
            if status == "success":
                return True, None
            if status == "failed":
                return False, detail
            if status == "unavailable":
                # Do not keep querying an unauthenticated endpoint after its quota
                # is exhausted. The public artefact remains the fallback proof.
                return None, detail
            last_reason = detail
            if on_wait:
                on_wait()
            if time.monotonic() >= deadline:
                return False, last_reason
            time.sleep(GITHUB_ACTIONS_POLL_SECONDS)

    def monitor_publication(self, subject, commit, checker, reason, on_wait=None):
        """Wait for the exact commit's Pages workflow, then verify the public artefact."""
        if not commit:
            return (True, None) if checker() else (False, reason())
        workflow_ok, workflow_reason = self.wait_for_github_actions(commit, on_wait)
        if workflow_ok and checker():
            return True, None
        if workflow_ok is None:
            # A rate-limited status endpoint cannot prove that Pages failed. Never
            # create retry commits until the public artefact itself is missing.
            return (True, None) if checker() else (False, workflow_reason or reason())
        initial_reason = workflow_reason or reason()
        last_reason = initial_reason
        for attempt in range(1, PUBLICATION_REPAIR_ATTEMPTS + 1):
            try:
                retry_commit = self.github.retry_pages_deployment(f"{subject} attempt {attempt}")
            except GithubError as exc:
                last_reason = f"{initial_reason}; повторный деплой {attempt} не запущен: {exc}"
                continue
            workflow_ok, workflow_reason = self.wait_for_github_actions(retry_commit, on_wait)
            if workflow_ok and checker():
                return True, initial_reason
            last_reason = workflow_reason or reason()
        return False, last_reason

    def skill_installation_options(self, identifier, prompt):
        url = f"{self.settings.public_base_url}/skills/install.html?skill={urllib.parse.quote(identifier, safe='')}"
        buttons = []
        if len(prompt) <= 256:
            buttons.append([{"text": "Скопировать промпт", "copy_text": {"text": prompt}}])
        else:
            buttons.append([{"text": "Промпт для установки", "url": url + "#first-time"}])
        buttons.append([{"text": "Открыть установку в ChatGPT", "url": url + "#connected"}])
        note = "\n\nВпервые? Скопируйте промпт на странице установки и вставьте в ChatGPT — он подключит командный каталог и установит скилл. Каталог уже подключён? Откройте карточку установки на Mac."
        return note, {"reply_markup": {"inline_keyboard": buttons}}

    def notify_team_publication(self, text, prompt=None, identifier=None):
        state_path = getattr(self.settings, "state_path", None)
        if not state_path:
            return
        config_path = os.path.join(os.path.dirname(state_path), "publication-chat.json")
        try:
            with open(config_path) as stream:
                config = json.load(stream)
            chat_id = config["chat_id"]
            if not isinstance(chat_id, int) or chat_id >= 0:
                raise ValueError("Publication destination must be a group")
            extra = {}
            if identifier and prompt:
                note, extra = self.skill_installation_options(identifier, prompt)
                text += note
            elif prompt:
                if len(prompt) <= 256:
                    extra["reply_markup"] = {"inline_keyboard": [[{"text": "Скопировать промпт", "copy_text": {"text": prompt}}]]}
                else:
                    text += f"\n\nПромпт установки:\n{prompt}"
            self.send(chat_id, text, **extra)
        except FileNotFoundError:
            return
        except Exception as exc:
            # A notification failure must not replay a successful publication.
            print(f"Не удалось отправить отбивку в группу: {type(exc).__name__}", flush=True)

    @staticmethod
    def notify_publication_result(message):
        """Report a verified Pages failure or recovery to Yuriy's Yoshi chat."""
        try:
            result = subprocess.run(
                ["bash", YURIYOS_NOTIFY_SCRIPT, "travel-design-publication", message],
                env={**os.environ, "YURIYOS_ALERT_CHAT_ID": "335833483"}, timeout=40,
            )
            if result.returncode:
                print("Не удалось отправить уведомление о публикации", flush=True)
        except (OSError, subprocess.TimeoutExpired):
            print("Не удалось запустить уведомление о публикации", flush=True)

    def callback(self, query):
        try:
            self.telegram("answerCallbackQuery", {"callback_query_id": query["id"]})
        except RuntimeError as exc:
            # Expired button acknowledgements must not block the update queue.
            if "query is too old" not in str(exc).lower() and "query id is invalid" not in str(exc).lower():
                raise
        data = query.get("data", "")
        chat_id = query["message"]["chat"]["id"]
        if data.startswith("skdelete:"):
            try:
                self.skill_delete_callback(query)
            except (UserError, GithubError) as exc:
                self.send(chat_id, f"Ошибка удаления: {exc}")
            return
        if data.startswith("proto:"):
            try:
                self.prototype_delete_callback(query)
            except (UserError, GithubError) as exc:
                self.send(chat_id, f"Ошибка удаления: {exc}")
            return
        if data == "skills:upload":
            self.begin_skill_upload(chat_id, query["from"]["id"])
        elif data == "skill:publish":
            try:
                self.publish_pending_skill(query["from"]["id"])
            except UserError as error:
                self.send(chat_id, str(error))
        elif data == "skill:configure":
            pending = self.pending_skill(query["from"]["id"])
            if not pending or pending[0] != "skill:review":
                self.send(chat_id, "Нет скила, ожидающего настройки.")
            else:
                self.db.execute("update pending set action='skill:storefront_name' where user_id=?", (query["from"]["id"],))
                self.db.commit()
                self.send(chat_id, "Пришлите имя для витрины Skill store.")
        elif data.startswith("skill:"):
            identifier = data.split(":", 1)[1]
            item = next((item for item in self.github.read_json("skills/catalog.json", []) if item["id"] == identifier), None)
            if not item:
                self.send(chat_id, "Скил больше недоступен.")
            else:
                updated = short_russian_date(item["updated_at"])
                try:
                    dependency_closure(self.github.read_json("skills/catalog.json", []), identifier)
                except UserError as error:
                    self.send(chat_id, str(error))
                    return
                prompt = codex_installation_prompt(identifier, self.settings.repository, self.settings.branch)
                note, extra = self.skill_installation_options(identifier, prompt)
                self.send(chat_id, f"{item['name']}\n{item['description']}\nОбновлено: {updated} · {item['updated_by']}{note}", **extra)

    def pending_text(self, message):
        user_id = message["from"]["id"]
        pending = self.pending_skill(user_id)
        if not pending:
            return False
        action, _, _, _, _, _, _ = pending
        text = message.get("text", "").strip()
        if action == "skill:storefront_name":
            if not text or len(text) > 100:
                self.send(message["chat"]["id"], "Имя должно содержать от 1 до 100 символов.")
                return True
            self.db.execute("update pending set action='skill:custom_prompt', name=? where user_id=?", (text, user_id))
            self.db.commit()
            self.send(message["chat"]["id"], "Пришлите дополнительные инструкции автора для карточки скилла. Установка через командный каталог останется стандартной.")
            return True
        if action == "skill:custom_prompt":
            if not text or len(text) > 3500:
                self.send(message["chat"]["id"], "Промпт должен содержать от 1 до 3500 символов.")
                return True
            self.db.execute("update pending set action='skill:review', version=? where user_id=?", (text, user_id))
            self.db.commit()
            self.send(message["chat"]["id"], "Настройки сохранены.", reply_markup={"inline_keyboard": [[{"text": "Опубликовать", "callback_data": "skill:publish"}]]})
            return True
        return False

    def handle(self, update):
        # Groups are outbound-only: never accept uploads, commands or callbacks.
        incoming = update.get("message") or update.get("callback_query", {}).get("message")
        if incoming and incoming.get("chat", {}).get("type") != "private":
            return
        if "callback_query" in update:
            self.callback(update["callback_query"])
            return
        message = update.get("message")
        if not message:
            return
        text = message.get("text", "")
        if text == "/start" or text == "Меню":
            self.start(message)
        elif text == "/delete_skill":
            self.delete_skill_menu(message)
        elif text == "/delete_prototype":
            self.delete_prototype_menu(message)
        elif text == "/prototypes":
            self.prototypes(message)
        elif "document" in message:
            try:
                self.publish_document(message)
            except UserError as exc:
                self.send(message["chat"]["id"], str(exc))
                document = message["document"]
                author = message["from"]
                self.notify_publication_result(
                    f"@yatraveldesign_bot: ошибка загрузки файла {document.get('file_name', 'без имени')} от {author.get('username') or author.get('first_name')}. Причина: {exc}"
                )
            except Exception as exc:
                print(exc, flush=True)
                document = message["document"]
                author = message["from"]
                self.notify_publication_result(
                    f"@yatraveldesign_bot: ошибка загрузки файла {document.get('file_name', 'без имени')} от {author.get('username') or author.get('first_name')}. Причина: {type(exc).__name__}: {exc}"
                )
                raise
        elif not self.pending_text(message):
            self.send(message["chat"]["id"], "Пришли ZIP-архив с прототипом или со скилом. Все скилы доступны в меню бота.")

    def run(self):
        self.db.execute("insert or replace into bot_state values ('started_at', ?)", (str(time.time()),))
        self.db.commit()
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
                self.db.execute("insert or replace into bot_state values ('poll_ok_at', ?)", (str(time.time()),))
                self.db.commit()
                for update in updates:
                    offset = self.process_update(update)
            except Exception as exc:
                self.db.rollback()
                print(exc, flush=True)
                time.sleep(5)

    def process_update(self, update):
        """Acknowledge only completed updates, including after a restart."""
        update_id = update["update_id"]
        if not self.db.execute("select 1 from seen_updates where id=?", (update_id,)).fetchone():
            self.handle(update)
            self.db.execute("insert into seen_updates values (?)", (update_id,))
        offset = update_id + 1
        self.db.execute("insert or replace into bot_state values ('offset', ?)", (str(offset),))
        self.db.commit()
        return offset


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
    for item in sorted(catalog, key=lambda value: value["updated_at"], reverse=True)[:15]:
        url = f"{public_base_url}/{item['url']}"
        title = html.escape(item["title"])
        author = html.escape(item["author"])
        updated = short_russian_date(item["updated_at"])
        rows.append(f'<a href="{html.escape(url, quote=True)}">{title}</a>\n{author} · {updated}')
    return "\n\n".join(rows)


if __name__ == "__main__":
    Bot(Settings.from_env()).run()

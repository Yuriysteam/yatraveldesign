import io
import json
import os
import sqlite3
import subprocess
import unittest
import zipfile
from types import SimpleNamespace
from unittest.mock import Mock, patch

os.environ.setdefault("TELEGRAM_BOT_TOKEN", "token")
os.environ.setdefault("GIT_WORKTREE", ".")
os.environ.setdefault("ALLOWED_USER_IDS", "1")
import bot


def archive(entries):
    raw = io.BytesIO()
    with zipfile.ZipFile(raw, "w") as z:
        for name, content in entries.items():
            z.writestr(name, content)
    return raw.getvalue()


class BotTests(unittest.TestCase):
    def test_team_notification_contains_install_prompt(self):
        instance = bot.Bot.__new__(bot.Bot)
        instance.settings = SimpleNamespace(state_path="/tmp/state.sqlite3")
        instance.send = Mock()
        with patch("builtins.open", unittest.mock.mock_open(read_data='{"chat_id": -123}')):
            instance.notify_team_publication("Скил опубликован", "Установи скил")
        args, kwargs = instance.send.call_args
        self.assertEqual(args[0], -123)
        self.assertEqual(args[1], "Скил опубликован")
        self.assertEqual(kwargs["reply_markup"]["inline_keyboard"][0][0]["copy_text"]["text"], "Установи скил")
        instance.send.side_effect = RuntimeError("network")
        with patch("builtins.open", unittest.mock.mock_open(read_data='{"chat_id": -123}')):
            instance.notify_team_publication("Скил опубликован")

    def test_codex_install_prompt_connects_refreshes_and_installs_selected_plugin(self):
        prompt = bot.codex_installation_prompt("agenda")
        self.assertIn("Если travel-design ещё не подключён", prompt)
        self.assertIn("codex plugin marketplace add Yuriysteam/yatraveldesign --ref main --sparse .agents/plugins --sparse plugins", prompt)
        self.assertIn("codex plugin marketplace upgrade travel-design", prompt)
        self.assertIn("codex plugin add agenda@travel-design --json", prompt)
        self.assertNotIn("skill.zip", prompt)
        with self.assertRaises(bot.UserError):
            bot.codex_installation_prompt("../bad; command")

    def test_codex_install_options_use_https_and_handle_telegram_copy_limit(self):
        instance = bot.Bot.__new__(bot.Bot)
        instance.settings = SimpleNamespace(public_base_url="https://example.test")
        for prompt in ("Установи скилл", "x" * 257):
            note, options = instance.skill_installation_options("agenda", prompt)
            buttons = options["reply_markup"]["inline_keyboard"]
            self.assertEqual(len(buttons), 2)
            if len(prompt) <= 256:
                self.assertEqual(buttons[0][0]["copy_text"]["text"], prompt)
            else:
                self.assertEqual(buttons[0][0]["url"], "https://example.test/skills/install.html?skill=agenda#first-time")
            self.assertEqual(buttons[1][0]["url"], "https://example.test/skills/install.html?skill=agenda#connected")
            self.assertIn("Каталог уже подключён", note)

    def test_team_notification_and_skill_callback_offer_both_install_methods(self):
        instance = bot.Bot.__new__(bot.Bot)
        instance.settings = SimpleNamespace(state_path="/tmp/state.sqlite3", public_base_url="https://example.test", repository="Yuriysteam/yatraveldesign", branch="main")
        instance.send = Mock()
        instance.telegram = Mock()
        prompt = bot.codex_installation_prompt("agenda")
        with patch("builtins.open", unittest.mock.mock_open(read_data='{"chat_id": -123}')):
            instance.notify_team_publication("Новый скил Agenda", prompt, "agenda")
        self.assertEqual(len(instance.send.call_args.kwargs["reply_markup"]["inline_keyboard"]), 2)
        item = {"id": "agenda", "name": "Agenda", "description": "Описание", "updated_at": 1, "updated_by": "team", "prompt": "Установи старый ZIP"}
        instance.github = SimpleNamespace(read_json=Mock(return_value=[item]))
        instance.callback({"id": "cb", "data": "skill:agenda", "from": {"id": 1}, "message": {"chat": {"id": 1}}})
        buttons = instance.send.call_args.kwargs["reply_markup"]["inline_keyboard"]
        self.assertEqual(len(buttons), 2)
        self.assertIn("install.html?skill=agenda", buttons[0][0]["url"])
        self.assertNotIn("старый ZIP", instance.send.call_args.args[1])

    def test_group_inputs_are_silently_ignored(self):
        instance = bot.Bot.__new__(bot.Bot)
        instance.send = Mock()
        instance.publish_document = Mock()
        instance.start = Mock()
        instance.callback = Mock()
        for kind in ("group", "supergroup", "channel"):
            for content in ({"document": {"file_name": "demo.zip"}}, {"text": "/start"}, {"text": "hello"}):
                instance.handle({"message": {"chat": {"id": -123, "type": kind}, **content}})
            instance.handle({"callback_query": {"message": {"chat": {"id": -123, "type": kind}}, "data": "skills:upload"}})
        instance.send.assert_not_called()
        instance.publish_document.assert_not_called()
        instance.start.assert_not_called()
        instance.callback.assert_not_called()

    def test_failed_update_does_not_advance_offset(self):
        instance = bot.Bot.__new__(bot.Bot)
        instance.db = sqlite3.connect(":memory:")
        instance.db.executescript("create table seen_updates(id integer primary key); create table bot_state(key text primary key, value text); insert into bot_state values('offset','7');")
        with patch.object(instance, "handle", side_effect=RuntimeError("offline")):
            with self.assertRaises(RuntimeError):
                instance.process_update({"update_id": 7})
        self.assertEqual(instance.db.execute("select value from bot_state").fetchone()[0], "7")
        with patch.object(instance, "handle") as handle:
            self.assertEqual(instance.process_update({"update_id": 7}), 8)
            self.assertEqual(instance.process_update({"update_id": 7}), 8)
            handle.assert_called_once()
        instance.db.close()

    def test_successful_prototype_notifies_yuriy(self):
        instance = bot.Bot.__new__(bot.Bot)
        instance.settings = SimpleNamespace(public_base_url="https://example.test")
        instance.github = SimpleNamespace(
            files_below=lambda _: [],
            read_json=lambda *_: [],
            commit_files=lambda *_: "commit",
        )
        instance.send = Mock()
        instance.notify_team_publication = Mock()
        instance.monitor_publication = Mock(return_value=(True, None))
        instance.notify_publication_result = Mock()
        with patch("bot.safe_zip_members", return_value=[("index.html", b"ok")]), patch("bot.enrich_metadata", return_value=("Demo", "Описание")):
            instance.publish_prototype(1, "demo.zip", b"zip", {"id": 1, "first_name": "Анна", "username": "anna"}, Mock(advance=lambda: None))
        instance.notify_publication_result.assert_called_once_with(
            "@yatraveldesign_bot: прототип demo опубликован. Автор: anna. https://example.test/prototypes/1/demo/"
        )
        instance.notify_team_publication.assert_not_called()

    def test_updated_skill_notifies_team_with_update_label_and_install_prompt(self):
        instance = bot.Bot.__new__(bot.Bot)
        existing = {
            "id": "team-skill", "name": "Командный скил", "version": "v0.1",
            "description": "Старая версия", "updated_at": 1, "contributors": [],
        }
        instance.settings = SimpleNamespace(repository="owner/repo", branch="main")
        instance.github = SimpleNamespace(
            sync=Mock(),
            read_json=Mock(return_value=[existing]),
            files_below=Mock(return_value=[]),
            commit_files=Mock(return_value="commit"),
        )
        instance.github.read_json.side_effect = lambda path, fallback: fallback if path == bot.MARKETPLACE_PATH else instance.github.read_json.return_value
        instance.configure_menu = Mock()
        instance.monitor_publication = Mock(return_value=(True, None))
        instance.notify_team_publication = Mock()
        instance.notify_publication_result = Mock()
        instance.send = Mock()
        package = {"SKILL.md": b"---\\nname: team-skill\\nversion: v0.2\\n---"}
        with patch("bot.skill_package", return_value=(
            "team-skill", "team-skill", "v0.2", "Новое описание", "Team skill", "Новое описание", [], package,
        )):
            instance.publish_skill(1, "team-skill.zip", b"zip", {"id": 1, "username": "anna"}, Mock(advance=lambda: None), custom_prompt="Установи ровно этот скил")
        text, prompt, identifier = instance.notify_team_publication.call_args.args
        self.assertEqual(text, "Обновился скилл Командный скил")
        self.assertEqual(identifier, "team-skill")
        self.assertEqual(prompt, bot.codex_installation_prompt("team-skill", "owner/repo", "main"))
        files = instance.github.commit_files.call_args.args[0]
        self.assertEqual(json.loads(files["skills/catalog.json"])[0]["prompt"], "Установи ровно этот скил")

    def test_skill_review_offers_publish_or_customize(self):
        instance = bot.Bot.__new__(bot.Bot)
        instance.db = sqlite3.connect(":memory:")
        instance.db.execute("create table pending (user_id integer primary key, action text not null, name text, version text, filename text, raw blob, author text, identifier text)")
        instance.settings = SimpleNamespace(repository="owner/repo", branch="main")
        instance.github = SimpleNamespace(sync=Mock(), read_json=Mock(return_value=[]))
        instance.send = Mock()
        package = {"SKILL.md": b"---\nname: smoke\nversion: v0.1\n---"}
        with patch("bot.skill_package", return_value=("smoke", "Smoke", "v0.1", "", "Smoke skill", "", [], package)):
            instance.review_skill(1, "smoke.zip", b"zip", {"id": 1, "username": "anna"})
        self.assertEqual(instance.pending_skill(1)[0], "skill:review")
        markup = instance.send.call_args.kwargs["reply_markup"]
        self.assertEqual([button["text"] for button in markup["inline_keyboard"][0]], ["Опубликовать как есть", "Настроить"])

    def test_customize_skill_collects_name_then_replacing_prompt(self):
        instance = bot.Bot.__new__(bot.Bot)
        instance.db = sqlite3.connect(":memory:")
        instance.db.execute("create table pending (user_id integer primary key, action text not null, name text, version text, filename text, raw blob, author text, identifier text)")
        instance.db.execute("insert into pending values (1, 'skill:storefront_name', 'Old', 'Automatic', 'smoke.zip', x'00', '{}', 'smoke')")
        instance.send = Mock()
        self.assertTrue(instance.pending_text({"from": {"id": 1}, "chat": {"id": 1}, "text": "Smoke showcase"}))
        self.assertEqual(instance.pending_skill(1)[:3], ("skill:custom_prompt", "Smoke showcase", "Automatic"))
        self.assertTrue(instance.pending_text({"from": {"id": 1}, "chat": {"id": 1}, "text": "Мой полный промпт"}))
        self.assertEqual(instance.pending_skill(1)[:3], ("skill:review", "Smoke showcase", "Мой полный промпт"))

    def test_upload_validation_error_notifies_yuriy_with_reason(self):
        instance = bot.Bot.__new__(bot.Bot)
        instance.send = Mock()
        instance.publish_document = Mock(side_effect=bot.UserError("В ZIP не найдена HTML-страница."))
        instance.notify_publication_result = Mock()
        instance.handle({"message": {"chat": {"id": 123, "type": "private"}, "from": {"id": 1, "username": "anna"}, "document": {"file_name": "demo.zip"}}})
        instance.notify_publication_result.assert_called_once_with(
            "@yatraveldesign_bot: ошибка загрузки файла demo.zip от anna. Причина: В ZIP не найдена HTML-страница."
        )

    def test_git_timeout_becomes_a_publication_error(self):
        repository = bot.GitRepository.__new__(bot.GitRepository)
        repository.root = "."
        with patch("bot.subprocess.run", side_effect=subprocess.TimeoutExpired("git", 60)):
            with self.assertRaisesRegex(bot.GithubError, "60 секунд"):
                repository.git("push")

    def test_detects_technical_labels_but_keeps_human_names(self):
        self.assertTrue(bot.is_technical_label("travel-feature-check"))
        self.assertTrue(bot.is_technical_label("calendar-cli"))
        self.assertFalse(bot.is_technical_label("Адженда"))
        self.assertFalse(bot.is_technical_label("Создание прототипов"))

    def test_accepts_a_static_prototype(self):
        members = bot.safe_zip_members(archive({"index.html": "<h1>OK</h1>", "assets/app.css": "body{}"}))
        self.assertEqual([name for name, _ in members], ["index.html", "assets/app.css"])

    def test_creates_index_for_a_single_named_html_entrypoint(self):
        members = bot.safe_zip_members(archive({"flight-flow.html": "<html><head></head><body>OK</body></html>"}))
        published = dict(members)
        self.assertIn("flight-flow.html", published)
        self.assertIn("index.html", published)
        self.assertEqual(published["index.html"], published["flight-flow.html"])

    def test_unwraps_a_single_named_html_entrypoint_for_the_catalog_url(self):
        members = bot.safe_zip_members(archive({"flight-flow/main.html": "<h1>OK</h1>", "flight-flow/assets/app.css": "body{}"}))
        self.assertEqual([name for name, _ in members], ["main.html", "assets/app.css", "index.html"])

    def test_rejects_ambiguous_root_html_entrypoints(self):
        with self.assertRaisesRegex(bot.UserError, "несколько HTML"):
            bot.safe_zip_members(archive({"first.html": "<h1>First</h1>", "second.html": "<h1>Second</h1>"}))

    def test_unwraps_a_single_archive_root_for_the_catalog_url(self):
        members = bot.safe_zip_members(archive({
            "adaptive-filters/index.html": '<link href="assets/app.css">',
            "adaptive-filters/assets/app.css": "body{}",
        }))
        self.assertEqual([name for name, _ in members], ["index.html", "assets/app.css"])

    def test_rejects_zip_slip(self):
        with self.assertRaisesRegex(bot.UserError, "небезопасный"):
            bot.safe_zip_members(archive({"../index.html": "x"}))

    def test_rejects_archive_without_html(self):
        with self.assertRaisesRegex(bot.UserError, "HTML"):
            bot.safe_zip_members(archive({"readme.txt": "x"}))

    def test_rejects_broken_prototype_file_references(self):
        with self.assertRaisesRegex(bot.UserError, "index.html → assets/app.js"):
            bot.safe_zip_members(archive({"index.html": '<script src="assets/app.js"></script>'}))

    def test_accepts_relative_and_external_prototype_references(self):
        members = bot.safe_zip_members(archive({
            "index.html": '<link href="assets/style.css"><a href="https://example.test">Link</a>',
            "assets/style.css": 'body { background: url("image.png") }',
            "assets/image.png": b"image",
        }))
        self.assertEqual(len(members), 3)

    def test_rejects_duplicate_paths(self):
        raw = io.BytesIO()
        with zipfile.ZipFile(raw, "w") as z:
            z.writestr("index.html", "a")
            z.writestr("INDEX.HTML", "b")
        with self.assertRaisesRegex(bot.UserError, "повторяющиеся"):
            bot.safe_zip_members(raw.getvalue())

    def test_reads_nested_skill_package(self):
        raw = archive({"my-skill/SKILL.md": "---\nname: Research helper\nversion: v0.1\ndescription: Finds sources\n---\n# Research", "my-skill/tools/run.sh": "#!/bin/sh"})
        with patch("bot.enrich_metadata", return_value=("Research helper", "Finds sources.")):
            identifier, name, version, description, display_name, display_description, dependencies, files = bot.skill_package("my-skill.zip", raw)
        self.assertEqual(identifier, "research-helper")
        self.assertEqual(name, "Research helper")
        self.assertEqual(version, "v0.1")
        self.assertEqual(description, "Finds sources")
        self.assertEqual(display_name, "Research helper")
        self.assertEqual(display_description, "Finds sources.")
        self.assertEqual(dependencies, [])
        self.assertEqual(set(files), {"my-skill/SKILL.md", "my-skill/tools/run.sh"})

    def test_reads_folded_skill_description(self):
        source = """---
name: yandex-travel-ux-writing
version: v0.1
description: >-
  UX-редактор для дизайнеров Яндекс Путешествий.
  Опирается на ToV и редполитику команды.
---
""".encode()
        with patch("bot.enrich_metadata", side_effect=lambda _, name, description="": (name, description)):
            _, _, version, description, _, display_description, _, _ = bot.skill_package("SKILL.md", source)
        self.assertEqual(version, "v0.1")
        expected = "UX-редактор для дизайнеров Яндекс Путешествий. Опирается на ToV и редполитику команды."
        self.assertEqual(description, expected)
        self.assertEqual(display_description, expected)

    def test_preserves_every_skill_in_a_multi_skill_archive(self):
        raw = archive({
            "travel-kit/research/SKILL.md": "---\nname: Research\nversion: v0.1\ndescription: Research skill\n---\n",
            "travel-kit/research/tools/search.sh": "#!/bin/sh",
            "travel-kit/writing/SKILL.md": "---\nname: Writing\nversion: v0.1\ndescription: Writing skill\n---\n",
        })
        with patch("bot.enrich_metadata", return_value=("Travel kit", "Набор скилов.")):
            identifier, name, _, _, _, _, _, files = bot.skill_package("travel-kit.zip", raw)
        self.assertEqual(identifier, "travel-kit")
        self.assertEqual(name, "travel-kit")
        self.assertEqual(set(files), {
            "travel-kit/research/SKILL.md", "travel-kit/research/tools/search.sh", "travel-kit/writing/SKILL.md",
        })
        with zipfile.ZipFile(io.BytesIO(bot.make_zip(files))) as published:
            self.assertEqual(set(published.namelist()), set(files))

    def test_bundle_does_not_require_its_own_skills_from_the_catalogue(self):
        raw = archive({
            "bundle/SKILL.md": "---\nname: Main\nversion: v0.1\nmetadata:\n  dependencies: [helper, external]\n---\n",
            "bundle/helper/SKILL.md": "---\nname: Helper\nversion: v0.1\n---\n",
        })
        with patch("bot.enrich_metadata", return_value=("Bundle", "Набор скилов.")):
            *_, dependencies, _ = bot.skill_package("bundle.zip", raw)
        self.assertEqual(dependencies, ["external"])

    def test_detects_root_installer_for_a_skill_bundle(self):
        files = {
            "kit/README.md": b"# Kit",
            "kit/install.py": b"#!/usr/bin/env python3",
            "kit/Skills/router/SKILL.md": b"---\nname: Router\nversion: v0.1\n---",
        }
        self.assertEqual(bot.bundle_installer(files), "kit")

    def test_does_not_treat_a_nested_skill_script_as_the_bundle_installer(self):
        files = {
            "kit/README.md": b"# Kit",
            "kit/Skills/builder/install.py": b"#!/bin/sh",
            "kit/Skills/builder/SKILL.md": b"---\nname: Builder\nversion: v0.1\n---",
        }
        self.assertIsNone(bot.bundle_installer(files))

    def test_reads_single_skill_file(self):
        with patch("bot.enrich_metadata", return_value=("Solo", "Без описания")):
            identifier, name, _, _, display_name, _, dependencies, files = bot.skill_package("SKILL.md", b"---\nname: Solo\nversion: v0.1\n---\n# Solo")
        self.assertEqual(identifier, "solo")
        self.assertEqual(name, "Solo")
        self.assertEqual(dependencies, [])
        self.assertEqual(set(files), {"SKILL.md"})

    def test_detects_skill_from_zip_contents(self):
        self.assertEqual(bot.detect_upload("anything.zip", archive({"folder/SKILL.md": "---\nname: A\n---"})), "skill")

    def test_detects_prototype_from_zip_contents(self):
        self.assertEqual(bot.detect_upload("anything.zip", archive({"build/index.html": "<h1>Demo</h1>"})), "prototype")

    def test_imported_skill_names_keep_existing_catalog_ids(self):
        with patch("bot.enrich_metadata", side_effect=lambda _, name, description="": (name, description)):
            calendar = bot.skill_package("SKILL.md", b'---\nname: yandex-calendar\nversion: v0.1\ndescription: Calendar\n---\n')
            memory = bot.skill_package("SKILL.md", b'---\nname: local-memory\nversion: v0.1\ndescription: Memory\n---\n')
        self.assertEqual(calendar[0], "calendar-cli")
        self.assertEqual(memory[0], "shared-durable-memory")

    def test_reads_and_normalizes_skill_dependencies(self):
        source = b'---\nname: agenda\nversion: v0.1\ndescription: Daily\nmetadata:\n  dependencies: [startrek-client, yandex-calendar, mail-corp, wiki-client]\n---\n'
        with patch("bot.enrich_metadata", return_value=("Agenda", "Daily")):
            _, _, _, _, _, _, dependencies, _ = bot.skill_package("SKILL.md", source)
        self.assertEqual(dependencies, ["startrek-client", "calendar-cli", "mail-corp", "wiki-client"])

    def test_rejects_malformed_skill_dependency_id(self):
        source = b'---\nname: agenda\nversion: v0.1\nmetadata:\n  dependencies: [../other-skill]\n---\n'
        with self.assertRaisesRegex(bot.UserError, "некорректный идентификатор"):
            bot.skill_package("SKILL.md", source)

    def test_requires_a_semantic_version_in_skill_metadata(self):
        with self.assertRaisesRegex(bot.UserError, "version: v0.1"):
            bot.skill_package("SKILL.md", b"---\nname: Unversioned\n---\n")

    def test_rejects_unknown_direct_upload(self):
        with self.assertRaisesRegex(bot.UserError, "Не удалось определить"):
            bot.detect_upload("anything.zip", archive({"readme.txt": "x"}))

    def test_installation_prompt_contains_download_link(self):
        prompt = bot.installation_prompt("Research", "https://example.test/skill.zip")
        self.assertIn("https://example.test/skill.zip", prompt)
        self.assertIn("всё его содержимое", prompt)
        self.assertLessEqual(len(prompt), 256)

    def test_self_installing_bundle_prompt_uses_preflight(self):
        prompt = bot.installation_prompt("Figma kit", "https://example.test/skill.zip", installer="figma-kit")
        self.assertIn("install.py --check", prompt)
        self.assertIn("не заменяй skills", prompt)
        self.assertLessEqual(len(prompt), 256)

    def test_dependency_prompt_points_to_catalog_and_stays_copyable(self):
        prompt = bot.installation_prompt("Адженда", "unused", "agenda", "https://example.test/skills/catalog.json", [{"id": "calendar-cli"}])
        self.assertIn("agenda", prompt)
        self.assertIn("catalog.json", prompt)
        self.assertIn("зависимост", prompt)
        self.assertLessEqual(len(prompt), 256)

    def test_short_russian_date_uses_three_letters_without_dot(self):
        self.assertEqual(bot.short_russian_date(1788607749), "5 сен")
        self.assertTrue(all(len(month) == 3 and "." not in month for month in bot.SHORT_RU_MONTHS))

    def test_known_contributor_uses_team_avatar(self):
        self.assertEqual(bot.contributor_from_author({"id": 335833483, "first_name": "Юрий"}), {
            "id": 335833483, "name": "Юрий Ширяев", "avatar": "yuriy.jpeg",
        })

    def test_recent_contributors_are_unique_ordered_and_limited(self):
        existing = {"contributors": [
            {"id": 2, "name": "Two", "avatar": "two.jpeg"},
            {"id": 1, "name": "Old name", "avatar": "old.jpeg"},
            {"id": 3, "name": "Three", "avatar": "three.jpeg"},
            {"id": 4, "name": "Four", "avatar": "four.jpeg"},
        ]}
        self.assertEqual(bot.recent_contributors(existing, {"id": 1, "first_name": "Current"}), [
            {"id": 1, "name": "Current", "avatar": "old.jpeg"},
            {"id": 2, "name": "Two", "avatar": "two.jpeg"},
            {"id": 3, "name": "Three", "avatar": "three.jpeg"},
        ])

    def test_recent_contributors_preserve_existing_avatar_when_name_changes(self):
        existing = {"contributors": [{"id": 1, "name": "Old name", "avatar": "yuriy.jpeg"}]}
        result = bot.recent_contributors(existing, {"id": 1, "first_name": "Current"})
        self.assertEqual(result[0], {"id": 1, "name": "Current", "avatar": "yuriy.jpeg"})

    def test_catalog_update_matches_stable_id_before_display_name(self):
        catalog = [{"id": "calendar-cli", "name": "Календарь"}]
        self.assertEqual(bot.existing_catalog_item(catalog, "calendar-cli", "yandex-calendar"), catalog[0])

    def test_dependency_closure_is_transitive_and_dependencies_come_first(self):
        catalog = [
            {"id": "agenda", "dependencies": ["calendar"]},
            {"id": "calendar", "dependencies": ["auth"]},
            {"id": "auth"},
        ]
        self.assertEqual([item["id"] for item in bot.dependency_closure(catalog, "agenda")], ["auth", "calendar", "agenda"])

    def test_dependency_closure_rejects_missing_and_cyclic_dependencies(self):
        with self.assertRaisesRegex(bot.UserError, "Не найдена зависимость"):
            bot.dependency_closure([{"id": "agenda", "dependencies": ["missing"]}], "agenda")
        with self.assertRaisesRegex(bot.UserError, "Циклическая зависимость"):
            bot.dependency_closure([
                {"id": "one", "dependencies": ["two"]},
                {"id": "two", "dependencies": ["one"]},
            ], "one")

    def test_splits_long_catalogue(self):
        chunks = bot.split_message("one\n\n" + "x" * 3999 + "\n\ntwo")
        self.assertEqual(chunks, ["one", "x" * 3999, "two"])

    def test_prototype_list_links_titles(self):
        text = bot.prototype_list_text([{"title": "<Test>", "author": "Yuriy", "updated_at": 0, "url": "prototypes/example/"}], "https://example.test")
        self.assertIn('<a href="https://example.test/prototypes/example/">&lt;Test&gt;</a>', text)

    def test_adds_noindex_to_html(self):
        result = bot.safe_zip_members(archive({"index.html": "<html><head></head><body>OK</body></html>"}))
        content = result[0][1]
        self.assertIn(b'<head>  <meta name="robots" content="noindex, nofollow, noarchive">\n</head>', content)
        self.assertNotIn(b'\\n', content)

    def test_wait_for_publication_accepts_http_200(self):
        class Response:
            status = 200
            def __enter__(self): return self
            def __exit__(self, *args): return False
        with patch("urllib.request.urlopen", return_value=Response()):
            self.assertTrue(bot.Bot.wait_for_publication("https://example.test/prototype/"))

    def test_wait_for_skill_publication_checks_the_committed_raw_urls(self):
        class Response:
            def __init__(self, body, status=200):
                self.body, self.status = io.BytesIO(body), status
            def read(self, *args): return self.body.read(*args)
            def __enter__(self): return self
            def __exit__(self, *args): return False
        instance = object.__new__(bot.Bot)
        instance.settings = SimpleNamespace(repository="example/repository", branch="main")
        catalog = b'[{"id":"research","updated_at":123}]'
        with patch("bot.urllib.request.urlopen", side_effect=[Response(catalog), Response(b"")]) as opened:
            self.assertTrue(instance.wait_for_skill_publication("research", 123, "abc123"))
        urls = [call.args[0].full_url for call in opened.call_args_list]
        self.assertEqual(urls, [
            "https://raw.githubusercontent.com/example/repository/abc123/skills/catalog.json?updated=123",
            "https://raw.githubusercontent.com/example/repository/abc123/skills/research/skill.zip?updated=123",
        ])

    def test_web_app_url_uses_the_current_revision(self):
        instance = object.__new__(bot.Bot)
        instance.settings = SimpleNamespace(public_base_url="https://example.test")
        instance.github = SimpleNamespace(git=lambda *args: SimpleNamespace(stdout="abc123\n"))
        self.assertEqual(instance.web_app_url(), "https://example.test/skills/?v=abc123")
    def test_github_actions_status_accepts_success_only_for_exact_commit(self):
        class Response:
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def read(self): return b'{"workflow_runs":[{"name":"Publish prototypes","head_sha":"other","status":"completed","conclusion":"success","created_at":"2026-09-18T00:00:00Z"},{"name":"Publish prototypes","head_sha":"abc123","status":"completed","conclusion":"success","created_at":"2026-09-18T00:01:00Z"}]}'
        instance = object.__new__(bot.Bot)
        instance.settings = SimpleNamespace(repository="example/repository")
        with patch("bot.urllib.request.urlopen", return_value=Response()) as opened:
            self.assertEqual(instance.github_actions_status("abc123"), ("success", None))
        self.assertIn("head_sha=abc123", opened.call_args.args[0].full_url)

    def test_github_actions_status_marks_rate_limit_as_unavailable(self):
        instance = object.__new__(bot.Bot)
        instance.settings = SimpleNamespace(repository="example/repository")
        limited = bot.urllib.error.HTTPError("https://api.github.com/rate_limit", 403, "rate limit exceeded", {}, io.BytesIO())
        with patch("bot.urllib.request.urlopen", side_effect=limited):
            status, reason = instance.github_actions_status("abc123")
        self.assertEqual(status, "unavailable")
        self.assertIn("rate limit", reason)

    def test_monitor_publication_does_not_retry_when_actions_are_unavailable_but_artifact_exists(self):
        instance = object.__new__(bot.Bot)
        instance.github = SimpleNamespace(retry_pages_deployment=Mock())
        with patch.object(instance, "wait_for_github_actions", return_value=(None, "GitHub Actions пока недоступен: rate limit")):
            published, reason = instance.monitor_publication("prototype", "original-commit", lambda: True, lambda: "страница не найдена")
        self.assertTrue(published)
        self.assertIsNone(reason)
        instance.github.retry_pages_deployment.assert_not_called()

    def test_monitor_publication_checks_url_after_exact_commit_workflow(self):
        instance = object.__new__(bot.Bot)
        with patch.object(instance, "wait_for_github_actions", return_value=(True, None)) as waited:
            published, reason = instance.monitor_publication("prototype", "original-commit", lambda: True, lambda: "GitHub Pages вернул HTTP 404")
        self.assertTrue(published)
        self.assertIsNone(reason)
        self.assertEqual([call.args[0] for call in waited.call_args_list], ["original-commit"])

    def test_monitor_publication_repairs_once_after_a_confirmed_workflow_but_missing_catalog(self):
        instance = object.__new__(bot.Bot)
        repairs = []
        instance.github = SimpleNamespace(retry_pages_deployment=lambda subject: repairs.append(subject) or "retry-commit")
        checks = iter([False, True])
        with patch.object(instance, "wait_for_github_actions", side_effect=[(True, None), (True, None)]) as waited:
            published, reason = instance.monitor_publication("skill", "original-commit", lambda: next(checks), lambda: "каталог не обновился")
        self.assertTrue(published)
        self.assertEqual(reason, "каталог не обновился")
        self.assertEqual(repairs, ["skill attempt 1"])
        self.assertEqual([call.args[0] for call in waited.call_args_list], ["original-commit", "retry-commit"])

    def test_monitor_publication_stops_after_two_repairs(self):
        instance = object.__new__(bot.Bot)
        repairs = []
        instance.github = SimpleNamespace(retry_pages_deployment=lambda subject: repairs.append(subject) or f"retry-{len(repairs)}")
        with patch.object(instance, "wait_for_github_actions", return_value=(True, None)):
            published, reason = instance.monitor_publication("skill", "original-commit", lambda: False, lambda: "каталог не обновился")
        self.assertFalse(published)
        self.assertEqual(reason, "каталог не обновился")
        self.assertEqual(repairs, ["skill attempt 1", "skill attempt 2"])
    def test_expired_skill_button_does_not_block_following_delete_command(self):
        instance = self.deletion_bot()
        instance.db = sqlite3.connect(":memory:")
        self.addCleanup(instance.db.close)
        instance.db.executescript("create table seen_updates(id integer primary key); create table bot_state(key text primary key, value text);")
        instance.publish_pending_skill = Mock(side_effect=bot.UserError("Нет скила, ожидающего публикации."))
        instance.telegram.side_effect = RuntimeError("Telegram answerCallbackQuery: Bad Request: query is too old and response timeout expired or query ID is invalid")
        query = self.deletion_query(instance, "select")
        query["data"] = "skill:publish"
        self.assertEqual(instance.process_update({"update_id": 10, "callback_query": query}), 11)
        self.assertEqual(instance.process_update({"update_id": 11, "message": {
            "chat": {"id": 1, "type": "private"}, "from": {"id": 1}, "text": "/delete_prototype"}}), 12)
        self.assertEqual(instance.send.call_args.args[1], "Выберите прототип для удаления:")
        instance.process_update({"update_id": 10, "callback_query": query})
        instance.publish_pending_skill.assert_called_once()

    def test_telegram_http_error_exposes_description_without_token(self):
        instance = bot.Bot.__new__(bot.Bot)
        instance.api_base = "https://api.telegram.org/botsecret"
        error = bot.urllib.error.HTTPError(instance.api_base, 400, "Bad Request", {},
            io.BytesIO(b'{"ok":false,"description":"Bad Request: query is too old"}'))
        with patch("bot.urllib.request.urlopen", side_effect=error):
            with self.assertRaisesRegex(RuntimeError, "Telegram answerCallbackQuery: Bad Request: query is too old") as caught:
                instance.telegram("answerCallbackQuery", {"callback_query_id": "old"})
        self.assertNotIn("secret", str(caught.exception))

    def skill_deletion_bot(self):
        instance = self.deletion_bot()
        instance.github.read_json.return_value = [
            {"id": "other-author", "name": "Чужой скилл", "updated_by": "other"},
            {"id": "keep", "name": "Оставить"},
        ]
        instance.github.read_json.side_effect = lambda path, fallback: fallback if path == bot.MARKETPLACE_PATH else instance.github.read_json.return_value
        instance.github.files_below.return_value = ["skills/other-author/skill.zip", "skills/other-author/metadata.json"]
        return instance

    def skill_deletion_query(self, instance, action):
        return {"id": "callback", "from": {"id": 1}, "message": {"chat": {"id": 1, "type": "private"}, "message_id": 7},
                "data": f"skdelete:{action}:{instance.skill_delete_key(instance.github.read_json.return_value[0])}"}

    def test_delete_skill_command_lists_all_authors_and_confirms(self):
        instance = self.skill_deletion_bot()
        instance.handle({"message": {"chat": {"id": 1, "type": "private"}, "from": {"id": 1}, "text": "/delete_skill"}})
        rows = instance.send.call_args.kwargs["reply_markup"]["inline_keyboard"]
        self.assertEqual(len(rows), 2)
        instance.callback(self.skill_deletion_query(instance, "select"))
        self.assertIn("Чужой скилл", instance.send.call_args.args[1])
        instance.github.commit_files.assert_not_called()

    def test_delete_skill_commits_only_selected_skill_and_reports_verified_result(self):
        for removed in (True, False):
            instance = self.skill_deletion_bot()
            instance.monitor_publication = Mock(side_effect=lambda subject, commit, checker, reason: (checker(), reason()))
            instance.wait_for_skill_removal = Mock(return_value=removed)
            instance.callback(self.skill_deletion_query(instance, "confirm"))
            files, removals, _ = instance.github.commit_files.call_args.args
            self.assertEqual(json.loads(files["skills/catalog.json"]), [{"id": "keep", "name": "Оставить"}])
            self.assertEqual(removals, instance.github.files_below.return_value)
            instance.github.files_below.assert_called_once_with("skills/other-author/")
            instance.wait_for_skill_removal.assert_called_once_with("other-author")
            edits = [call.args[2] for call in instance.edit_message.call_args_list]
            self.assertEqual(edits[:2], ["Удаляю скилл…", "Жду обновления Skill store…"])
            self.assertEqual(edits[-1], "Скилл удалён ✓" if removed else "Ошибка удаления: Skill store не подтвердил удаление скилла")

    def test_delete_skill_rejects_dependencies_even_after_confirmation(self):
        instance = self.skill_deletion_bot()
        instance.github.read_json.return_value[1]["dependencies"] = ["other-author"]
        instance.callback(self.skill_deletion_query(instance, "confirm"))
        instance.github.commit_files.assert_not_called()
        self.assertIn("Оставить", instance.send.call_args.args[1])

    def test_delete_skill_cancel_missing_unauthorized_and_unsafe_do_not_commit(self):
        for case in ("cancel", "missing", "unauthorized", "unsafe"):
            instance = self.skill_deletion_bot()
            if case == "unsafe":
                instance.github.read_json.return_value[0]["id"] = "../assets"
            query = self.skill_deletion_query(instance, "cancel" if case == "cancel" else "confirm")
            if case == "missing":
                instance.github.read_json.return_value = []
            if case == "unauthorized":
                instance.is_publisher.return_value = False
            instance.callback(query)
            instance.github.commit_files.assert_not_called()

    def test_delete_skill_paginates_catalog(self):
        instance = self.skill_deletion_bot()
        instance.github.read_json.return_value = [{"id": str(i), "name": f"Skill {i:02}"} for i in range(16)]
        instance.delete_skill_menu({"chat": {"id": 1}, "from": {"id": 1}})
        rows = instance.send.call_args.kwargs["reply_markup"]["inline_keyboard"]
        self.assertEqual(len(rows), 16)
        self.assertEqual(rows[-1][0]["callback_data"], "skdelete:page:1")
        query = self.skill_deletion_query(instance, "select")
        query["data"] = "skdelete:page:1"
        instance.callback(query)
        self.assertEqual(len(instance.send.call_args.kwargs["reply_markup"]["inline_keyboard"]), 2)

    def test_skill_removal_requires_updated_public_catalog_and_missing_package(self):
        for catalog, package_code, expected in [([], 404, True), ([{"id": "demo"}], 404, False), ([], 200, False), ([], 500, False)]:
            class Response(io.BytesIO):
                status = 200
                def __enter__(self): return self
                def __exit__(self, *args): self.close()
            responses = [Response(json.dumps(catalog).encode())]
            responses.append(Response(b"") if package_code == 200 else bot.urllib.error.HTTPError("https://example.test", package_code, "error", {}, None))
            instance = self.skill_deletion_bot()
            with patch("bot.urllib.request.urlopen", side_effect=responses), patch("bot.PUBLIC_ARTIFACT_TIMEOUT_SECONDS", 0):
                self.assertEqual(instance.wait_for_skill_removal("demo"), expected)

    def deletion_bot(self):
        instance = bot.Bot.__new__(bot.Bot)
        instance.settings = SimpleNamespace(public_base_url="https://example.test")
        instance.is_publisher = Mock(return_value=True)
        instance.send = Mock()
        instance.edit_message = Mock()
        instance.telegram = Mock()
        instance.github = SimpleNamespace(sync=Mock(), read_json=Mock(return_value=[
            {"title": "Чужой прототип", "author": "Другой автор", "url": "prototypes/99/demo/"},
            {"title": "Другой", "url": "prototypes/2/keep/"},
        ]), files_below=Mock(return_value=["prototypes/99/demo/index.html", "prototypes/99/demo/app.css"]),
            commit_files=Mock(return_value="commit"))
        instance.wait_for_github_actions = Mock(return_value=(True, None))
        return instance

    def deletion_query(self, instance, action):
        item = instance.github.read_json.return_value[0]
        return {"id": "callback", "from": {"id": 1}, "message": {"chat": {"id": 1, "type": "private"}, "message_id": 7},
                "data": f"proto:{action}:{instance.prototype_delete_key(item)}"}

    def test_delete_command_lists_other_authors_and_requires_confirmation(self):
        instance = self.deletion_bot()
        instance.handle({"message": {"chat": {"id": 1, "type": "private"}, "from": {"id": 1}, "text": "/delete_prototype"}})
        rows = instance.send.call_args.kwargs["reply_markup"]["inline_keyboard"]
        self.assertEqual(len(rows), 2)
        self.assertIn("Чужой прототип", rows[0][0]["text"])
        instance.callback(self.deletion_query(instance, "select"))
        self.assertIn("Удалить прототип", instance.send.call_args.args[1])
        instance.github.commit_files.assert_not_called()

    def test_delete_removes_only_selected_files_and_catalog_entry_and_checks_page(self):
        for removed in (True, False):
            with self.subTest(removed=removed):
                instance = self.deletion_bot()
                instance.wait_for_prototype_removal = Mock(return_value=removed)
                instance.github.retry_pages_deployment = Mock(return_value="retry")
                instance.callback(self.deletion_query(instance, "confirm"))
                files, removals, _ = instance.github.commit_files.call_args.args
                self.assertEqual(json.loads(files["prototypes.json"]), [{"title": "Другой", "url": "prototypes/2/keep/"}])
                self.assertEqual(removals, instance.github.files_below.return_value)
                instance.wait_for_prototype_removal.assert_called_with("https://example.test/prototypes/99/demo/")
                final = instance.edit_message.call_args.args
                self.assertEqual(final[:2], (1, 7))
                self.assertEqual(final[2], "Прототип удалён ✓" if removed else "Ошибка удаления: GitHub Pages не подтвердил удаление страницы")

    def test_delete_cancel_missing_unauthorized_and_unsafe_path_do_not_commit(self):
        for case in ("cancel", "missing", "unauthorized", "unsafe"):
            with self.subTest(case=case):
                instance = self.deletion_bot()
                if case == "unsafe":
                    instance.github.read_json.return_value[0]["url"] = "prototypes/../skills/"
                query = self.deletion_query(instance, "cancel" if case == "cancel" else "confirm")
                if case == "missing":
                    instance.github.read_json.return_value = []
                if case == "unauthorized":
                    instance.is_publisher.return_value = False
                instance.callback(query)
                instance.github.commit_files.assert_not_called()

    def test_removal_requires_http_404(self):
        for code in (404, 403, 500):
            error = bot.urllib.error.HTTPError("https://example.test", code, "error", {}, None)
            with patch("bot.urllib.request.urlopen", side_effect=error), patch("bot.PUBLIC_ARTIFACT_TIMEOUT_SECONDS", 0):
                self.assertEqual(bot.Bot.wait_for_prototype_removal("https://example.test"), code == 404)
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        with patch("bot.urllib.request.urlopen", return_value=response), patch("bot.PUBLIC_ARTIFACT_TIMEOUT_SECONDS", 0):
            self.assertFalse(bot.Bot.wait_for_prototype_removal("https://example.test"))

    def test_document_publication_updates_original_message_after_http_check(self):
        for published in (True, False):
            with self.subTest(published=published):
                instance = bot.Bot.__new__(bot.Bot)
                instance.db = sqlite3.connect(":memory:")
                self.addCleanup(instance.db.close)
                instance.db.execute("create table pending (user_id integer, action text, name text, version text)")
                instance.settings = SimpleNamespace(public_base_url="https://yuriysteam.github.io/yatraveldesign")
                instance.is_publisher = Mock(return_value=True)
                instance.send = Mock(return_value={"chat": {"id": 7}, "message_id": 9})
                instance.edit_message = Mock()
                instance.download_document = Mock(return_value=archive({"index.html": "<html>OK</html>"}))
                instance.github = SimpleNamespace(files_below=Mock(return_value=[]), read_json=Mock(return_value=[]),
                                                  commit_files=Mock(return_value="commit"), retry_pages_deployment=Mock(return_value="retry"))
                instance.wait_for_github_actions = Mock(return_value=(True, None))
                instance.prototype_publication_reason = Mock(return_value="GitHub Pages вернул HTTP 404")
                instance.notify_publication_result = Mock()
                url = "https://yuriysteam.github.io/yatraveldesign/prototypes/1/demo/"

                class Response:
                    status = 200 if published else 404
                    def __enter__(self): return self
                    def __exit__(self, *args): return False

                def check_response(*args, **kwargs):
                    self.assertEqual(instance.edit_message.call_args.args, (7, 9, "Жду публикацию страницы…"))
                    return Response()

                with patch("bot.enrich_metadata", return_value=("Demo", "Описание")), patch("bot.urllib.request.urlopen", side_effect=check_response), patch("bot.PUBLIC_ARTIFACT_TIMEOUT_SECONDS", 0):
                    instance.publish_document({"chat": {"id": 7}, "from": {"id": 1, "username": "anna"},
                                               "document": {"file_name": "demo.zip"}})
                instance.send.assert_called_once_with(7, "Загружаю файл…")
                edits = instance.edit_message.call_args_list
                self.assertTrue(all(call.args[:2] == (7, 9) for call in edits))
                self.assertEqual([call.args[2] for call in edits[:4]], [
                    "Проверяю архив…", "Проверяю прототип…", "Загружаю на сервер…", "Жду публикацию страницы…"])
                final = edits[-1].args[2]
                if published:
                    self.assertEqual(final, f"Загружено ✓\n\n{url}")
                else:
                    self.assertIn("Ошибка публикации", final)
                    self.assertNotIn("Загружено", final)
                    self.assertNotIn(url, final)

    def test_unsolicited_skill_zip_has_neutral_then_skill_status_in_same_message(self):
        instance = bot.Bot.__new__(bot.Bot)
        instance.db = sqlite3.connect(":memory:")
        self.addCleanup(instance.db.close)
        instance.db.execute("create table pending (user_id integer, action text, name text, version text)")
        instance.is_publisher = Mock(return_value=True)
        instance.send = Mock(return_value={"chat": {"id": 7}, "message_id": 9})
        instance.edit_message = Mock()
        instance.download_document = Mock(return_value=archive({"SKILL.md": "---\nname: sample\nversion: v0.1\n---\n"}))
        instance.publish_prototype = Mock()
        instance.review_skill = Mock()
        instance.publish_document({"chat": {"id": 7}, "from": {"id": 1}, "document": {"file_name": "sample.zip"}})
        instance.send.assert_called_once_with(7, "Загружаю файл…")
        self.assertEqual([call.args for call in instance.edit_message.call_args_list], [
            (7, 9, "Проверяю архив…"),
            (7, 9, "Проверяю скилл…"),
            (7, 9, "Скилл проверен. Ожидает подтверждения публикации."),
        ])
        instance.review_skill.assert_called_once()
        instance.publish_prototype.assert_not_called()

    def test_invalid_archive_updates_original_status(self):
        instance = bot.Bot.__new__(bot.Bot)
        instance.db = sqlite3.connect(":memory:")
        self.addCleanup(instance.db.close)
        instance.db.execute("create table pending (user_id integer, action text, name text, version text)")
        instance.is_publisher = Mock(return_value=True)
        instance.send = Mock(return_value={"chat": {"id": 7}, "message_id": 9})
        instance.edit_message = Mock()
        instance.download_document = Mock(return_value=b"invalid zip")
        instance.notify_publication_result = Mock()
        instance.publish_document({"chat": {"id": 7}, "from": {"id": 1}, "document": {"file_name": "demo.zip"}})
        instance.send.assert_called_once()
        self.assertIn("Ошибка публикации", instance.edit_message.call_args.args[2])
        self.assertNotIn("Загружено", instance.edit_message.call_args.args[2])


if __name__ == "__main__":
    unittest.main()

import io
import os
import unittest
import zipfile
from types import SimpleNamespace
from unittest.mock import patch

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
    def test_detects_technical_labels_but_keeps_human_names(self):
        self.assertTrue(bot.is_technical_label("travel-feature-check"))
        self.assertTrue(bot.is_technical_label("calendar-cli"))
        self.assertFalse(bot.is_technical_label("Адженда"))
        self.assertFalse(bot.is_technical_label("Создание прототипов"))

    def test_accepts_a_static_prototype(self):
        members = bot.safe_zip_members(archive({"index.html": "<h1>OK</h1>", "assets/app.css": "body{}"}))
        self.assertEqual([name for name, _ in members], ["index.html", "assets/app.css"])

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
        raw = archive({"my-skill/SKILL.md": "---\nname: Research helper\ndescription: Finds sources\n---\n# Research", "my-skill/tools/run.sh": "#!/bin/sh"})
        with patch("bot.enrich_metadata", return_value=("Research helper", "Finds sources.")):
            identifier, name, description, display_name, display_description, dependencies, files = bot.skill_package("my-skill.zip", raw)
        self.assertEqual(identifier, "research-helper")
        self.assertEqual(name, "Research helper")
        self.assertEqual(description, "Finds sources")
        self.assertEqual(display_name, "Research helper")
        self.assertEqual(display_description, "Finds sources.")
        self.assertEqual(dependencies, [])
        self.assertEqual(set(files), {"my-skill/SKILL.md", "my-skill/tools/run.sh"})

    def test_reads_folded_skill_description(self):
        source = """---
name: yandex-travel-ux-writing
description: >-
  UX-редактор для дизайнеров Яндекс Путешествий.
  Опирается на ToV и редполитику команды.
---
""".encode()
        with patch("bot.enrich_metadata", side_effect=lambda _, name, description="": (name, description)):
            _, _, description, _, display_description, _, _ = bot.skill_package("SKILL.md", source)
        expected = "UX-редактор для дизайнеров Яндекс Путешествий. Опирается на ToV и редполитику команды."
        self.assertEqual(description, expected)
        self.assertEqual(display_description, expected)

    def test_preserves_every_skill_in_a_multi_skill_archive(self):
        raw = archive({
            "travel-kit/research/SKILL.md": "---\nname: Research\ndescription: Research skill\n---\n",
            "travel-kit/research/tools/search.sh": "#!/bin/sh",
            "travel-kit/writing/SKILL.md": "---\nname: Writing\ndescription: Writing skill\n---\n",
        })
        with patch("bot.enrich_metadata", return_value=("Travel kit", "Набор скилов.")):
            identifier, name, _, _, _, _, files = bot.skill_package("travel-kit.zip", raw)
        self.assertEqual(identifier, "travel-kit")
        self.assertEqual(name, "travel-kit")
        self.assertEqual(set(files), {
            "travel-kit/research/SKILL.md", "travel-kit/research/tools/search.sh", "travel-kit/writing/SKILL.md",
        })
        with zipfile.ZipFile(io.BytesIO(bot.make_zip(files))) as published:
            self.assertEqual(set(published.namelist()), set(files))

    def test_bundle_does_not_require_its_own_skills_from_the_catalogue(self):
        raw = archive({
            "bundle/SKILL.md": "---\nname: Main\nmetadata:\n  dependencies: [helper, external]\n---\n",
            "bundle/helper/SKILL.md": "---\nname: Helper\n---\n",
        })
        with patch("bot.enrich_metadata", return_value=("Bundle", "Набор скилов.")):
            *_, dependencies, _ = bot.skill_package("bundle.zip", raw)
        self.assertEqual(dependencies, ["external"])

    def test_detects_root_installer_for_a_skill_bundle(self):
        files = {
            "kit/README.md": b"# Kit",
            "kit/install.py": b"#!/usr/bin/env python3",
            "kit/Skills/router/SKILL.md": b"---\nname: Router\n---",
        }
        self.assertEqual(bot.bundle_installer(files), "kit")

    def test_does_not_treat_a_nested_skill_script_as_the_bundle_installer(self):
        files = {
            "kit/README.md": b"# Kit",
            "kit/Skills/builder/install.py": b"#!/bin/sh",
            "kit/Skills/builder/SKILL.md": b"---\nname: Builder\n---",
        }
        self.assertIsNone(bot.bundle_installer(files))

    def test_reads_single_skill_file(self):
        with patch("bot.enrich_metadata", return_value=("Solo", "Без описания")):
            identifier, name, _, display_name, _, dependencies, files = bot.skill_package("SKILL.md", b"---\nname: Solo\n---\n# Solo")
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
            calendar = bot.skill_package("SKILL.md", b'---\nname: yandex-calendar\ndescription: Calendar\n---\n')
            memory = bot.skill_package("SKILL.md", b'---\nname: local-memory\ndescription: Memory\n---\n')
        self.assertEqual(calendar[0], "calendar-cli")
        self.assertEqual(memory[0], "shared-durable-memory")

    def test_reads_and_normalizes_skill_dependencies(self):
        source = b'---\nname: agenda\ndescription: Daily\nmetadata:\n  dependencies: [startrek-client, yandex-calendar, mail-corp, wiki-client]\n---\n'
        with patch("bot.enrich_metadata", return_value=("Agenda", "Daily")):
            _, _, _, _, _, dependencies, _ = bot.skill_package("SKILL.md", source)
        self.assertEqual(dependencies, ["startrek-client", "calendar-cli", "mail-corp", "wiki-client"])

    def test_rejects_malformed_skill_dependency_id(self):
        source = b'---\nname: agenda\nmetadata:\n  dependencies: [../other-skill]\n---\n'
        with self.assertRaisesRegex(bot.UserError, "некорректный идентификатор"):
            bot.skill_package("SKILL.md", source)

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
        self.assertIn(b'name="robots" content="noindex, nofollow, noarchive"', result[0][1])

    def test_wait_for_publication_accepts_http_200(self):
        class Response:
            status = 200
            def __enter__(self): return self
            def __exit__(self, *args): return False
        with patch("urllib.request.urlopen", return_value=Response()):
            self.assertTrue(bot.Bot.wait_for_publication("https://example.test/prototype/"))

    def test_wait_for_skill_publication_checks_versioned_raw_urls(self):
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
            self.assertTrue(instance.wait_for_skill_publication("research", 123))
        urls = [call.args[0].full_url for call in opened.call_args_list]
        self.assertEqual(urls, [
            "https://raw.githubusercontent.com/example/repository/main/skills/catalog.json?updated=123",
            "https://raw.githubusercontent.com/example/repository/main/skills/research/skill.zip?updated=123",
        ])

    def test_web_app_url_uses_the_current_revision(self):
        instance = object.__new__(bot.Bot)
        instance.settings = SimpleNamespace(public_base_url="https://example.test")
        instance.github = SimpleNamespace(git=lambda *args: SimpleNamespace(stdout="abc123\n"))
        self.assertEqual(instance.web_app_url(), "https://example.test/skills/?v=abc123")


if __name__ == "__main__":
    unittest.main()

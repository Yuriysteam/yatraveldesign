import io
import os
import unittest
import zipfile
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
    def test_accepts_a_static_prototype(self):
        members = bot.safe_zip_members(archive({"index.html": "<h1>OK</h1>", "assets/app.css": "body{}"}))
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
        identifier, name, description, files = bot.skill_package("my-skill.zip", raw)
        self.assertEqual(identifier, "research-helper")
        self.assertEqual(name, "Research helper")
        self.assertEqual(description, "Finds sources")
        self.assertEqual(set(files), {"SKILL.md", "tools/run.sh"})

    def test_reads_single_skill_file(self):
        identifier, name, _, files = bot.skill_package("SKILL.md", b"---\nname: Solo\n---\n# Solo")
        self.assertEqual(identifier, "solo")
        self.assertEqual(name, "Solo")
        self.assertEqual(set(files), {"SKILL.md"})

    def test_detects_skill_from_zip_contents(self):
        self.assertEqual(bot.detect_upload("anything.zip", archive({"folder/SKILL.md": "---\nname: A\n---"})), "skill")

    def test_detects_prototype_from_zip_contents(self):
        self.assertEqual(bot.detect_upload("anything.zip", archive({"build/index.html": "<h1>Demo</h1>"})), "prototype")

    def test_rejects_unknown_direct_upload(self):
        with self.assertRaisesRegex(bot.UserError, "Не удалось определить"):
            bot.detect_upload("anything.zip", archive({"readme.txt": "x"}))

    def test_installation_prompt_contains_download_link(self):
        prompt = bot.installation_prompt("Research", "https://example.test/skill.zip")
        self.assertIn("https://example.test/skill.zip", prompt)
        self.assertLessEqual(len(prompt), 256)

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


if __name__ == "__main__":
    unittest.main()

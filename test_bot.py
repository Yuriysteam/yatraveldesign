import io
import os
import unittest
import zipfile

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

    def test_rejects_duplicate_paths(self):
        raw = io.BytesIO()
        with zipfile.ZipFile(raw, "w") as z:
            z.writestr("index.html", "a")
            z.writestr("INDEX.HTML", "b")
        with self.assertRaisesRegex(bot.UserError, "повторяющиеся"):
            bot.safe_zip_members(raw.getvalue())

    def test_prompt_uses_exact_version_and_url(self):
        prompt = bot.installation_prompt("codex", "research", "1.2.0", "https://example.test/skill.zip")
        self.assertIn("Codex", prompt)
        self.assertIn("1.2.0", prompt)
        self.assertIn("https://example.test/skill.zip", prompt)


if __name__ == "__main__":
    unittest.main()

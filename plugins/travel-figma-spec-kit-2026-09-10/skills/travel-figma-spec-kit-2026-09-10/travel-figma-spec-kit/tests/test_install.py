"""Run with: python3 -m unittest discover -s tests -v (from the kit directory)."""

import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr
from unittest import mock


INSTALLER_PATH = Path(__file__).resolve().parents[1] / "install.py"
SPEC = importlib.util.spec_from_file_location("team_kit_installer", INSTALLER_PATH)
installer = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = installer
SPEC.loader.exec_module(installer)

LEGACY_SKILL_NAMES = (
    "html-to-figma-spec",
    "figma-design-machine",
    "figma-spec-builder",
    "travel-figma-design-system",
    "sasha",
)


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.bundle = self.root / "unpacked kit"
        self.bundle.mkdir()
        shutil.copy2(INSTALLER_PATH, self.bundle / "install.py")
        self.destination = self.root / "codex" / "skills"
        for name in installer.SKILL_NAMES:
            skill = self.bundle / "Skills" / name
            (skill / "references" / "nested").mkdir(parents=True)
            (skill / "empty").mkdir()
            (skill / "SKILL.md").write_text("---\nname: {}\n---\nПример\n".format(name), encoding="utf-8")
            (skill / "references" / "nested" / "data.bin").write_bytes(b"\x00\xffskill content\r\n")

    def plan(self):
        return installer.build_plan(self.bundle, self.destination)

    def run_cli(self, *arguments, env=None):
        return subprocess.run([sys.executable, str(self.bundle / "install.py"), *arguments],
                              cwd=str(self.root), env=env, capture_output=True, text=True)

    def symlink(self, target, link):
        try:
            link.symlink_to(target, target_is_directory=True)
        except (OSError, NotImplementedError) as error:
            self.skipTest("symlinks unavailable: {}".format(error))

    def test_clean_copy_is_independent_of_unpacked_bundle(self):
        plans = self.plan()
        installer.apply_plan(plans)
        self.assertEqual(len(plans), 6)
        for plan in plans:
            self.assertEqual(installer.inventory(plan.target), plan.tree)
            self.assertFalse(plan.target.is_symlink())
        shutil.rmtree(self.bundle)
        for name in installer.SKILL_NAMES:
            self.assertIn("Пример", (self.destination / name / "SKILL.md").read_text(encoding="utf-8"))
            self.assertEqual((self.destination / name / "references/nested/data.bin").read_bytes(), b"\x00\xffskill content\r\n")

    def test_identical_install_does_not_touch_existing_files(self):
        installer.apply_plan(self.plan())
        observed = self.destination / installer.SKILL_NAMES[0] / "SKILL.md"
        os.utime(observed, (1000000000, 1000000000))
        original = observed.stat()
        plans = self.plan()
        self.assertEqual({plan.action for plan in plans}, {"identical"})
        installer.apply_plan(plans)
        self.assertEqual(observed.stat().st_mtime_ns, original.st_mtime_ns)
        self.assertEqual(observed.stat().st_ino, original.st_ino)

    def test_upgrade_from_five_identical_copies_adds_only_router(self):
        original_files = {}
        for name in LEGACY_SKILL_NAMES:
            source = self.bundle / "Skills" / name
            target = self.destination / name
            shutil.copytree(source, target)
            for relative, entry in installer.inventory(target).items():
                if entry.kind == "file":
                    path = target / relative
                    os.utime(path, (1000000000, 1000000000))
                    details = path.stat()
                    original_files[path] = (path.read_bytes(), details.st_mtime_ns, details.st_ino)
        plans = self.plan()
        self.assertEqual({plan.name: plan.action for plan in plans}, {
            **{name: "identical" for name in LEGACY_SKILL_NAMES},
            "figma-workflow-router": "copy",
        })

        result = self.run_cli("--destination", str(self.destination))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Installed 1 skill(s); 5 already present.", result.stdout)
        self.assertEqual(set(path.name for path in self.destination.iterdir()),
                         set(LEGACY_SKILL_NAMES) | {"figma-workflow-router"})
        router = self.destination / "figma-workflow-router"
        self.assertFalse(router.is_symlink())
        self.assertEqual(installer.inventory(router),
                         installer.inventory(self.bundle / "Skills" / "figma-workflow-router"))
        for path, original in original_files.items():
            with self.subTest(file=str(path.relative_to(self.destination))):
                details = path.stat()
                self.assertEqual((path.read_bytes(), details.st_mtime_ns, details.st_ino), original)

    def test_conflicting_legacy_copy_blocks_router_upgrade(self):
        for name in LEGACY_SKILL_NAMES:
            shutil.copytree(self.bundle / "Skills" / name, self.destination / name)
        changed = self.destination / "sasha" / "references/nested/data.bin"
        changed.write_bytes(b"team customization")
        result = self.run_cli("--destination", str(self.destination))
        self.assertEqual(result.returncode, 2)
        self.assertIn("no files were changed", result.stderr)
        self.assertIn("different references/nested/data.bin", result.stderr)
        self.assertEqual(changed.read_bytes(), b"team customization")
        self.assertFalse((self.destination / "figma-workflow-router").exists())
        self.assertEqual(set(path.name for path in self.destination.iterdir()), set(LEGACY_SKILL_NAMES))

    def test_conflict_in_last_skill_prevents_all_copies(self):
        conflict = self.destination / installer.SKILL_NAMES[-1]
        conflict.mkdir(parents=True)
        (conflict / "SKILL.md").write_text("team's own skill", encoding="utf-8")
        with self.assertRaisesRegex(installer.ConflictError, "no files were changed"):
            self.plan()
        self.assertEqual(list(self.destination.iterdir()), [conflict])
        self.assertEqual((conflict / "SKILL.md").read_text(), "team's own skill")

    def test_deep_file_difference_is_reported(self):
        installer.apply_plan(self.plan())
        changed = self.destination / installer.SKILL_NAMES[2] / "references/nested/data.bin"
        changed.write_bytes(b"a different version")
        with self.assertRaisesRegex(installer.ConflictError, "different references/nested/data.bin"):
            self.plan()
        self.assertEqual(changed.read_bytes(), b"a different version")

    def test_extra_file_is_a_conflict(self):
        installer.apply_plan(self.plan())
        extra = self.destination / installer.SKILL_NAMES[0] / "personal.md"
        extra.write_text("keep me", encoding="utf-8")
        with self.assertRaisesRegex(installer.ConflictError, "extra personal.md"):
            self.plan()
        self.assertEqual(extra.read_text(), "keep me")

    def test_broken_foreign_link_is_not_replaced(self):
        self.destination.mkdir(parents=True)
        link = self.destination / installer.SKILL_NAMES[-1]
        self.symlink(self.root / "does not exist", link)
        with self.assertRaisesRegex(installer.ConflictError, "foreign or broken symlink"):
            self.plan()
        self.assertTrue(link.is_symlink())
        self.assertEqual(list(self.destination.iterdir()), [link])

    def test_same_source_link_is_noop(self):
        self.destination.mkdir(parents=True)
        link = self.destination / installer.SKILL_NAMES[0]
        self.symlink(self.bundle / "Skills" / installer.SKILL_NAMES[0], link)
        plans = self.plan()
        self.assertEqual(plans[0].action, "same-source link")
        installer.apply_plan(plans)
        self.assertTrue(link.is_symlink())

    def test_source_symlink_is_rejected_before_changes(self):
        source = self.bundle / "Skills" / installer.SKILL_NAMES[-1]
        self.symlink(source / "references", source / "linked-references")
        with self.assertRaisesRegex(installer.ConflictError, "symlink is not allowed"):
            self.plan()
        self.assertFalse(self.destination.exists())

    def test_missing_source_prevents_partial_install(self):
        shutil.rmtree(self.bundle / "Skills" / installer.SKILL_NAMES[-1])
        with self.assertRaises(installer.ConflictError):
            self.plan()
        self.assertFalse(self.destination.exists())

    def test_special_file_is_rejected(self):
        if not hasattr(os, "mkfifo"):
            self.skipTest("FIFO unavailable on this platform")
        fifo = self.bundle / "Skills" / installer.SKILL_NAMES[-1] / "fifo"
        os.mkfifo(fifo)
        with self.assertRaisesRegex(installer.ConflictError, "not a regular file"):
            self.plan()
        self.assertFalse(self.destination.exists())

    def test_mid_install_failure_rolls_back_own_copies_only(self):
        existing = self.destination / installer.SKILL_NAMES[0]
        shutil.copytree(self.bundle / "Skills" / installer.SKILL_NAMES[0], existing)
        unrelated = self.destination / "unrelated-skill"
        unrelated.mkdir()
        (unrelated / "keep.txt").write_text("keep", encoding="utf-8")
        original = installer.Transaction.copy_file

        def fail_later(transaction, source, target, digest):
            if installer.SKILL_NAMES[3] in source.parts:
                raise OSError("simulated disk failure")
            return original(transaction, source, target, digest)

        with mock.patch.object(installer.Transaction, "copy_file", new=fail_later):
            with self.assertRaisesRegex(OSError, "simulated disk failure"):
                installer.apply_plan(self.plan())
        self.assertEqual(set(path.name for path in self.destination.iterdir()), {existing.name, unrelated.name})
        self.assertEqual(installer.inventory(existing), installer.inventory(self.bundle / "Skills" / existing.name))
        self.assertEqual((unrelated / "keep.txt").read_text(), "keep")

    def test_interruption_rolls_back_new_destination(self):
        original = installer.Transaction.copy_file
        copied = 0

        def interrupt(transaction, source, target, digest):
            nonlocal copied
            original(transaction, source, target, digest)
            copied += 1
            if copied == 3:
                raise KeyboardInterrupt()

        with mock.patch.object(installer.Transaction, "copy_file", new=interrupt):
            with self.assertRaises(KeyboardInterrupt):
                installer.apply_plan(self.plan())
        self.assertFalse(self.destination.exists())
        self.assertFalse(self.destination.parent.exists())

    def test_rollback_preserves_foreign_file_added_during_install(self):
        plans = self.plan()
        original = installer.Transaction.copy_file
        foreign = plans[0].target / "foreign.txt"

        def inject_foreign(transaction, source, target, digest):
            original(transaction, source, target, digest)
            foreign.write_text("another writer", encoding="utf-8")
            raise OSError("simulated failure")

        diagnostics = io.StringIO()
        with redirect_stderr(diagnostics):
            with mock.patch.object(installer.Transaction, "copy_file", new=inject_foreign):
                with self.assertRaises(OSError):
                    installer.apply_plan(plans)
        self.assertEqual(foreign.read_text(), "another writer")
        self.assertEqual(list(plans[0].target.iterdir()), [foreign])
        self.assertIn("manual review", diagnostics.getvalue())

    def test_new_target_created_after_preflight_is_not_removed(self):
        plans = self.plan()
        foreign = plans[1].target
        foreign.mkdir(parents=True)
        (foreign / "keep.txt").write_text("foreign", encoding="utf-8")
        with self.assertRaises(FileExistsError):
            installer.apply_plan(plans)
        self.assertFalse(plans[0].target.exists())
        self.assertEqual((foreign / "keep.txt").read_text(), "foreign")

    def test_dry_run_never_creates_destination(self):
        result = self.run_cli("--check", "--destination", str(self.destination))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("No files were changed", result.stdout)
        self.assertFalse(self.destination.exists())

    def test_manifest_checksums_are_validated_before_any_changes(self):
        plans = self.plan()
        records = []
        for plan in plans:
            for relative, entry in plan.tree.items():
                if entry.kind == "file":
                    records.append({"path": "Skills/{}/{}".format(plan.name, relative),
                                    "sha256": entry.digest, "size": (plan.source / relative).stat().st_size})
        manifest = {"schemaVersion": 1, "files": records}
        manifest_file = self.bundle / "manifest.json"
        manifest_file.write_text(json.dumps(manifest), encoding="utf-8")
        self.assertEqual(len(self.plan()), 6)
        records[-1]["sha256"] = "0" * 64
        manifest_file.write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaisesRegex(installer.ConflictError, "manifest checksum or size mismatch"):
            self.plan()
        self.assertFalse(self.destination.exists())

    def test_manifest_rejects_unlisted_source_files(self):
        (self.bundle / "manifest.json").write_text(json.dumps({"schemaVersion": 1, "files": []}), encoding="utf-8")
        with self.assertRaisesRegex(installer.ConflictError, "manifest source file list differs"):
            self.plan()
        self.assertFalse(self.destination.exists())

    def test_cli_uses_codex_home_without_changing_real_home(self):
        environment = os.environ.copy()
        environment["CODEX_HOME"] = str(self.destination.parent)
        result = self.run_cli(env=environment)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(set(path.name for path in self.destination.iterdir()), set(installer.SKILL_NAMES))


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Install the six bundled skills using Python 3.9+ and the standard library.

Usage:
    python3 install.py --check
    python3 install.py
    python3 install.py --destination /path/to/codex/skills

The source is always Skills/ beside this script. The default destination is
$CODEX_HOME/skills, or ~/.codex/skills when CODEX_HOME is not set. No network,
plugin installation, symlink creation, or replacement of differing skills occurs.
Skills outside this kit, including an existing sasha, are left untouched.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import sys
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


SKILL_NAMES = (
    "html-to-figma-spec",
    "figma-design-machine",
    "figma-spec-builder",
    "travel-figma-design-system",
    "yandex-travel-ux-writing",
    "figma-workflow-router",
)


class InstallError(Exception):
    """Installation cannot finish safely."""


class ConflictError(InstallError):
    """Preflight found a missing source or conflicting destination."""


@dataclass(frozen=True)
class Entry:
    kind: str
    digest: str = ""


@dataclass(frozen=True)
class SkillPlan:
    name: str
    source: Path
    target: Path
    action: str
    tree: Dict[str, Entry]


def default_destination() -> Path:
    codex_directory = os.environ.get("CODEX_HOME")
    return (Path(codex_directory).expanduser() if codex_directory else
            Path.home() / ".codex") / "skills"


def identity(path: Path) -> Tuple[int, int, int]:
    details = path.lstat()
    return details.st_dev, details.st_ino, stat.S_IFMT(details.st_mode)


def file_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def inventory(root: Path) -> Dict[str, Entry]:
    """Describe a real directory tree; never accept links or special files."""
    details = root.lstat()
    if not stat.S_ISDIR(details.st_mode):
        raise InstallError("expected a real directory: {}".format(root))
    entries = {}

    def visit(directory: Path) -> None:
        with os.scandir(directory) as listing:
            children = sorted(list(listing), key=lambda item: item.name)
        for child in children:
            path = directory / child.name
            relative = path.relative_to(root).as_posix()
            details = path.lstat()
            if stat.S_ISLNK(details.st_mode):
                raise InstallError("symlink is not allowed inside a skill: {}".format(path))
            if stat.S_ISDIR(details.st_mode):
                entries[relative] = Entry("directory")
                visit(path)
            elif stat.S_ISREG(details.st_mode):
                entries[relative] = Entry("file", file_digest(path))
            else:
                raise InstallError("not a regular file or directory: {}".format(path))

    visit(root)
    return entries


def first_difference(expected: Dict[str, Entry], actual: Dict[str, Entry]) -> str:
    for name in sorted(set(expected) | set(actual)):
        if name not in actual:
            return "missing {}".format(name)
        if name not in expected:
            return "extra {}".format(name)
        if expected[name] != actual[name]:
            return "different {}".format(name)
    return ""


def verify_manifest(bundle_root: Path, plans: List[SkillPlan]) -> None:
    """When supplied, verify the complete source skill file list and checksums."""
    manifest_path = bundle_root / "manifest.json"
    if not manifest_path.exists() and not manifest_path.is_symlink():
        return
    if not stat.S_ISREG(manifest_path.lstat().st_mode):
        raise InstallError("manifest must be a regular file: {}".format(manifest_path))
    with manifest_path.open(encoding="utf-8") as stream:
        manifest = json.load(stream)
    if not isinstance(manifest, dict) or manifest.get("schemaVersion") != 1:
        raise InstallError("unsupported manifest schema")
    records = manifest.get("files")
    if not isinstance(records, list):
        raise InstallError("manifest files must be a list")
    expected = {}
    for record in records:
        if not isinstance(record, dict) or not isinstance(record.get("path"), str):
            raise InstallError("invalid file record in manifest")
        name = record["path"]
        if name in expected:
            raise InstallError("duplicate file in manifest: {}".format(name))
        expected[name] = record
    actual = {}
    for plan in plans:
        for relative, entry in plan.tree.items():
            if entry.kind == "file":
                name = "Skills/{}/{}".format(plan.name, relative)
                actual[name] = (entry.digest, (plan.source / relative).stat().st_size)
    listed_skill_files = {name for name in expected if name.startswith("Skills/")}
    if listed_skill_files != set(actual):
        absent = sorted(listed_skill_files - set(actual))
        unlisted = sorted(set(actual) - listed_skill_files)
        raise InstallError("manifest source file list differs (missing: {}; unlisted: {})".format(absent, unlisted))
    for name, (digest, size) in actual.items():
        record = expected[name]
        if record.get("sha256") != digest or record.get("size") != size:
            raise InstallError("manifest checksum or size mismatch: {}".format(name))


def build_plan(bundle_root: Path, destination: Path) -> List[SkillPlan]:
    """Validate every source and every target before any filesystem mutation."""
    source_root = bundle_root.resolve() / "Skills"
    destination = destination.expanduser().absolute()
    errors = []
    plans = []
    if destination.exists() and not destination.is_dir():
        errors.append("destination is not a directory: {}".format(destination))
    elif destination.is_symlink() and not destination.exists():
        errors.append("destination is a broken symlink: {}".format(destination))
    if source_root.is_symlink():
        errors.append("bundled Skills directory must not be a symlink: {}".format(source_root))

    for name in SKILL_NAMES:
        source = source_root / name
        target = destination / name
        try:
            tree = inventory(source)
            if tree.get("SKILL.md", Entry("missing")).kind != "file":
                raise InstallError("missing regular SKILL.md: {}".format(source))
            resolved_destination = destination.resolve()
            if source.resolve() in (resolved_destination,) + tuple(resolved_destination.parents):
                raise InstallError("destination is inside a bundled skill: {}".format(destination))
            if target.is_symlink():
                try:
                    same_source = target.resolve(strict=True) == source.resolve(strict=True)
                except (OSError, RuntimeError):
                    same_source = False
                if not same_source:
                    raise InstallError("foreign or broken symlink; leave it untouched: {}".format(target))
                action = "same-source link"
            elif target.exists():
                difference = first_difference(tree, inventory(target))
                if difference:
                    raise InstallError("{}: {}; existing skill will not be replaced".format(target, difference))
                action = "identical"
            else:
                action = "copy"
            plans.append(SkillPlan(name, source, target, action, tree))
        except (OSError, RuntimeError, InstallError) as error:
            errors.append("{}: {}".format(name, error))

    if not errors:
        try:
            verify_manifest(bundle_root, plans)
        except (OSError, ValueError, InstallError) as error:
            errors.append("manifest: {}".format(error))
    if errors:
        raise ConflictError("Preflight failed; no files were changed:\n- " + "\n- ".join(errors))
    return plans


class Transaction:
    """Track only newly created nodes, so rollback never removes foreign trees."""

    def __init__(self) -> None:
        self.created = []  # type: List[Tuple[Path, Tuple[int, int, int]]]

    def remember(self, path: Path) -> None:
        self.created.append((path, identity(path)))

    def mkdir(self, path: Path) -> None:
        path.mkdir()  # Exclusive: concurrent creation is a conflict.
        self.remember(path)

    def ensure_destination(self, destination: Path) -> None:
        missing = []
        cursor = destination
        while not cursor.exists():
            if cursor.is_symlink():
                raise InstallError("broken destination ancestor: {}".format(cursor))
            missing.append(cursor)
            cursor = cursor.parent
        if not cursor.is_dir():
            raise InstallError("destination ancestor is not a directory: {}".format(cursor))
        for directory in reversed(missing):
            self.mkdir(directory)

    def copy_file(self, source: Path, target: Path, expected_digest: str) -> None:
        if not stat.S_ISREG(source.lstat().st_mode):
            raise InstallError("source is no longer a regular file: {}".format(source))
        # O_NOFOLLOW provides an additional link-race guard on supported systems.
        flags = os.O_RDONLY | getattr(os, "O_BINARY", 0) | getattr(os, "O_NOFOLLOW", 0)
        descriptor = os.open(str(source), flags)
        with os.fdopen(descriptor, "rb") as incoming:
            if not stat.S_ISREG(os.fstat(incoming.fileno()).st_mode):
                raise InstallError("source is no longer a regular file: {}".format(source))
            with target.open("xb") as outgoing:
                details = os.fstat(outgoing.fileno())
                self.created.append((target, (details.st_dev, details.st_ino, stat.S_IFMT(details.st_mode))))
                digest = hashlib.sha256()
                for chunk in iter(lambda: incoming.read(1024 * 1024), b""):
                    digest.update(chunk)
                    outgoing.write(chunk)
            if digest.hexdigest() != expected_digest:
                raise InstallError("source changed during installation: {}".format(source))
        shutil.copystat(source, target, follow_symlinks=False)

    def rollback(self) -> List[str]:
        remaining = []
        for path, original_identity in reversed(self.created):
            try:
                if identity(path) != original_identity:
                    remaining.append("left a replaced path untouched: {}".format(path))
                    continue
                if stat.S_ISDIR(original_identity[2]):
                    path.rmdir()  # A foreign/new child prevents removal.
                else:
                    if os.name == "nt":
                        path.chmod(path.stat().st_mode | stat.S_IWRITE)
                    path.unlink()
            except FileNotFoundError:
                pass
            except OSError as error:
                remaining.append("could not remove {}: {}".format(path, error))
        return remaining


def apply_plan(plans: List[SkillPlan]) -> None:
    transaction = Transaction()
    try:
        for plan in plans:
            if plan.action != "copy":
                continue
            difference = first_difference(plan.tree, inventory(plan.source))
            if difference:
                raise InstallError("source changed after preflight: {}: {}".format(plan.source, difference))
            transaction.ensure_destination(plan.target.parent)
            transaction.mkdir(plan.target)
            for relative, entry in sorted(plan.tree.items(), key=lambda item: (len(Path(item[0]).parts), item[0])):
                source = plan.source / relative
                target = plan.target / relative
                if entry.kind == "directory":
                    if not stat.S_ISDIR(source.lstat().st_mode):
                        raise InstallError("source directory changed: {}".format(source))
                    transaction.mkdir(target)
                else:
                    transaction.copy_file(source, target, entry.digest)
            difference = first_difference(plan.tree, inventory(plan.source))
            if difference:
                raise InstallError("source changed during installation: {}: {}".format(plan.source, difference))
    except BaseException:
        remaining = transaction.rollback()
        if remaining:
            print("Rollback left these paths for manual review:\n- " + "\n- ".join(remaining), file=sys.stderr)
        raise


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--destination", type=Path, default=default_destination(),
                        help="final skills directory (default: CODEX_HOME/skills or ~/.codex/skills)")
    parser.add_argument("--check", action="store_true", help="validate and show the plan without writing files")
    arguments = parser.parse_args(argv)
    try:
        plans = build_plan(Path(__file__).resolve().parent, arguments.destination)
        for plan in plans:
            print("{}: {} -> {}".format(plan.name, plan.action, plan.target))
        if arguments.check:
            print("Preflight passed. No files were changed.")
        else:
            apply_plan(plans)
            print("Installed {} skill(s); {} already present. Restart Codex to refresh skills.".format(
                sum(plan.action == "copy" for plan in plans), sum(plan.action != "copy" for plan in plans)))
        return 0
    except ConflictError as error:
        print(str(error), file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("Installation interrupted; newly created files were rolled back where safe.", file=sys.stderr)
        return 130
    except (OSError, RuntimeError, InstallError) as error:
        print("Installation failed: {}. Newly created files were rolled back where safe.".format(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

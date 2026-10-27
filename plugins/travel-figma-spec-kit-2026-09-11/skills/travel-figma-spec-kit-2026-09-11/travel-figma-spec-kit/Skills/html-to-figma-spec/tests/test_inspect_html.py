"""Safety and evidence-boundary tests for the static HTML inspector."""

import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "inspect_html.py"
SPEC = importlib.util.spec_from_file_location("inspect_html", SCRIPT)
inspector = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(inspector)


class InspectorTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name).resolve()
        self.workspace = self.root / "workspace"
        self.workspace.mkdir()
        self.html = self.workspace / "index.html"

    def tearDown(self):
        self.temporary.cleanup()

    def write(self, content):
        self.html.write_text(content, encoding="utf-8")

    def inspect(self, content, map_path=None):
        self.write(content)
        return inspector.inspect(self.html, self.workspace, map_path)

    def test_does_not_turn_classes_or_handlers_into_verified_behavior(self):
        result = self.inspect('<button class="is-active" onclick="doSomething()" aria-expanded="false" data-figma-key="abc">Open</button><script>throw new Error("never run")</script>')
        self.assertEqual(result["declaredStates"][0]["declarations"], {"aria-expanded": "false"})
        self.assertFalse(result["declaredStates"][0]["runtimeVerified"])
        self.assertFalse(result["declaredActions"][0]["runtimeVerified"])
        self.assertEqual(result["elements"][0]["labelHint"], "Open")
        self.assertFalse(result["figmaAnnotationHints"][0]["linkageVerified"])
        self.assertFalse(result["evidence"]["javascriptExecuted"])

    def test_local_dependencies_import_cycles_and_escape_are_bounded(self):
        (self.workspace / "style.css").write_text('@import "nested.css"; :root {--brand: blue} .x {color: var(--brand)}')
        (self.workspace / "nested.css").write_text('@import "style.css";')
        (self.root / "outside.css").write_text("secret")
        (self.workspace / "escaped.css").symlink_to(self.root / "outside.css")
        result = self.inspect('<link rel="stylesheet" href="style.css?v=1"><link rel="stylesheet" href="../outside.css"><link rel="stylesheet" href="escaped.css"><script src="https://example.test/x.js"></script><link rel="stylesheet" href="/style.css">')
        statuses = [item["status"] for item in result["dependencies"]]
        self.assertEqual(statuses.count("blocked-outside-workspace"), 2)
        self.assertIn("already-read", statuses)
        self.assertIn("not-read-external-or-scheme", statuses)
        self.assertIn("not-read-root-relative-url", statuses)
        self.assertEqual(result["cssHints"][0]["referencedCustomProperties"], ["--brand"])
        self.assertNotIn("secret", json.dumps(result))

    def test_base_href_is_not_silently_resolved_against_local_directory(self):
        (self.workspace / "style.css").write_text(":root {--wrong: 1}")
        result = self.inspect('<base href="https://example.test/"><link rel="stylesheet" href="style.css">')
        self.assertEqual(result["dependencies"][0]["status"], "not-read-base-href-needs-browser-resolution")
        self.assertEqual(result["cssHints"], [])

    def test_explicit_web_root_resolves_urls_and_blocks_root_escape(self):
        document_root = self.workspace / "public"
        document_root.mkdir()
        (document_root / "style.css").write_text(":root {--brand: green}")
        (self.workspace / "private.css").write_text("secret")
        (document_root / "escape.css").symlink_to(self.workspace / "private.css")
        self.write('<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/../private.css"><link rel="stylesheet" href="/escape.css">')
        result = inspector.inspect(self.html, self.workspace, web_root=document_root)
        self.assertEqual(result["source"]["webRoot"], str(document_root))
        self.assertEqual([item["status"] for item in result["dependencies"]],
                         ["read-static-text", "blocked-outside-web-root", "blocked-outside-web-root"])
        outside_root = self.workspace / "outside-root"
        outside_root.symlink_to(self.root)
        with self.assertRaises(ValueError):
            inspector.inspect(self.html, self.workspace, web_root=outside_root)

    def test_exact_map_matches_preserve_key_type_and_status_without_claiming_linkage(self):
        registry = self.workspace / "map.json"
        registry.write_text(json.dumps({"schemaVersion": 1, "entries": [
            {"id": "outline", "status": "verified", "code": {"component": "InputOutlined", "classes": ["Input-Outlined"], "selectors": ["input.Input-Outlined[type=search]"]}, "figma": {"key": {"type": "componentSetKey", "value": "abc"}}},
            {"id": "unsupported", "status": "candidate", "code": {"selectors": [".wrap input"]}}
        ]}))
        result = self.inspect('<div><input class="Input-Outlined" type="search"><input class="Input-OutlinedSimilar"></div>', registry)
        match = result["elements"][0]["componentMatches"][0]
        self.assertEqual(match["registryStatus"], "verified")
        self.assertEqual(match["keyKind"], "componentSetKey")
        self.assertEqual(match["importReadiness"], "requires-live-verification")
        self.assertEqual(match["linkageStatus"], "candidate-from-static-html")
        self.assertEqual(result["elements"][1]["componentMatches"], [])
        self.assertTrue(any(item["type"] == "unsupported-map-selectors" for item in result["unresolved"]))

    def test_output_defaults_to_stdout_and_protects_sources(self):
        self.write("<button>Go</button>")
        before = set(self.workspace.iterdir())
        with contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(inspector.main(["--html", str(self.html), "--workspace", str(self.workspace)]), 0)
        self.assertEqual(json.loads(output.getvalue())["elements"][0]["labelHint"], "Go")
        self.assertEqual(set(self.workspace.iterdir()), before)
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
            inspector.main(["--html", str(self.html), "--workspace", str(self.workspace), "--output", str(self.html)])
        self.assertEqual(error.exception.code, 2)
        self.assertEqual(self.html.read_text(), "<button>Go</button>")
        export = self.workspace / "new-artifacts" / "nested" / "report.json"
        inspector.main(["--html", str(self.html), "--workspace", str(self.workspace), "--output", str(export)])
        self.assertTrue(export.is_file())

    def test_unresolved_and_unknown_figma_targets_remain_candidates(self):
        registry = self.workspace / "map.json"
        registry.write_text(json.dumps({"schemaVersion": 1, "entries": [
            {"id": "missing-target", "status": "unresolved", "code": {"classes": ["Control"]}, "figma": None},
            {"id": "unknown-key", "status": "candidate", "code": {"classes": ["Control"]}, "figma": {"key": {"type": "nodeId", "value": "1:2"}}}
        ]}))
        result = self.inspect('<button class="Control">Go</button>', registry)
        matches = result["elements"][0]["componentMatches"]
        self.assertEqual(matches[0]["registryStatus"], "unresolved")
        self.assertFalse(matches[0]["keyIsRecognized"])
        self.assertEqual(matches[1]["keyKind"], "nodeId")
        self.assertFalse(matches[1]["keyIsRecognized"])
        self.assertTrue(any(item["type"] == "multiple-map-candidates" for item in result["unresolved"]))

    def test_input_symlink_outside_workspace_is_rejected(self):
        external = self.root / "external.html"
        external.write_text("<button>Outside</button>")
        self.html.symlink_to(external)
        with self.assertRaises(ValueError):
            inspector.inspect(self.html, self.workspace)


if __name__ == "__main__":
    unittest.main()

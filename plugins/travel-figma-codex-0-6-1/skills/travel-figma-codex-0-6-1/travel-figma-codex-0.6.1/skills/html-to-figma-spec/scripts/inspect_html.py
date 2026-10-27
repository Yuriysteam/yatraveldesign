#!/usr/bin/env python3
"""Read local prototype declarations; never execute JavaScript or fetch URLs."""

import argparse
from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

MAX_BYTES = 5 * 1024 * 1024
MAX_DEPENDENCIES = 64
VOID = set("area base br col embed hr img input link meta param source track wbr".split())
BLOCKS = set("main section article aside nav header footer form dialog details fieldset table ul ol".split())
CONTROLS = set("button input select textarea summary option".split())
CONTROL_ROLES = set("button checkbox combobox link listbox menuitem radio slider spinbutton switch tab textbox".split())
STATES = set("hidden inert disabled checked selected multiple required readonly open aria-expanded aria-checked aria-selected aria-disabled aria-invalid aria-busy aria-current aria-pressed".split())
SELECTOR_PART = re.compile(r'(?P<tag>^[a-zA-Z][\w-]*|^\*)|(?P<class>\.[\w-]+)|(?P<id>\#[\w-]+)|\[(?P<attr>[\w:-]+)(?:\s*=\s*(?:"(?P<dq>[^"]*)"|\x27(?P<sq>[^\x27]*)\x27|(?P<bare>[^\]\s]+)))?\]')
CSS_COMMENT = re.compile(r'/\*.*?\*/', re.S)
CSS_IMPORT = re.compile(r'@import\s+(?:url\(\s*)?["\x27]([^"\x27]+)["\x27]|@import\s+url\(\s*([^\s)]+)', re.I)


def read_text(path):
    if path.stat().st_size > MAX_BYTES:
        raise ValueError(f"File exceeds {MAX_BYTES} bytes: {path}")
    return path.read_text(encoding="utf-8-sig", errors="replace")


def within(path, workspace):
    return path == workspace or workspace in path.parents


def css_identifier(value):
    # Escape IDs for display only. Matching below uses original attributes.
    return "".join(c if (c.isascii() and (c.isalnum() or c in "_-")) and not (i == 0 and c.isdigit())
                   else f"\\{ord(c):x} " for i, c in enumerate(value))


class InventoryParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.nodes = []
        self.stack = []
        self.root_counts = Counter()
        self.style_sources = []
        self.inline_script_count = 0
        self.base_hrefs = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        parent = self.stack[-1] if self.stack else None
        counts = parent["child_counts"] if parent else self.root_counts
        counts[tag] += 1
        structural = f"{tag}:nth-of-type({counts[tag]})"
        if parent:
            structural = parent["selector"] + " > " + structural
        node = {"tag": tag, "attributes": attributes, "line": self.getpos()[0],
                "selector": structural, "text": [], "child_counts": Counter()}
        self.nodes.append(node)
        if tag == "base" and attributes.get("href"):
            self.base_hrefs.append(attributes["href"])
        if tag == "script" and not attributes.get("src"):
            self.inline_script_count += 1
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index]["tag"] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        if not self.stack:
            return
        if self.stack[-1]["tag"] == "style":
            self.style_sources.append({"line": self.stack[-1]["line"], "text": data})
            return
        if self.stack[-1]["tag"] in {"script", "noscript"}:
            return
        compact = " ".join(data.split())
        if compact:
            for node in self.stack:
                if len(" ".join(node["text"])) < 200:
                    node["text"].append(compact[:200])


def simple_selector_matches(selector, node):
    """Return None for unsupported syntax, bool for a simple compound selector."""
    selector = selector.strip()
    position = 0
    matches = []
    attrs = node["attributes"]
    for part in SELECTOR_PART.finditer(selector):
        if part.start() != position:
            return None
        position = part.end()
        if part.group("tag"):
            matches.append(part.group("tag") in {"*", node["tag"]})
        elif part.group("class"):
            matches.append(part.group("class")[1:] in (attrs.get("class") or "").split())
        elif part.group("id"):
            matches.append(part.group("id")[1:] == attrs.get("id"))
        else:
            name = part.group("attr").lower()
            values = [part.group(k) for k in ("dq", "sq", "bare") if part.group(k) is not None]
            matches.append(name in attrs and (not values or attrs[name] == values[0]))
    return all(matches) if matches and position == len(selector) else None


def load_registry(path):
    if path is None:
        return {"schemaVersion": 1, "entries": []}
    registry = json.loads(read_text(path))
    if registry.get("schemaVersion") != 1 or not isinstance(registry.get("entries"), list):
        raise ValueError("Component map must use schemaVersion 1 and an entries array")
    for entry in registry["entries"]:
        if not isinstance(entry, dict) or not isinstance(entry.get("code"), dict):
            raise ValueError("Every map entry requires an object with a code object")
        if entry.get("status") not in {"candidate", "verified", "unresolved"}:
            raise ValueError(f"Invalid map status for {entry.get('id')}")
        for field in ("classes", "selectors"):
            values = entry["code"].get(field, [])
            if not isinstance(values, list) or not all(isinstance(v, str) for v in values):
                raise ValueError(f"code.{field} must be a string array")
    return registry


def match_components(node, registry):
    result = []
    classes = (node["attributes"].get("class") or "").split()
    for entry in registry["entries"]:
        code = entry["code"]
        evidence = [{"type": "class", "value": value} for value in code.get("classes", []) if value in classes]
        evidence += [{"type": "selector", "value": selector} for selector in code.get("selectors", [])
                     if simple_selector_matches(selector, node) is True]
        if not evidence:
            continue
        figma = entry.get("figma") or {}
        key = figma.get("key") or {}
        key_kind = key.get("type")
        result.append({"entryId": entry.get("id"), "codeComponent": code.get("component"), "codeSystem": code.get("system"),
                       "registryStatus": entry["status"], "matchedEvidence": evidence,
                       "figma": figma, "keyKind": key_kind,
                       "keyIsRecognized": key_kind in {"assetKey", "componentKey", "componentSetKey"},
                       "linkageStatus": "candidate-from-static-html",
                       "importReadiness": "requires-live-verification",
                       "unresolved": entry.get("unresolved", [])})
    return result


def css_hints(content, source):
    content = CSS_COMMENT.sub("", content)
    declarations = [{"name": match.group(1), "value": match.group(2).strip()[:300]}
                    for match in re.finditer(r'(--[\w-]+)\s*:\s*([^;{}]+)', content)]
    return {"source": source, "customPropertyDeclarations": declarations,
            "referencedCustomProperties": sorted(set(re.findall(r'var\(\s*(--[\w-]+)', content))),
            "evidenceLevel": "static-text-hint", "cascadeComputed": False}


def local_dependency(reference, origin, workspace, kind, base_href=False, web_root=None):
    result = {"reference": reference, "declaredIn": str(origin), "kind": kind}
    parts = urlsplit(reference)
    if parts.scheme or parts.netloc:
        return {**result, "status": "not-read-external-or-scheme"}
    if base_href:
        return {**result, "status": "not-read-base-href-needs-browser-resolution"}
    if not parts.path:
        return {**result, "status": "not-read-empty-or-fragment"}
    decoded = unquote(parts.path)
    # A root-relative URL needs an explicitly supplied document root.
    if decoded.startswith("/"):
        if web_root is None:
            return {**result, "status": "not-read-root-relative-url"}
        path = (web_root / decoded.lstrip("/")).resolve()
        if not within(path, web_root):
            return {**result, "status": "blocked-outside-web-root", "resolvedPath": str(path)}
    else:
        path = (origin.parent / decoded).resolve()
    if not within(path, workspace):
        return {**result, "status": "blocked-outside-workspace", "resolvedPath": str(path)}
    if not path.is_file():
        return {**result, "status": "missing", "resolvedPath": str(path)}
    return {**result, "status": "local", "resolvedPath": str(path)}


def inspect(html_path, workspace, map_path=None, web_root=None):
    workspace = workspace.resolve(strict=True)
    html_path = html_path.resolve(strict=True)
    if not workspace.is_dir() or not within(html_path, workspace):
        raise ValueError("HTML input must be a file inside the workspace root (symlinks resolved)")
    if web_root is not None:
        web_root = web_root.resolve(strict=True)
        if not web_root.is_dir() or not within(web_root, workspace):
            raise ValueError("Web root must be a directory inside the workspace (symlinks resolved)")
    parser = InventoryParser()
    parser.feed(read_text(html_path))
    parser.close()
    registry = load_registry(map_path)
    inventory, states, actions, overrides, figma_hints = [], [], [], [], []
    dependencies, css_sources, unresolved = [], [], []
    pending = []
    unsupported_selectors = sorted({selector for entry in registry["entries"]
                                    for selector in entry["code"].get("selectors", [])
                                    if simple_selector_matches(selector, {"tag": "div", "attributes": {}}) is None})
    if unsupported_selectors:
        unresolved.append({"type": "unsupported-map-selectors", "selectors": unsupported_selectors})
    for node in parser.nodes:
        attrs = node["attributes"]
        tag, selector = node["tag"], node["selector"]
        matches = match_components(node, registry)
        is_control = tag in CONTROLS or (tag == "a" and "href" in attrs) or attrs.get("role") in CONTROL_ROLES
        is_block = tag in BLOCKS or attrs.get("role") in {"main", "navigation", "region", "dialog", "banner", "complementary"}
        data_attrs = {key: value for key, value in attrs.items() if key.startswith("data-")}
        if is_control or is_block or matches or "data-component" in attrs:
            item = {"selector": selector, "tag": tag, "line": node["line"],
                    "kind": "control" if is_control else "block" if is_block else "component-candidate",
                    "id": attrs.get("id"), "classes": (attrs.get("class") or "").split(),
                    "dataAttributes": data_attrs, "role": attrs.get("role"),
                    "inputType": attrs.get("type") if tag == "input" else None,
                    "labelHint": (attrs.get("aria-label") or attrs.get("placeholder") or " ".join(node["text"]))[:200],
                    "componentMatches": matches}
            if attrs.get("id"):
                item["idSelectorHint"] = "#" + css_identifier(attrs["id"])
            inventory.append(item)
            if (is_control or "data-component" in attrs) and not matches:
                unresolved.append({"type": "unmapped-element", "selector": selector, "tag": tag,
                                   "classes": item["classes"]})
            if len(matches) > 1:
                unresolved.append({"type": "multiple-map-candidates", "selector": selector,
                                   "entryIds": [match["entryId"] for match in matches]})
        declared_states = {key: value if value is not None else True for key, value in attrs.items() if key in STATES}
        if declared_states:
            states.append({"selector": selector, "declarations": declared_states,
                           "evidenceLevel": "html-attribute", "runtimeVerified": False})
        declared_actions = {key: value for key, value in attrs.items()
                            if key.startswith("on") or key in {"data-action", "data-target"}}
        if tag == "a" and "href" in attrs:
            declared_actions["href"] = attrs["href"]
        if tag == "form":
            declared_actions.update({key: attrs[key] for key in ("action", "method") if key in attrs})
        if declared_actions:
            actions.append({"selector": selector, "declarations": declared_actions,
                            "evidenceLevel": "html-attribute", "runtimeVerified": False})
        if attrs.get("style"):
            overrides.append({"selector": selector, "declaration": attrs["style"],
                              "computed": False, "hints": css_hints(attrs["style"], f"{html_path}:{node['line']}")})
        hints = {key: value for key, value in data_attrs.items() if key.startswith("data-figma")}
        if hints:
            figma_hints.append({"selector": selector, "declarations": hints,
                                "linkageVerified": False, "reason": "HTML annotations require source/live verification"})
        if tag == "script" and attrs.get("src"):
            pending.append((attrs["src"], html_path, "javascript", bool(parser.base_hrefs)))
        if tag == "link" and "stylesheet" in (attrs.get("rel") or "").lower().split() and attrs.get("href"):
            pending.append((attrs["href"], html_path, "stylesheet", bool(parser.base_hrefs)))
    for source in parser.style_sources:
        css_sources.append(css_hints(source["text"], f"{html_path}:{source['line']}"))
        for match in CSS_IMPORT.finditer(CSS_COMMENT.sub("", source["text"])):
            pending.append((match.group(1) or match.group(2), html_path, "stylesheet-import", bool(parser.base_hrefs)))
    read_paths = set()
    while pending and len(dependencies) < MAX_DEPENDENCIES:
        reference, origin, kind, has_base = pending.pop(0)
        dependency = local_dependency(reference, origin, workspace, kind, has_base, web_root)
        dependencies.append(dependency)
        if dependency["status"] != "local":
            continue
        path = Path(dependency["resolvedPath"])
        if path in read_paths:
            dependency["status"] = "already-read"
            continue
        read_paths.add(path)
        try:
            content = read_text(path)
        except (OSError, ValueError) as error:
            dependency.update(status="not-read", reason=str(error))
            continue
        dependency.update(status="read-static-text", bytes=path.stat().st_size)
        if kind.startswith("stylesheet"):
            css_sources.append(css_hints(content, str(path)))
            for match in CSS_IMPORT.finditer(CSS_COMMENT.sub("", content)):
                pending.append((match.group(1) or match.group(2), path, "stylesheet-import", False))
        # JavaScript is only inventoried. No execution or inferred state transitions.
    if pending:
        unresolved.append({"type": "dependency-limit", "remainingDeclarations": len(pending)})
    unresolved.extend({"type": "dependency", **dependency} for dependency in dependencies
                      if dependency["status"] not in {"read-static-text", "already-read"})
    return {"schemaVersion": 1, "source": {"html": str(html_path), "workspace": str(workspace),
            "componentMap": str(map_path.resolve()) if map_path else None, "webRoot": str(web_root) if web_root else None},
            "evidence": {"mode": "static-source-only", "browserInspected": False,
                         "javascriptExecuted": False, "networkRequests": False, "figmaVerified": False},
            "summary": {"htmlElements": len(parser.nodes), "inventoryElements": len(inventory),
                        "matchedElements": sum(bool(item["componentMatches"]) for item in inventory),
                        "unresolvedItems": len(unresolved), "inlineScripts": parser.inline_script_count},
            "elements": inventory, "declaredStates": states, "declaredActions": actions,
            "dependencies": dependencies, "cssHints": css_sources, "inlineOverrides": overrides,
            "figmaAnnotationHints": figma_hints, "unresolved": unresolved,
            "limitations": ["Static HTML parsing is not a rendered DOM or accessibility tree; browser repair, templates and generated nodes may differ.",
                            "No JavaScript execution or transition verification; event and state attributes are declarations only.",
                            "Class names, data attributes and registry matches identify candidates, never prove Figma linkage or shipped behavior.",
                            "Registry verified status and key type are preserved; current Figma target, publication and suitability still require live inspection.",
                            "CSS hints are text extraction, not a CSS parser, cascade, computed style or token binding verification.",
                            "Only direct HTML script/stylesheet URLs and quoted/url CSS imports are inventoried; JS imports, CSS assets, workers and runtime dependencies are not traversed.",
                            "Remote URLs, base-href dependent URLs and paths outside workspace are not read; root-relative URLs require an explicit web root.",
                            f"UTF-8 text only; each source limited to {MAX_BYTES} bytes and dependencies to {MAX_DEPENDENCIES} declarations."]}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--html", required=True, type=Path, help="Local HTML file inside workspace")
    parser.add_argument("--workspace", required=True, type=Path, help="Allowed root for HTML and local dependencies")
    parser.add_argument("--web-root", type=Path, help="Optional explicitly verified document root inside workspace for root-relative URLs")
    parser.add_argument("--map", dest="map_path", type=Path, help="Component map JSON; defaults to sibling references/component-map.json when present")
    parser.add_argument("--output", type=Path, help="Write inventory here; omitted means stdout (no files created)")
    args = parser.parse_args(argv)
    if args.map_path is None:
        default = Path(__file__).resolve().parent.parent / "references" / "component-map.json"
        args.map_path = default if default.is_file() else None
    try:
        output = json.dumps(inspect(args.html, args.workspace, args.map_path, args.web_root), ensure_ascii=False, indent=2) + "\n"
        if args.output:
            # Never overwrite the prototype, map or a dependency while exporting a read-only report.
            target = args.output.resolve()
            result = json.loads(output)
            protected = {args.html.resolve(), args.map_path.resolve() if args.map_path else None}
            protected.update(Path(item["resolvedPath"]) for item in result["dependencies"] if "resolvedPath" in item)
            if target in protected:
                raise ValueError("Output must not overwrite an inspected source, map or dependency")
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(output, encoding="utf-8")
        else:
            sys.stdout.write(output)
    except (OSError, ValueError) as error:
        parser.exit(2, f"inspect_html: {error}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sourceSkillsRoot = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const packageNames = ["figma-spec-builder", "figma-design-machine", "travel-figma-design-system", "yandex-travel-ux-writing"];

// Every test owns a fresh copy; installers, user skills and live Figma are never invoked.
function withFixture(run) {
  const temporaryParent = fs.realpathSync(os.tmpdir());
  const fixtureRoot = fs.mkdtempSync(path.join(temporaryParent, "figma-spec-validation-"));
  const fixtureIdentity = fs.lstatSync(fixtureRoot);
  try {
    for (const packageName of packageNames) {
      fs.cpSync(path.join(sourceSkillsRoot, packageName), path.join(fixtureRoot, packageName), { recursive: true });
    }
    run(fixtureRoot);
  } finally {
    const currentIdentity = fs.lstatSync(fixtureRoot);
    assert.equal(path.dirname(fixtureRoot), temporaryParent);
    assert.ok(currentIdentity.isDirectory() && !currentIdentity.isSymbolicLink());
    assert.equal(currentIdentity.ino, fixtureIdentity.ino);
    assert.equal(currentIdentity.dev, fixtureIdentity.dev);
    removeFixtureDirectory(fixtureRoot);
  }
}

// Inspect each entry and unlink symlinks themselves; never follow a fixture link.
function removeFixtureDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    const stat = fs.lstatSync(entryPath);
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      removeFixtureDirectory(entryPath);
    } else {
      assert.ok(stat.isFile() || stat.isSymbolicLink(), `Unexpected fixture entry: ${entryPath}`);
      fs.unlinkSync(entryPath);
    }
  }
  fs.rmdirSync(directory);
}

function validate(fixtureRoot) {
  const result = spawnSync(process.execPath, [path.join(fixtureRoot, "figma-spec-builder/scripts/validate-package.mjs")], {
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.ifError(result.error);
  return { status: result.status, output: result.stdout + result.stderr };
}

function writeFixture(fixtureRoot, relativePath, content) {
  const destination = path.join(fixtureRoot, relativePath);
  assert.ok(destination.startsWith(`${fixtureRoot}${path.sep}`));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
}

test("the real package passes structural validation without claiming a behavior test", () => {
  withFixture((root) => {
    assert.equal(fs.existsSync(path.join(root, "yandex-travel-ux-writing/scripts")), false);
    const result = validate(root);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /структура пакета корректна/);
    assert.match(result.output, /Поведение агента, доступ к Figma и качество спеки не проверялись/);
  });
});

test("the autonomous editor must include its bundled source documents", () => {
  withFixture((root) => {
    fs.unlinkSync(path.join(root, "yandex-travel-ux-writing/references/sources/tov.txt"));
    const result = validate(root);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Нет обычного обязательного файла: yandex-travel-ux-writing\/references\/sources\/tov\.txt/);
  });
});

test("an empty folded editor description is rejected", () => {
  withFixture((root) => {
    writeFixture(root, "yandex-travel-ux-writing/SKILL.md", "---\nname: yandex-travel-ux-writing\ndescription: >-\n---\n# Editor\n");
    const result = validate(root);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /yandex-travel-ux-writing\/SKILL\.md: пустое или нераспознанное description/);
  });
});

test("the editor manifest version must match its version.json release", () => {
  withFixture((root) => {
    const manifestPath = "yandex-travel-ux-writing/sources-manifest.json";
    const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), "utf8"));
    manifest.package_version = "0.0.0";
    writeFixture(root, manifestPath, JSON.stringify(manifest));
    const result = validate(root);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /sources-manifest\.json: package или package_version не совпадает с version\.json/);
  });
});

test("malformed editor release JSON produces a validation error without crashing", () => {
  withFixture((root) => {
    writeFixture(root, "yandex-travel-ux-writing/version.json", "{ invalid release }");
    const result = validate(root);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /yandex-travel-ux-writing\/version\.json: некорректный JSON/);
    assert.doesNotMatch(result.output, /at JSON\.parse|at file:/);
  });
});

test("new modules are scanned recursively, including reference-style links", () => {
  withFixture((root) => {
    writeFixture(root, "figma-spec-builder/references/new-module.md", "Read [details][missing].\n\n[missing]: nested/absent.md\n");
    const result = validate(root);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /new-module\.md: не разрешается ссылка nested\/absent\.md/);
  });
});

test("valid companion links and titled links to filenames with spaces remain supported", () => {
  withFixture((root) => {
    writeFixture(root, "figma-spec-builder/references/new module.md", "# Module\n");
    writeFixture(root, "figma-spec-builder/references/link-check.MD", [
      "[Companion](../../travel-figma-design-system/SKILL.md)",
      '[Module](<new module.md> "Title")',
      "[Reference][module]",
      '[module]: <new module.md> "Title"',
      "[Web](https://example.com/reference)",
    ].join("\n"));
    const result = validate(root);
    assert.equal(result.status, 0, result.output);
  });
});

test("an existing workspace file outside the four shipped skills is rejected", () => {
  withFixture((root) => {
    writeFixture(root, "legacy/SKILL.md", "# Existing but not shipped\n");
    writeFixture(root, "figma-spec-builder/references/external.md", "[Legacy](../../legacy/SKILL.md)\n");
    const result = validate(root);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /ссылка выходит за пределы поставляемых навыков/);
  });
});

test("package symlinks cannot hide dependencies outside the shipped roots", () => {
  withFixture((root) => {
    writeFixture(root, "legacy/SKILL.md", "# Existing but not shipped\n");
    fs.symlinkSync(path.join(root, "legacy"), path.join(root, "figma-spec-builder/references/linked-module"), "dir");
    const result = validate(root);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /linked-module: поставка не допускает symlink/);
  });
});

test("malformed URI encoding produces a useful diagnostic instead of an uncaught exception", () => {
  withFixture((root) => {
    writeFixture(root, "figma-spec-builder/references/malformed.md", "[Broken](bad%ZZ.md)\n");
    const result = validate(root);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /malformed\.md: некорректное URI-кодирование ссылки bad%ZZ\.md/);
    assert.doesNotMatch(result.output, /URIError|at decodeURIComponent/);
  });
});

test("new JSON resources are checked even when absent from the required-file list", () => {
  withFixture((root) => {
    writeFixture(root, "figma-spec-builder/references/new-data.json", "{ invalid JSON }");
    const result = validate(root);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /new-data\.json: некорректный JSON/);
  });
});

test("a directory cannot satisfy a required-file check", () => {
  withFixture((root) => {
    const requiredFile = path.join(root, "figma-spec-builder/references/workflow.md");
    assert.ok(fs.lstatSync(requiredFile).isFile());
    fs.unlinkSync(requiredFile);
    fs.mkdirSync(requiredFile);
    const result = validate(root);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Нет обычного обязательного файла: figma-spec-builder\/references\/workflow\.md/);
    assert.doesNotMatch(result.output, /EISDIR/);
  });
});

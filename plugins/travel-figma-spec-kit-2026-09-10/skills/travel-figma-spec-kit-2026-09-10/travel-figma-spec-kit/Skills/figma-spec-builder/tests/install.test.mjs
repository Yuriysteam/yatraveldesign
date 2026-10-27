import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sourceSkillsRoot = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const packageNames = ["figma-spec-builder", "figma-design-machine", "travel-figma-design-system", "sasha"];
const companionName = "travel-figma-design-system";
const referencePath = "references/organisms20-figma-map.md";

function removeFixtureDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    const stat = fs.lstatSync(entryPath);
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      removeFixtureDirectory(entryPath);
    } else {
      assert.ok(stat.isFile() || stat.isSymbolicLink() || stat.isFIFO(), `Unexpected fixture entry: ${entryPath}`);
      fs.unlinkSync(entryPath);
    }
  }
  fs.rmdirSync(directory);
}

function withInstallFixture(run) {
  const temporaryParent = fs.realpathSync(os.tmpdir());
  const fixtureRoot = fs.mkdtempSync(path.join(temporaryParent, "figma-spec-install-"));
  const fixtureIdentity = fs.lstatSync(fixtureRoot);
  const sourceRoot = path.join(fixtureRoot, "Source Skills");
  const destinationRoot = path.join(fixtureRoot, "Codex Home");
  try {
    fs.mkdirSync(sourceRoot);
    fs.mkdirSync(destinationRoot);
    for (const packageName of packageNames) {
      fs.cpSync(path.join(sourceSkillsRoot, packageName), path.join(sourceRoot, packageName), { recursive: true });
    }
    const companionRoot = path.join(destinationRoot, "skills", companionName);
    fs.mkdirSync(path.dirname(companionRoot));
    fs.cpSync(path.join(sourceRoot, companionName), companionRoot, { recursive: true });
    run({ sourceRoot, destinationRoot, companionRoot });
  } finally {
    const currentIdentity = fs.lstatSync(fixtureRoot);
    assert.equal(path.dirname(fixtureRoot), temporaryParent);
    assert.ok(currentIdentity.isDirectory() && !currentIdentity.isSymbolicLink());
    assert.equal(currentIdentity.ino, fixtureIdentity.ino);
    assert.equal(currentIdentity.dev, fixtureIdentity.dev);
    removeFixtureDirectory(fixtureRoot);
  }
}

function install({ sourceRoot, destinationRoot }) {
  const result = spawnSync("/bin/sh", [path.join(sourceRoot, "figma-spec-builder/scripts/install.sh")], {
    encoding: "utf8",
    timeout: 10_000,
    // The installer can write only into this fixture; source links also stay inside it.
    env: {
      ...process.env,
      CODEX_HOME: destinationRoot,
      PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? "/usr/bin:/bin"}`,
    },
  });
  assert.ifError(result.error);
  return { status: result.status, output: result.stdout + result.stderr };
}

function snapshot(directory) {
  return fs.readdirSync(directory).sort().map((name) => {
    const entryPath = path.join(directory, name);
    const stat = fs.lstatSync(entryPath);
    if (stat.isSymbolicLink()) return [name, "symlink", fs.readlinkSync(entryPath)];
    if (stat.isDirectory()) return [name, "directory", snapshot(entryPath)];
    if (stat.isFile()) return [name, "file", crypto.createHash("sha256").update(fs.readFileSync(entryPath)).digest("hex")];
    return [name, "special", stat.mode];
  });
}

function expectConflictWithoutWrites(fixture) {
  const before = snapshot(fixture.destinationRoot);
  const result = install(fixture);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Конфликт:/);
  assert.deepEqual(snapshot(fixture.destinationRoot), before, "A conflict must not create links or modify the existing copy");
}

test("an identical companion copy is retained and repeated installation preserves source links", () => {
  withInstallFixture((fixture) => {
    const companionBefore = snapshot(fixture.companionRoot);
    const first = install(fixture);
    assert.equal(first.status, 0, first.output);
    assert.ok(fs.lstatSync(fixture.companionRoot).isDirectory());
    assert.deepEqual(snapshot(fixture.companionRoot), companionBefore);
    for (const packageName of packageNames.filter((name) => name !== companionName)) {
      const target = path.join(fixture.destinationRoot, "skills", packageName);
      assert.ok(fs.lstatSync(target).isSymbolicLink());
      assert.equal(fs.realpathSync(target), path.join(fixture.sourceRoot, packageName));
    }
    const installed = snapshot(fixture.destinationRoot);
    const second = install(fixture);
    assert.equal(second.status, 0, second.output);
    assert.deepEqual(snapshot(fixture.destinationRoot), installed);
  });
});

test("matching SKILL with a changed reference rejects before any installation writes", () => {
  withInstallFixture((fixture) => {
    fs.appendFileSync(path.join(fixture.companionRoot, referencePath), "\nChanged reference fixture\n");
    expectConflictWithoutWrites(fixture);
  });
});

test("matching SKILL with a missing reference rejects before any installation writes", () => {
  withInstallFixture((fixture) => {
    const target = path.join(fixture.companionRoot, referencePath);
    assert.ok(fs.lstatSync(target).isFile());
    fs.unlinkSync(target);
    expectConflictWithoutWrites(fixture);
  });
});

test("an extra file makes the companion tree incompatible", () => {
  withInstallFixture((fixture) => {
    fs.writeFileSync(path.join(fixture.companionRoot, "references/extra.md"), "# Extra local reference\n");
    expectConflictWithoutWrites(fixture);
  });
});

test("a nested symlink is rejected even when it resolves to identical reference content", () => {
  withInstallFixture((fixture) => {
    const target = path.join(fixture.companionRoot, referencePath);
    assert.ok(fs.lstatSync(target).isFile());
    fs.unlinkSync(target);
    fs.symlinkSync(path.join(fixture.sourceRoot, companionName, referencePath), target);
    expectConflictWithoutWrites(fixture);
  });
});

test("a nested special file is rejected before recursive content comparison", () => {
  withInstallFixture((fixture) => {
    const target = path.join(fixture.companionRoot, "references/fixture-pipe");
    const created = spawnSync("mkfifo", [target], { encoding: "utf8" });
    assert.ifError(created.error);
    assert.equal(created.status, 0, created.stderr);
    assert.ok(fs.lstatSync(target).isFIFO());
    expectConflictWithoutWrites(fixture);
  });
});

#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const skillRoot = path.dirname(path.dirname(scriptPath));
const teamSkillsRoot = path.dirname(skillRoot);

const requiredReferences = [
  "figma-spec-sufficiency.md",
  "organize-and-shell.md",
  "scenarios-states-and-overlays.md",
  "arrow-routing.md",
  "design-system-and-components.md",
  "workflow.md",
  "quality-gates.md",
];

const packageFiles = new Map([
  ["figma-spec-builder", [
    "SKILL.md",
    "agents/openai.yaml",
    "CHANGELOG.md",
    "README.md",
    "scripts/install.sh",
    "scripts/validate.sh",
    "scripts/validate-package.mjs",
    ...requiredReferences.map((name) => `references/${name}`),
  ]],
  ["figma-design-machine", [
    "SKILL.md",
    "agents/openai.yaml",
    "CHANGELOG.md",
    "references/b2b-travel-builder.md",
  ]],
  ["travel-figma-design-system", [
    "SKILL.md",
    "agents/openai.yaml",
    "CHANGELOG.md",
    "references/organisms20-figma-map.md",
    "references/base20-figma-map.md",
    "references/base20-figma-components.json",
  ]],
  ["sasha", [
    "SKILL.md",
    "agents/openai.yaml",
    "references/01-principles.md",
    "references/02-components.md",
    "references/03-errors.md",
    "references/04-typography.md",
    "references/05-code-review.md",
    "references/06-examples.md",
    "references/rules.json",
    "scripts/extract_ui_strings.py",
    "scripts/ui_text_lint.py",
  ]],
]);

const errors = [];
const warnings = [];
const absoluteUserPath = /\/Users\/[A-Za-z0-9._-]+\//;
const shippedFiles = new Map();
const shippedRoots = [...packageFiles.keys()].map(packageRoot);
const textExtensions = new Set([".md", ".yaml", ".yml", ".json", ".sh", ".mjs", ".js", ".ts", ".py", ".txt"]);

function packageRoot(packageName) {
  return path.join(teamSkillsRoot, packageName);
}

function readPackage(packageName, relativePath) {
  return fs.readFileSync(path.join(packageRoot(packageName), relativePath), "utf8");
}

function countLines(text) {
  return text.split(/\r?\n/).length;
}

function collectFiles(packageName, relativeDirectory = "") {
  const files = [];
  const directory = path.join(packageRoot(packageName), relativeDirectory);
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === ".DS_Store") continue;
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) {
      errors.push(`${packageName}/${relativePath}: поставка не допускает symlink или специальный файл`);
    } else if (entry.isDirectory()) {
      files.push(...collectFiles(packageName, relativePath));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

function isShippedPath(target) {
  return shippedRoots.some((root) => target === root || target.startsWith(`${root}${path.sep}`));
}

function parseFrontmatter(packageName) {
  const skill = readPackage(packageName, "SKILL.md");
  const match = skill.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    errors.push(`${packageName}/SKILL.md: нет корректного YAML frontmatter`);
    return {};
  }

  const yaml = match[1];
  return {
    skill,
    name: yaml.match(/^name:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim(),
    description: yaml.match(/^description:\s*["']([\s\S]*?)["']\s*$/m)?.[1]?.trim(),
    version: yaml.match(/^\s*version:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim(),
  };
}

function validateLinks(packageName, relativePath) {
  const content = readPackage(packageName, relativePath);
  const targets = [
    ...content.matchAll(/\[[^\]]*\]\(\s*(<[^>\n]*>|[^\s)]+)(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^\n)]*\)))?\s*\)/g),
    ...content.matchAll(/^ {0,3}\[[^\]]+\]:[ \t]*(<[^>\n]*>|[^\s]+)(?:[ \t]+.*)?$/gm),
  ];
  for (const match of targets) {
    const rawTarget = match[1].replace(/^<|>$/g, "");
    if (!rawTarget || rawTarget.startsWith("#")) continue;
    if (/^file:/i.test(rawTarget)) {
      errors.push(`${packageName}/${relativePath}: непереносимая локальная ссылка ${rawTarget}`);
      continue;
    }
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(rawTarget)) continue;
    let decodedTarget;
    try {
      decodedTarget = decodeURIComponent(rawTarget.split(/[?#]/)[0]);
    } catch {
      errors.push(`${packageName}/${relativePath}: некорректное URI-кодирование ссылки ${rawTarget}`);
      continue;
    }
    const resolved = path.resolve(path.dirname(path.join(packageRoot(packageName), relativePath)), decodedTarget);
    if (!isShippedPath(resolved)) {
      errors.push(`${packageName}/${relativePath}: ссылка выходит за пределы поставляемых навыков: ${rawTarget}`);
    } else if (!fs.existsSync(resolved)) {
      errors.push(`${packageName}/${relativePath}: не разрешается ссылка ${rawTarget}`);
    }
  }
}

for (const [packageName, files] of packageFiles) {
  const root = packageRoot(packageName);
  if (!fs.existsSync(root) || !fs.lstatSync(root).isDirectory()) {
    errors.push(`Нет обычного каталога обязательного навыка: ${packageName}`);
    continue;
  }
  shippedFiles.set(packageName, collectFiles(packageName));
  for (const relativePath of files) {
    const fullPath = path.join(packageRoot(packageName), relativePath);
    if (!fs.existsSync(fullPath) || !fs.lstatSync(fullPath).isFile()) {
      errors.push(`Нет обычного обязательного файла: ${packageName}/${relativePath}`);
    }
  }
}

if (errors.length === 0) {
  for (const [packageName, files] of shippedFiles) {
    const frontmatter = parseFrontmatter(packageName);
    if (frontmatter.name !== packageName) {
      errors.push(`${packageName}/SKILL.md: неверное name (${frontmatter.name ?? "нет"})`);
    }
    if (!frontmatter.description) {
      errors.push(`${packageName}/SKILL.md: пустое или нераспознанное description`);
    }

    if (packageName !== "sasha") {
      const changelog = readPackage(packageName, "CHANGELOG.md");
      const latestChangelog = changelog.match(/^##\s+([^\s]+)\s+—/m)?.[1];
      if (!frontmatter.version) {
        errors.push(`${packageName}/SKILL.md: не найдена metadata.version`);
      } else if (latestChangelog && frontmatter.version !== latestChangelog) {
        errors.push(`${packageName}: версия ${frontmatter.version} не совпадает с CHANGELOG ${latestChangelog}`);
      }
    }

    for (const relativePath of files) {
      const extension = path.extname(relativePath).toLowerCase();
      if (!textExtensions.has(extension)) continue;
      const content = readPackage(packageName, relativePath);
      if (absoluteUserPath.test(content)) {
        errors.push(`${packageName}/${relativePath}: найден пользовательский абсолютный путь`);
      }
      if (extension === ".md") {
        if (/\bTODO\b/i.test(content)) errors.push(`${packageName}/${relativePath}: остался TODO`);
        validateLinks(packageName, relativePath);
      }
      if (extension === ".json") {
        try {
          JSON.parse(content);
        } catch (error) {
          errors.push(`${packageName}/${relativePath}: некорректный JSON: ${error.message}`);
        }
      }
    }
  }

  const specSkill = readPackage("figma-spec-builder", "SKILL.md");
  for (const reference of requiredReferences) {
    if (!specSkill.includes(`references/${reference}`)) {
      errors.push(`figma-spec-builder/SKILL.md: reference не включён в routing: ${reference}`);
    }
  }

  const designMachine = readPackage("figma-design-machine", "SKILL.md");
  if (!designMachine.includes("../travel-figma-design-system/SKILL.md")) {
    errors.push("figma-design-machine не подключает travel-figma-design-system");
  }

  const dsReference = readPackage("figma-spec-builder", "references/design-system-and-components.md");
  if (!dsReference.includes("../../travel-figma-design-system/SKILL.md")) {
    errors.push("figma-spec-builder не маршрутизирует DS-аудит через travel-figma-design-system");
  }

  const agentChecks = [
    ["figma-spec-builder", "$figma-spec-builder"],
    ["figma-design-machine", "$figma-design-machine"],
    ["travel-figma-design-system", "$travel-figma-design-system"],
    ["sasha", "$sasha"],
  ];
  for (const [packageName, invocation] of agentChecks) {
    if (!readPackage(packageName, "agents/openai.yaml").includes(invocation)) {
      errors.push(`${packageName}/agents/openai.yaml: default_prompt не упоминает ${invocation}`);
    }
  }

  const sizeLimits = new Map([
    ["figma-spec-builder/SKILL.md", 140],
    ["figma-spec-builder/references/figma-spec-sufficiency.md", 300],
    ...requiredReferences
      .filter((name) => name !== "figma-spec-sufficiency.md")
      .map((name) => [`figma-spec-builder/references/${name}`, 250]),
    ["figma-design-machine/SKILL.md", 150],
    ["travel-figma-design-system/SKILL.md", 160],
  ]);
  for (const [qualifiedPath, limit] of sizeLimits) {
    const [packageName, ...relativeParts] = qualifiedPath.split("/");
    const lines = countLines(readPackage(packageName, relativeParts.join("/")));
    if (lines > limit) errors.push(`${qualifiedPath}: ${lines} строк, лимит ${limit}`);
  }

  const executableFiles = [
    ["figma-spec-builder", "scripts/install.sh"],
    ["figma-spec-builder", "scripts/validate.sh"],
    ["figma-spec-builder", "scripts/validate-package.mjs"],
    ["sasha", "scripts/extract_ui_strings.py"],
    ["sasha", "scripts/ui_text_lint.py"],
  ];
  for (const [packageName, relativePath] of executableFiles) {
    if ((fs.statSync(path.join(packageRoot(packageName), relativePath)).mode & 0o111) === 0) {
      errors.push(`${packageName}/${relativePath}: файл не executable`);
    }
  }

  warnings.push(
    `Размер: figma-spec-builder/SKILL ${countLines(specSkill)} строк, ` +
    `ядро ${countLines(readPackage("figma-spec-builder", "references/figma-spec-sufficiency.md"))} строк`,
  );
}

for (const warning of warnings) console.log(`• ${warning}`);

if (errors.length > 0) {
  console.error("Пакет не прошёл проверку:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const fileCount = [...shippedFiles.values()].reduce((total, files) => total + files.length, 0);
console.log(`✓ Travel Figma skills: структура пакета корректна (${shippedFiles.size} skills, ${fileCount} files)`);
console.log("• Проверены файлы и локальные ссылки. Поведение агента, доступ к Figma и качество спеки не проверялись.");
